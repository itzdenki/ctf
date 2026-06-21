import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../lib/server/http';
import { getSupabaseAdmin } from '../../../../lib/server/supabase';

const ctftimeAuthorizeEndpoint = 'https://oauth.ctftime.org/authorize';
const ctftimeTokenEndpoint = 'https://oauth.ctftime.org/token';
const ctftimeUserEndpoint = 'https://oauth.ctftime.org/user';

function hasEnv(key: string) {
  return Boolean(process.env[key]?.trim());
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const supabase = getSupabaseAdmin();

    const env = [
      { key: 'SUPABASE_URL', configured: hasEnv('SUPABASE_URL'), required: true },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', configured: hasEnv('SUPABASE_SERVICE_ROLE_KEY'), required: true },
      { key: 'APP_URL', configured: hasEnv('APP_URL'), required: true },
      { key: 'CTFTIME_CLIENT_ID', configured: hasEnv('CTFTIME_CLIENT_ID'), required: true },
      { key: 'CTFTIME_CLIENT_SECRET', configured: hasEnv('CTFTIME_CLIENT_SECRET'), required: true },
      { key: 'DISCORD_FIRST_BLOOD_WEBHOOK_URL', configured: hasEnv('DISCORD_FIRST_BLOOD_WEBHOOK_URL'), required: false },
      { key: 'DISCORD_FIRST_BLOOD_WEBHOOK_USERNAME', configured: hasEnv('DISCORD_FIRST_BLOOD_WEBHOOK_USERNAME'), required: false },
      { key: 'DISCORD_ADMIN_ALERT_WEBHOOK_URL', configured: hasEnv('DISCORD_ADMIN_ALERT_WEBHOOK_URL'), required: false },
      { key: 'DISCORD_ADMIN_ALERT_WEBHOOK_USERNAME', configured: hasEnv('DISCORD_ADMIN_ALERT_WEBHOOK_USERNAME'), required: false },
    ];

    const appUrl = process.env.APP_URL?.replace(/\/$/, '') || null;
    const [
      storageResult,
      adminsResult,
      teamsResult,
      challengesResult,
      publishedChallengesResult,
    ] = await Promise.all([
      supabase.storage.getBucket('challenge-files'),
      supabase.from('admins').select('id', { count: 'exact', head: true }),
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      supabase.from('challenges').select('id', { count: 'exact', head: true }),
      supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('is_published', true),
    ]);

    return jsonOk({
      admin,
      env,
      appUrl,
      ctftime: {
        enabled: hasEnv('CTFTIME_CLIENT_ID') && hasEnv('CTFTIME_CLIENT_SECRET'),
        authorizeEndpoint: ctftimeAuthorizeEndpoint,
        tokenEndpoint: ctftimeTokenEndpoint,
        userEndpoint: ctftimeUserEndpoint,
        scopes: 'profile:read team:read',
        callbackUrl: appUrl ? `${appUrl}/api/auth/ctftime/callback` : null,
        scoreboardFeedUrl: appUrl ? `${appUrl}/scoreboard.json` : null,
      },
      storage: {
        challengeFilesBucketExists: Boolean(storageResult.data),
        challengeFilesBucketPrivate: storageResult.data ? storageResult.data.public === false : false,
        error: storageResult.error?.message,
      },
      firstBloodWebhook: {
        enabled: hasEnv('DISCORD_FIRST_BLOOD_WEBHOOK_URL'),
      },
      adminAlertWebhook: {
        enabled: hasEnv('DISCORD_ADMIN_ALERT_WEBHOOK_URL'),
      },
      database: {
        admins: adminsResult.count || 0,
        teams: teamsResult.count || 0,
        challenges: challengesResult.count || 0,
        publishedChallenges: publishedChallengesResult.count || 0,
      },
    });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
