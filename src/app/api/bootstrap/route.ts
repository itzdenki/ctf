import { NextRequest } from 'next/server';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../lib/server/http';
import { loadPublicBootstrap } from '../../../lib/server/data';

export async function GET(request: NextRequest) {
  try {
    return jsonOk(await loadPublicBootstrap(request));
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
