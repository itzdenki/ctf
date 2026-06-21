import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError, jsonOk } from '../../../../../../lib/server/http';
import { getSupabaseAdmin } from '../../../../../../lib/server/supabase';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return jsonError('Missing file upload.', 400);

    const supabase = getSupabaseAdmin();
    const storagePath = `${id}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
    const { error: uploadError } = await supabase.storage.from('challenge-files').upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);

    const { error } = await supabase
      .from('challenges')
      .update({
        attachment_path: storagePath,
        attachment_name: file.name,
        attachment_size: `${Math.ceil(file.size / 1024)} KB`,
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { data: challenge, error: getError } = await supabase
      .from('challenges')
      .select('attachment_path')
      .eq('id', id)
      .maybeSingle();
    if (getError) throw new Error(getError.message);

    if (challenge?.attachment_path) {
      await supabase.storage.from('challenge-files').remove([challenge.attachment_path]);
    }

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
