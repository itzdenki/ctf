import { NextRequest } from 'next/server';
import { getCurrentAdmin } from '../../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../../lib/server/http';

export async function GET(request: NextRequest) {
  try {
    return jsonOk({ admin: await getCurrentAdmin(request) });
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
