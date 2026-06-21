import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../../../lib/server/http';
import { getSupabaseAdmin } from '../../../../../../lib/server/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const { error } = await getSupabaseAdmin().from('solves').delete().eq('team_id', id);
    if (error) throw new Error(error.message);
    return jsonOk({ success: true });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
