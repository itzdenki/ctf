import { NextRequest, NextResponse } from 'next/server';
import { clearTeamCookie, deleteCurrentTeamSession } from '../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError } from '../../../../lib/server/http';

export async function POST(request: NextRequest) {
  try {
    await deleteCurrentTeamSession(request);
    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    clearTeamCookie(response);
    return response;
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
