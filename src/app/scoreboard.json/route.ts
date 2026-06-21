import { NextRequest } from 'next/server';
import { loadPublicBootstrap } from '../../lib/server/data';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../lib/server/http';
import { buildScoreboardFeed } from '../../lib/server/scoreboard-feed';

export async function GET(request: NextRequest) {
  try {
    const bootstrap = await loadPublicBootstrap(request);
    return jsonOk(buildScoreboardFeed(bootstrap), {
      headers: {
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
