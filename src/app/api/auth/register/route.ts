import { NextRequest, NextResponse } from 'next/server';
import { createTeamSession, setTeamCookie } from '../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError } from '../../../../lib/server/http';
import { teamRegisterSchema } from '../../../../lib/server/schemas';
import { hashPassword } from '../../../../lib/server/security';
import { getSupabaseAdmin } from '../../../../lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const input = teamRegisterSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();

    const { data: existingByName, error: nameError } = await supabase
      .from('teams')
      .select('id')
      .ilike('name', input.teamName)
      .maybeSingle();
    if (nameError) throw new Error(nameError.message);
    if (existingByName) return jsonError('Team name is already registered.', 409);

    const { data: existingByEmail, error: emailError } = await supabase
      .from('teams')
      .select('id')
      .ilike('email', input.email)
      .maybeSingle();
    if (emailError) throw new Error(emailError.message);
    if (existingByEmail) return jsonError('Email is already registered.', 409);

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name: input.teamName,
        email: input.email,
        password_hash: await hashPassword(input.password),
        status: 'active',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    const token = await createTeamSession(team.id, request);
    const response = NextResponse.json({ success: true, message: 'Team registered successfully.' });
    setTeamCookie(response, token);
    return response;
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
