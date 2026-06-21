import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../lib/server/auth';
import { loadAdminState } from '../../../../lib/server/data';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../lib/server/http';
import { prizeSchema } from '../../../../lib/server/schemas';
import { getSupabaseAdmin } from '../../../../lib/server/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return jsonOk({ prizes: (await loadAdminState()).info.prizes });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const input = prizeSchema.parse(await request.json());
    const { error } = await getSupabaseAdmin().from('prizes').upsert({
      id: input.id,
      place: input.place,
      reward: input.reward,
      icon: input.icon,
      sort_order: input.sortOrder,
    });
    if (error) throw new Error(error.message);
    return jsonOk({ success: true });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
