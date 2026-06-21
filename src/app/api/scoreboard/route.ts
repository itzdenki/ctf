import { NextRequest } from 'next/server';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../lib/server/http';
import { loadPublicBootstrap } from '../../../lib/server/data';

export async function GET(request: NextRequest) {
  try {
    const { teams, challengePoints, bloodWinners } = await loadPublicBootstrap(request);
    return jsonOk({ teams, challengePoints, bloodWinners });
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
