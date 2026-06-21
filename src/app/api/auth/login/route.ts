import { NextRequest, NextResponse } from 'next/server';
import { createTeamSession, setTeamCookie } from '../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError } from '../../../../lib/server/http';
import { teamLoginSchema } from '../../../../lib/server/schemas';
import { verifyPassword } from '../../../../lib/server/security';
import { getSupabaseAdmin } from '../../../../lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const input = teamLoginSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();

    const { data: byName, error: nameError } = await supabase
      .from('teams')
      .select('*')
      .ilike('name', input.teamName)
      .maybeSingle();
    if (nameError) throw new Error(nameError.message);

    const { data: byEmail, error: emailError } = byName
      ? { data: null, error: null }
      : await supabase.from('teams').select('*').ilike('email', input.teamName).maybeSingle();
    if (emailError) throw new Error(emailError.message);

    const team = byName || byEmail;
    if (!team || !team.password_hash) {
      return jsonError('Invalid team credentials.', 401);
    }
    if (team.status !== 'active') {
      return jsonError('This team account is not active.', 403);
    }
    if (!(await verifyPassword(input.password, team.password_hash))) {
      return jsonError('Invalid team credentials.', 401);
    }

    const token = await createTeamSession(team.id, request);
    const response = NextResponse.json({ success: true, message: 'Logged in successfully.' });
    setTeamCookie(response, token);
    return response;
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
