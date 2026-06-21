import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../../lib/server/http';
import { teamUpdateSchema } from '../../../../../lib/server/schemas';
import { getSupabaseAdmin } from '../../../../../lib/server/supabase';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const input = teamUpdateSchema.parse(await request.json());
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ('name' in input) update.name = input.name;
    if ('email' in input) update.email = input.email;
    if ('status' in input) update.status = input.status;
    if ('isAdmin' in input) update.is_admin = input.isAdmin;

    const { error } = await getSupabaseAdmin().from('teams').update(update).eq('id', id);
    if (error) throw new Error(error.message);
    return jsonOk({ success: true });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const { error } = await getSupabaseAdmin().from('teams').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return jsonOk({ success: true });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
