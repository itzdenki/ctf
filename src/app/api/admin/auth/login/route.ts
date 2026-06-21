import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, setAdminCookie } from '../../../../../lib/server/auth';
import { getMessageFromError, getStatusFromError, jsonError } from '../../../../../lib/server/http';
import { adminLoginSchema } from '../../../../../lib/server/schemas';
import { createOpaqueToken, hashPassword, verifyPassword } from '../../../../../lib/server/security';
import { getSupabaseAdmin } from '../../../../../lib/server/supabase';

async function ensureInitialAdmin(username: string, password: string) {
  const bootstrapUsername = process.env.INITIAL_ADMIN_USERNAME;
  const bootstrapPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!bootstrapUsername || !bootstrapPassword) return;
  if (username !== bootstrapUsername || password !== bootstrapPassword) return;

  const supabase = getSupabaseAdmin();
  const { count, error: countError } = await supabase.from('admins').select('id', { count: 'exact', head: true });
  if (countError) throw new Error(countError.message);
  if ((count || 0) > 0) return;

  const { error } = await supabase.from('admins').insert({
    username,
    password_hash: await hashPassword(password),
    role: 'owner',
  });
  if (error) throw new Error(error.message);
}

async function ensureTeamAdmin(team: { id: string; name: string }) {
  const supabase = getSupabaseAdmin();
  const username = `team:${team.id}`;
  const { data: existing, error: existingError } = await supabase
    .from('admins')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from('admins')
    .insert({
      username,
      password_hash: await hashPassword(createOpaqueToken()),
      role: 'team_admin',
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

export async function POST(request: NextRequest) {
  try {
    const input = adminLoginSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();

    if (input.mode === 'team') {
      const { data: byName, error: nameError } = await supabase
        .from('teams')
        .select('*')
        .ilike('name', input.username)
        .maybeSingle();
      if (nameError) throw new Error(nameError.message);

      const { data: byEmail, error: emailError } = byName
        ? { data: null, error: null }
        : await supabase.from('teams').select('*').ilike('email', input.username).maybeSingle();
      if (emailError) throw new Error(emailError.message);

      const team = byName || byEmail;
      if (!team || !team.password_hash || !(await verifyPassword(input.password, team.password_hash))) {
        return jsonError('Invalid team credentials.', 401);
      }
      if (team.status !== 'active') {
        return jsonError('This team account is not active.', 403);
      }
      if (!team.is_admin) {
        return jsonError('This team does not have admin access.', 403);
      }

      const adminId = await ensureTeamAdmin({ id: team.id, name: team.name });
      const token = await createAdminSession(adminId);
      const response = NextResponse.json({ success: true, admin: { id: adminId, username: team.name, role: 'team_admin' } });
      setAdminCookie(response, token);
      return response;
    }

    await ensureInitialAdmin(input.username, input.password);

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', input.username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!admin || !(await verifyPassword(input.password, admin.password_hash))) {
      return jsonError('Invalid admin credentials.', 401);
    }

    await supabase.from('admins').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id);
    const token = await createAdminSession(admin.id);
    const response = NextResponse.json({ success: true, admin: { id: admin.id, username: admin.username, role: admin.role } });
    setAdminCookie(response, token);
    return response;
  } catch (error) {
    return jsonError(getMessageFromError(error), getStatusFromError(error));
  }
}
