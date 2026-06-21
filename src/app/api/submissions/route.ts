import { NextRequest } from 'next/server';
import { getCurrentTeamRow } from '../../../lib/server/auth';
import { sendFirstBloodWebhook } from '../../../lib/server/discord';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../lib/server/http';
import { submitFlagSchema } from '../../../lib/server/schemas';
import { verifyFlag } from '../../../lib/server/security';
import { getSupabaseAdmin } from '../../../lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const team = await getCurrentTeamRow(request);
    if (!team) return jsonError('Please login before submitting flags.', 401);
    if (team.status !== 'active') return jsonError('This team account cannot submit flags.', 403);

    const input = submitFlagSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();

    const { data: eventConfig, error: eventError } = await supabase
      .from('event_config')
      .select('start_time, end_time')
      .eq('id', 'default')
      .single();
    if (eventError) throw new Error(eventError.message);

    const now = Date.now();
    if (now < new Date(eventConfig.start_time).getTime() || now > new Date(eventConfig.end_time).getTime()) {
      return jsonError('Flag submissions are only open during the configured CTF time window.', 403);
    }

    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', input.challengeId)
      .eq('is_published', true)
      .maybeSingle();
    if (challengeError) throw new Error(challengeError.message);
    if (!challenge) return jsonError('Challenge not found.', 404);
    if (!challenge.flag_hash) return jsonError('Challenge flag hash is not configured.', 500);

    const isCorrect = verifyFlag(input.flag, challenge.flag_hash);
    await supabase.from('submission_attempts').insert({
      team_id: team.id,
      challenge_id: challenge.id,
      is_correct: isCorrect,
    });

    if (!isCorrect) {
      return jsonOk({ success: false, message: 'Incorrect flag. Try again.' }, { status: 200 });
    }

    const { data: newSolve, error: solveError } = await supabase
      .from('solves')
      .insert({
        team_id: team.id,
        challenge_id: challenge.id,
      })
      .select('id, team_id, challenge_id, solved_at')
      .single();

    if (solveError && !solveError.message.toLowerCase().includes('duplicate')) {
      throw new Error(solveError.message);
    }

    if (newSolve) {
      const { data: firstSolve, error: firstSolveError } = await supabase
        .from('solves')
        .select('id')
        .eq('challenge_id', challenge.id)
        .order('solved_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstSolveError) {
        throw new Error(firstSolveError.message);
      }

      if (firstSolve?.id === newSolve.id) {
        sendFirstBloodWebhook({
          teamName: team.name,
          challengeId: challenge.id,
          challengeName: challenge.name,
        }).catch((error) => {
          console.error(error);
        });
      }
    }

    return jsonOk({
      success: true,
      message: solveError ? 'Challenge was already solved by your team.' : `Correct flag for ${challenge.name}.`,
    });
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
