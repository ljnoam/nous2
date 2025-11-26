'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function UserAvatar({ size=28 }: { size?: number }) {
  const [initial, setInitial] = useState<string>('?');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email || '';
      const letter = email?.[0]?.toUpperCase() || 'U';
      setInitial(letter);
    })();
  }, []);

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-black/10 dark:bg-white/15 border border-black/10 dark:border-white/10"
      style={{ width: size, height: size, fontSize: Math.round(size*0.45) }}
      aria-label="Profil"
    >
      {initial}
    </span>
  );
}
