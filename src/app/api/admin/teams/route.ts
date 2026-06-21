import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../lib/server/auth';
import { loadAdminState } from '../../../../lib/server/data';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../lib/server/http';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return jsonOk({ teams: (await loadAdminState()).teams });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
