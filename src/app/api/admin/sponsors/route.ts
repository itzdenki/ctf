import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../lib/server/auth';
import { loadAdminState } from '../../../../lib/server/data';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../lib/server/http';
import { sponsorSchema } from '../../../../lib/server/schemas';
import { getSupabaseAdmin } from '../../../../lib/server/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return jsonOk({ sponsors: (await loadAdminState()).info.sponsors });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const input = sponsorSchema.parse(await request.json());
    const { error } = await getSupabaseAdmin().from('sponsors').upsert({
      id: input.id,
      name: input.name,
      link_url: input.linkUrl,
      description: input.description,
      tier: input.tier,
      sort_order: input.sortOrder,
    });
    if (error) throw new Error(error.message);
    return jsonOk({ success: true });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
