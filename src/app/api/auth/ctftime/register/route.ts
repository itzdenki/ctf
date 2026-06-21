import { NextRequest, NextResponse } from 'next/server';
import { createTeamSession, setTeamCookie } from '../../../../../lib/server/auth';
import { clearCtftimePendingCookie, deleteCtftimePendingSession, getCtftimePendingSession } from '../../../../../lib/server/ctftime';
import { getMessageFromError, getStatusFromError, jsonError } from '../../../../../lib/server/http';
import { ctftimeRegisterCompleteSchema } from '../../../../../lib/server/schemas';
import { hashPassword } from '../../../../../lib/server/security';
import { getSupabaseAdmin } from '../../../../../lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const pending = await getCtftimePendingSession(request);
    if (!pending || pending.mode !== 'register') {
      return jsonError('No pending CTFtime registration session.', 400);
    }

    const input = ctftimeRegisterCompleteSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();

    const { data: existingByCtftime, error: existingError } = await supabase
      .from('teams')
      .select('id')
      .eq('ctftime_team_id', pending.ctftime_team_id)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existingByCtftime) {
      return jsonError('This CTFtime team is already registered. Use CTFtime login instead.', 409);
    }

    const { data: existingByEmail, error: emailError } = await supabase
      .from('teams')
      .select('id')
      .ilike('email', input.email)
      .maybeSingle();
    if (emailError) throw new Error(emailError.message);
    if (existingByEmail) return jsonError('Email is already registered.', 409);

    let name = pending.ctftime_team_name;
    const { data: existingByName, error: nameError } = await supabase
      .from('teams')
      .select('id')
      .ilike('name', name)
      .maybeSingle();
    if (nameError) throw new Error(nameError.message);
    if (existingByName) {
      name = `${name}_${pending.ctftime_team_id}`;
    }

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name,
        email: input.email,
        password_hash: await hashPassword(input.password),
        ctftime_team_id: pending.ctftime_team_id,
        ctftime_profile: pending.ctftime_profile,
        status: 'active',
      })
      .select('id, name')
      .single();
    if (error) throw new Error(error.message);

    await deleteCtftimePendingSession(request);
    const token = await createTeamSession(team.id, request);
    const response = NextResponse.json({ success: true, message: 'CTFtime team registered successfully.', teamName: team.name });
    clearCtftimePendingCookie(response);
    setTeamCookie(response, token);
    return response;
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
