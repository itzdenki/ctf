import { NextRequest, NextResponse } from 'next/server';
import { clearAdminCookie, deleteCurrentAdminSession } from '../../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError } from '../../../../../lib/server/http';

export async function POST(request: NextRequest) {
  try {
    await deleteCurrentAdminSession(request);
    const response = NextResponse.json({ success: true });
    clearAdminCookie(response);
    return response;
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
