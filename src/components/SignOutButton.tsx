'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabaseBrowser } from '@/lib/supabase/client';

export function SignOutButton() {
  const t = useTranslations('nav');
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn-ghost w-full"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push('/');
        router.refresh();
      }}
    >
      {t('signOut')}
    </button>
  );
}
