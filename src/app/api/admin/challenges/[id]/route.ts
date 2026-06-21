import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../../lib/server/http';
import { challengeUpdateSchema } from '../../../../../lib/server/schemas';
import { hashFlag } from '../../../../../lib/server/security';
import { getSupabaseAdmin } from '../../../../../lib/server/supabase';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const input = challengeUpdateSchema.parse({ ...(await request.json()), id });
    const update: Record<string, unknown> = {
      name: input.name,
      description: input.description,
      category: input.category,
      points: input.points,
      connection_link: input.connectionLink || null,
      hints: input.hints,
      is_published: input.isPublished,
      updated_at: new Date().toISOString(),
    };

    if (input.flag?.trim()) {
      update.flag_hash = hashFlag(input.flag);
    }

    const { error } = await getSupabaseAdmin()
      .from('challenges')
      .update(update)
      .eq('id', id);
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
    const { error } = await getSupabaseAdmin().from('challenges').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return jsonOk({ success: true });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
