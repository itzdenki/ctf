import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../../../lib/server/http';
import { getSupabaseAdmin } from '../../../../../../lib/server/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const formData = await request.formData();
    const files = [...formData.getAll('files'), ...formData.getAll('file')].filter((file): file is File => file instanceof File);
    if (files.length === 0) return jsonError('Missing file upload.', 400);

    const supabase = getSupabaseAdmin();
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (challengeError) throw new Error(challengeError.message);
    if (!challenge) {
      return jsonError('Save the challenge before uploading files.', 404);
    }

    const uploadedAttachments = [];

    for (const file of files) {
      const storagePath = `${id}/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
      const { error: uploadError } = await supabase.storage.from('challenge-files').upload(storagePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);

      uploadedAttachments.push({
        challenge_id: id,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type || null,
      });
    }

    const { error } = await supabase
      .from('challenge_attachments')
      .insert(uploadedAttachments);
    if (error) {
      await supabase.storage.from('challenge-files').remove(uploadedAttachments.map((attachment) => attachment.storage_path));
      throw new Error(error.message);
    }

    await supabase.from('challenges').update({ updated_at: new Date().toISOString() }).eq('id', id);

    return jsonOk({ success: true, uploaded: uploadedAttachments.length });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const attachmentId = request.nextUrl.searchParams.get('attachmentId');
    const supabase = getSupabaseAdmin();

    if (attachmentId) {
      const { data: attachment, error: getAttachmentError } = await supabase
        .from('challenge_attachments')
        .select('storage_path')
        .eq('id', attachmentId)
        .eq('challenge_id', id)
        .maybeSingle();
      if (getAttachmentError) throw new Error(getAttachmentError.message);
      if (!attachment) return jsonError('Attachment not found.', 404);

      await supabase.storage.from('challenge-files').remove([attachment.storage_path]);
      const { error } = await supabase.from('challenge_attachments').delete().eq('id', attachmentId).eq('challenge_id', id);
      if (error) throw new Error(error.message);
      await supabase.from('challenges').update({ updated_at: new Date().toISOString() }).eq('id', id);
      return jsonOk({ success: true });
    }

    const { data: challenge, error: getError } = await supabase
      .from('challenges')
      .select('attachment_path')
      .eq('id', id)
      .maybeSingle();
    if (getError) throw new Error(getError.message);

    const { data: attachments, error: attachmentsError } = await supabase
      .from('challenge_attachments')
      .select('storage_path')
      .eq('challenge_id', id);
    if (attachmentsError) throw new Error(attachmentsError.message);

    const paths = (attachments || []).map((attachment) => attachment.storage_path);

    if (challenge?.attachment_path) {
      paths.push(challenge.attachment_path);
    }

    if (paths.length > 0) {
      await supabase.storage.from('challenge-files').remove(Array.from(new Set(paths)));
    }

    await supabase.from('challenge_attachments').delete().eq('challenge_id', id);

    const { error } = await supabase
      .from('challenges')
      .update({
        attachment_path: null,
        attachment_name: null,
        attachment_size: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);

    return jsonOk({ success: true });
  } catch (error) {
    const message = getMessageFromError(error);
    return jsonError(message, message.includes('Unauthorized') ? 401 : getStatusFromError(error));
  }
}
