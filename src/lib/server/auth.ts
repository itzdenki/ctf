import { NextRequest, NextResponse } from 'next/server';
import { Team } from '../../types';
import { sendMultiAccountIpWebhook } from './discord';
import { getSupabaseAdmin } from './supabase';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  TEAM_SESSION_COOKIE,
  TEAM_SESSION_MAX_AGE_SECONDS,
  cookieOptions,
  createOpaqueToken,
  futureIso,
  hashToken,
} from './security';

export interface AdminIdentity {
  id: string;
  username: string;
  role: string;
}

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    forwardedFor ||
    request.headers.get('x-client-ip')?.trim() ||
    null
  );
}

async function alertIfSharedLoginIp(teamId: string, ipAddress: string, userAgent: string | null) {
  const supabase = getSupabaseAdmin();
  const { data: currentTeam, error: currentTeamError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .maybeSingle();
  if (currentTeamError) throw new Error(currentTeamError.message);
  if (!currentTeam) return;

  const { data: sessions, error } = await supabase
    .from('team_sessions')
    .select('team_id, teams(name)')
    .eq('ip_address', ipAddress)
    .neq('team_id', teamId)
    .gt('expires_at', new Date().toISOString())
    .limit(10);
  if (error) throw new Error(error.message);

  const otherTeamNames = Array.from(new Set((sessions || [])
    .map((session: any) => session.teams?.name)
    .filter(Boolean)));

  if (otherTeamNames.length === 0) return;

  await sendMultiAccountIpWebhook({
    ipAddress,
    teamName: currentTeam.name,
    otherTeamNames,
    userAgent,
  });
}

export async function createTeamSession(teamId: string, request?: NextRequest) {
  const supabase = getSupabaseAdmin();
  const token = createOpaqueToken();
  const ipAddress = request ? getClientIp(request) : null;
  const userAgent = request?.headers.get('user-agent') || null;
  const { error } = await supabase.from('team_sessions').insert({
    team_id: teamId,
    token_hash: hashToken(token),
    expires_at: futureIso(TEAM_SESSION_MAX_AGE_SECONDS),
    ip_address: ipAddress,
    user_agent: userAgent,
  });
  if (error) throw new Error(error.message);

  if (ipAddress) {
    alertIfSharedLoginIp(teamId, ipAddress, userAgent).catch((error) => {
      console.error(error);
    });
  }

  return token;
}

export async function createAdminSession(adminId: string) {
  const supabase = getSupabaseAdmin();
  const token = createOpaqueToken();
  const { error } = await supabase.from('admin_sessions').insert({
    admin_id: adminId,
    token_hash: hashToken(token),
    expires_at: futureIso(ADMIN_SESSION_MAX_AGE_SECONDS),
  });
  if (error) throw new Error(error.message);
  return token;
}

export function setTeamCookie(response: NextResponse, token: string) {
  response.cookies.set(TEAM_SESSION_COOKIE, token, cookieOptions(TEAM_SESSION_MAX_AGE_SECONDS));
}

export function setAdminCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, cookieOptions(ADMIN_SESSION_MAX_AGE_SECONDS));
}

export function clearTeamCookie(response: NextResponse) {
  response.cookies.set(TEAM_SESSION_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
}

export async function deleteCurrentTeamSession(request: NextRequest) {
  const token = request.cookies.get(TEAM_SESSION_COOKIE)?.value;
  if (!token) return;
  await getSupabaseAdmin().from('team_sessions').delete().eq('token_hash', hashToken(token));
}

export async function deleteCurrentAdminSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return;
  await getSupabaseAdmin().from('admin_sessions').delete().eq('token_hash', hashToken(token));
}

export async function getCurrentTeamRow(request: NextRequest) {
  const token = request.cookies.get(TEAM_SESSION_COOKIE)?.value;
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data: session, error } = await supabase
    .from('team_sessions')
    .select('team_id, expires_at')
    .eq('token_hash', hashToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !session) return null;

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', session.team_id)
    .maybeSingle();

  if (teamError || !team) return null;
  return team;
}

export async function getCurrentAdmin(request: NextRequest): Promise<AdminIdentity | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data: session, error } = await supabase
    .from('admin_sessions')
    .select('admin_id, expires_at')
    .eq('token_hash', hashToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !session) return null;

  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('id, username, role')
    .eq('id', session.admin_id)
    .maybeSingle();

  if (adminError || !admin) return null;

  if (admin.role === 'team_admin') {
    if (!admin.username.startsWith('team:')) return null;
    const teamId = admin.username.slice('team:'.length);
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, status, is_admin')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError || !team || team.status !== 'active' || !team.is_admin) return null;
    return {
      id: admin.id,
      username: team.name,
      role: 'team_admin',
    };
  }

  return admin;
}

export async function requireAdmin(request: NextRequest) {
  const admin = await getCurrentAdmin(request);
  if (!admin) {
    throw new Error('Unauthorized admin request');
  }
  return admin;
}

export function publicTeamShape(team: Team | null) {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    email: team.email,
    score: team.score,
    solvedChallengeIds: team.solvedChallengeIds,
    lastSolveTime: team.lastSolveTime,
    solveTimestamps: team.solveTimestamps,
    status: team.status,
    isAdmin: team.isAdmin,
    ctftimeTeamId: team.ctftimeTeamId,
    createdAt: team.createdAt,
  };
}
