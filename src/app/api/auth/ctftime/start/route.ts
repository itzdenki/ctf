import { NextRequest, NextResponse } from 'next/server';
import { getMessageFromError, jsonError } from '../../../../../lib/server/http';
import { CTFTIME_MODE_COOKIE, CTFTIME_STATE_COOKIE, CTFTIME_STATE_MAX_AGE_SECONDS, cookieOptions, createOpaqueToken } from '../../../../../lib/server/security';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.CTFTIME_CLIENT_ID;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    if (!clientId) {
      return jsonError('CTFtime OAuth is not configured.', 503);
    }

    const state = createOpaqueToken();
    const requestedMode = request.nextUrl.searchParams.get('mode');
    const mode = requestedMode === 'register' ? 'register' : 'login';
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/ctftime/callback`;
    const url = new URL('https://oauth.ctftime.org/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'profile team');
    url.searchParams.set('state', state);

    const response = NextResponse.redirect(url);
    response.cookies.set(CTFTIME_STATE_COOKIE, state, cookieOptions(CTFTIME_STATE_MAX_AGE_SECONDS));
    response.cookies.set(CTFTIME_MODE_COOKIE, mode, cookieOptions(CTFTIME_STATE_MAX_AGE_SECONDS));
    return response;
  } catch (error) {
    return jsonError(getMessageFromError(error), 500);
  }
}
