import { NextRequest, NextResponse } from 'next/server';
import { createTeamSession, setTeamCookie } from '../../../../../lib/server/auth';
import { clearCtftimePendingCookie, deleteCtftimePendingSession, getCtftimePendingSession } from '../../../../../lib/server/ctftime';
import { getMessageFromError, getStatusFromError, jsonError } from '../../../../../lib/server/http';
import { ctftimeLoginCompleteSchema } from '../../../../../lib/server/schemas';
import { verifyPassword } from '../../../../../lib/server/security';
import { getSupabaseAdmin } from '../../../../../lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const pending = await getCtftimePendingSession(request);
    if (!pending || pending.mode !== 'login') {
      return jsonError('No pending CTFtime login session.', 400);
    }

    const input = ctftimeLoginCompleteSchema.parse(await request.json());
    const { data: team, error } = await getSupabaseAdmin()
      .from('teams')
      .select('*')
      .eq('ctftime_team_id', pending.ctftime_team_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!team || !team.password_hash) {
      return jsonError('No local team is linked to this CTFtime account. Register with CTFtime first.', 404);
    }
    if (team.status !== 'active') {
      return jsonError('This team account is not active.', 403);
    }
    if (!(await verifyPassword(input.password, team.password_hash))) {
      return jsonError('Invalid team password.', 401);
    }

    await deleteCtftimePendingSession(request);
    const token = await createTeamSession(team.id, request);
    const response = NextResponse.json({ success: true, message: 'Logged in with CTFtime successfully.', teamName: team.name });
    clearCtftimePendingCookie(response);
    setTeamCookie(response, token);
    return response;
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
