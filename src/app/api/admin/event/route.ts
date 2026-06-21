import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../lib/server/auth';
import { loadAdminState } from '../../../../lib/server/data';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../lib/server/http';
import { eventConfigSchema } from '../../../../lib/server/schemas';
import { getSupabaseAdmin } from '../../../../lib/server/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return jsonOk((await loadAdminState()).info);
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const input = eventConfigSchema.parse(await request.json());
    const { error } = await getSupabaseAdmin()
      .from('event_config')
      .upsert({
        id: 'default',
        name: input.name,
        description: input.description,
        start_time: input.startTime,
        end_time: input.endTime,
        discord_url: input.discordUrl,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return jsonOk({ success: true });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
