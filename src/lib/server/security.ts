import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

export const TEAM_SESSION_COOKIE = 'ctf_team_session';
export const ADMIN_SESSION_COOKIE = 'ctf_admin_session';
export const CTFTIME_STATE_COOKIE = 'ctf_ctftime_state';
export const CTFTIME_MODE_COOKIE = 'ctf_ctftime_mode';
export const CTFTIME_PENDING_COOKIE = 'ctf_ctftime_pending';

export const TEAM_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
export const CTFTIME_STATE_MAX_AGE_SECONDS = 60 * 10;
export const CTFTIME_PENDING_MAX_AGE_SECONDS = 60 * 15;

export function createOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function hashFlag(flag: string) {
  return createHash('sha256').update(flag.trim(), 'utf8').digest('hex');
}

export function verifyFlag(flag: string, expectedHash: string) {
  const actual = Buffer.from(hashFlag(flag), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function futureIso(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}
