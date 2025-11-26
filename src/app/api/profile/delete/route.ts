export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  const cookieStore = await cookies();
  const hdrs = await headers();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any)),
      },
      headers: hdrs,
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'missing_service_key' }, { status: 500 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Best-effort: delete avatar folder first
  try {
    const { data: files } = await admin.storage.from('avatars').list(user.id, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
    const paths = (files || []).map((f: any) => `${user.id}/${f.name}`);
    if (paths.length > 0) await admin.storage.from('avatars').remove(paths);
  } catch (_) {}

  // Cascade FKs in DB handle rows; delete auth user
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  // Clear session cookie
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}

