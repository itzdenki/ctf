import { NextRequest } from 'next/server';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../../lib/server/http';
import { getSupabaseAdmin } from '../../../../../lib/server/supabase';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { data: eventConfig, error: eventError } = await supabase
      .from('event_config')
      .select('start_time')
      .eq('id', 'default')
      .single();
    if (eventError) throw new Error(eventError.message);
    if (Date.now() < new Date(eventConfig.start_time).getTime()) {
      return jsonError('Event not started yet.', 403);
    }

    const { data: challenge, error } = await supabase
      .from('challenges')
      .select('attachment_path, attachment_name, is_published')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!challenge?.attachment_path) return jsonError('Attachment not found.', 404);

    const { data, error: signedError } = await supabase.storage
      .from('challenge-files')
      .createSignedUrl(challenge.attachment_path, 60 * 5, {
        download: challenge.attachment_name || true,
      });
    if (signedError) throw new Error(signedError.message);

    return jsonOk({ url: data.signedUrl });
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
