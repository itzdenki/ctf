import { NextRequest } from 'next/server';
import { getCurrentTeamRow } from '../../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../../lib/server/http';
import { getSupabaseAdmin } from '../../../../../lib/server/supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const team = await getCurrentTeamRow(request);
    if (!team) return jsonError('Please login before downloading challenge files.', 401);
    if (team.status !== 'active') return jsonError('This team account cannot download challenge files.', 403);

    const attachmentId = request.nextUrl.searchParams.get('attachmentId');
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

    let storagePath = challenge?.attachment_path;
    let fileName = challenge?.attachment_name || true;

    if (attachmentId && attachmentId !== 'legacy') {
      const { data: attachment, error: attachmentError } = await supabase
        .from('challenge_attachments')
        .select('storage_path, file_name')
        .eq('id', attachmentId)
        .eq('challenge_id', id)
        .maybeSingle();
      if (attachmentError) throw new Error(attachmentError.message);
      if (!attachment) return jsonError('Attachment not found.', 404);
      storagePath = attachment.storage_path;
      fileName = attachment.file_name || true;
    }

    if (!storagePath) return jsonError('Attachment not found.', 404);

    const { data, error: signedError } = await supabase.storage
      .from('challenge-files')
      .createSignedUrl(storagePath, 60 * 5, {
        download: fileName,
      });
    if (signedError) throw new Error(signedError.message);

    return jsonOk({ url: data.signedUrl });
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
