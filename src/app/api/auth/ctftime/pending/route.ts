import { NextRequest } from 'next/server';
import { getCtftimePendingSession } from '../../../../../lib/server/ctftime';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../../lib/server/http';

export async function GET(request: NextRequest) {
  try {
    const pending = await getCtftimePendingSession(request);
    return jsonOk({
      pending: pending
        ? {
            mode: pending.mode,
            teamName: pending.ctftime_team_name,
            ctftimeTeamId: pending.ctftime_team_id,
            expiresAt: pending.expires_at,
          }
        : null,
    });
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
