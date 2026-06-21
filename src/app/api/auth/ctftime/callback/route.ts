import { NextRequest, NextResponse } from 'next/server';
import { createCtftimePendingSession, CtftimeMode, exchangeCodeForProfile, getCtftimeTeam } from '../../../../../lib/server/ctftime';
import { getMessageFromError, jsonError } from '../../../../../lib/server/http';
import { CTFTIME_MODE_COOKIE, CTFTIME_STATE_COOKIE, cookieOptions } from '../../../../../lib/server/security';

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const homeUrl = new URL('/', appUrl);

  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const expectedState = request.cookies.get(CTFTIME_STATE_COOKIE)?.value;
    const modeCookie = request.cookies.get(CTFTIME_MODE_COOKIE)?.value;
    const mode: CtftimeMode = modeCookie === 'register' ? 'register' : 'login';

    if (!code || !state || !expectedState || state !== expectedState) {
      return jsonError('Invalid CTFtime OAuth state.', 400);
    }

    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/ctftime/callback`;
    const ctftimeTeam = getCtftimeTeam(await exchangeCodeForProfile(code, redirectUri));

    homeUrl.searchParams.set('ctftime', mode);
    const response = NextResponse.redirect(homeUrl);
    response.cookies.set(CTFTIME_STATE_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
    response.cookies.set(CTFTIME_MODE_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
    await createCtftimePendingSession(response, mode, ctftimeTeam);
    return response;
  } catch (error) {
    homeUrl.searchParams.set('authError', getMessageFromError(error));
    const response = NextResponse.redirect(homeUrl);
    response.cookies.set(CTFTIME_STATE_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
    response.cookies.set(CTFTIME_MODE_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
    return response;
  }
}
