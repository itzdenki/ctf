import { NextRequest } from 'next/server';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../lib/server/http';
import { loadPublicBootstrap } from '../../../../lib/server/data';

export async function GET(request: NextRequest) {
  try {
    const { currentUser } = await loadPublicBootstrap(request);
    return jsonOk({ currentUser });
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
