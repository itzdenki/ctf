import { NextRequest, NextResponse } from 'next/server';
import {
  CTFTIME_PENDING_COOKIE,
  CTFTIME_PENDING_MAX_AGE_SECONDS,
  cookieOptions,
  createOpaqueToken,
  futureIso,
  hashToken,
} from './security';
import { getSupabaseAdmin } from './supabase';

export type CtftimeMode = 'register' | 'login';

export interface CtftimeTeamProfile {
  id: string;
  name: string;
  profile: unknown;
}

export function getCtftimeTeam(payload: any): CtftimeTeamProfile {
  const team = payload?.team || payload?.teams?.[0] || payload?.profile?.team || payload;
  const profile = payload?.profile || payload;
  const id = team?.id ?? team?.team_id ?? profile?.team_id ?? profile?.id;
  const name = team?.name ?? team?.team_name ?? profile?.team_name ?? profile?.username ?? profile?.name;

  if (!id) {
    throw new Error('CTFtime response did not include a team id.');
  }

  return {
    id: String(id),
    name: String(name || `CTFtime_${id}`),
    profile: payload,
  };
}

export async function exchangeCodeForProfile(code: string, redirectUri: string) {
  const clientId = process.env.CTFTIME_CLIENT_ID;
  const clientSecret = process.env.CTFTIME_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('CTFtime OAuth is not configured.');
  }

  const tokenResponse = await fetch('https://oauth.ctftime.org/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Unable to exchange CTFtime OAuth code.');
  }

  const tokenPayload = await tokenResponse.json();
  const userResponse = await fetch('https://oauth.ctftime.org/user', {
    headers: {
      authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Unable to fetch CTFtime profile.');
  }

  return userResponse.json();
}

export async function createCtftimePendingSession(response: NextResponse, mode: CtftimeMode, team: CtftimeTeamProfile) {
  const token = createOpaqueToken();
  const { error } = await getSupabaseAdmin().from('ctftime_pending_sessions').insert({
    token_hash: hashToken(token),
    mode,
    ctftime_team_id: team.id,
    ctftime_team_name: team.name,
    ctftime_profile: team.profile,
    expires_at: futureIso(CTFTIME_PENDING_MAX_AGE_SECONDS),
  });
  if (error) throw new Error(error.message);

  response.cookies.set(CTFTIME_PENDING_COOKIE, token, cookieOptions(CTFTIME_PENDING_MAX_AGE_SECONDS));
}

export async function getCtftimePendingSession(request: NextRequest) {
  const token = request.cookies.get(CTFTIME_PENDING_COOKIE)?.value;
  if (!token) return null;

  const { data, error } = await getSupabaseAdmin()
    .from('ctftime_pending_sessions')
    .select('*')
    .eq('token_hash', hashToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCtftimePendingSession(request: NextRequest) {
  const token = request.cookies.get(CTFTIME_PENDING_COOKIE)?.value;
  if (!token) return;
  await getSupabaseAdmin().from('ctftime_pending_sessions').delete().eq('token_hash', hashToken(token));
}

export function clearCtftimePendingCookie(response: NextResponse) {
  response.cookies.set(CTFTIME_PENDING_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
}
