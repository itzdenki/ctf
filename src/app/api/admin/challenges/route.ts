import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../lib/server/auth';
import { loadAdminState } from '../../../../lib/server/data';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../lib/server/http';
import { challengeCreateSchema } from '../../../../lib/server/schemas';
import { hashFlag } from '../../../../lib/server/security';
import { getSupabaseAdmin } from '../../../../lib/server/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return jsonOk({ challenges: (await loadAdminState()).challenges });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const input = challengeCreateSchema.parse(await request.json());
    const { error } = await getSupabaseAdmin().from('challenges').insert({
      id: input.id,
      name: input.name,
      description: input.description,
      category: input.category,
      points: input.points,
      flag_hash: hashFlag(input.flag),
      connection_link: input.connectionLink || null,
      hints: input.hints,
      is_published: input.isPublished,
    });
    if (error) throw new Error(error.message);
    return jsonOk({ success: true });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
