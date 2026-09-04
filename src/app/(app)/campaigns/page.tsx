import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CampaignBuilder } from '@/components/campaigns/CampaignBuilder';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Campaigns' };

export default async function CampaignsPage() {
  const t = await getTranslations('campaigns');
  const session = await getSessionContext();

  let campaigns: {
    id: string;
    name: string;
    stage: string;
    audience: string | null;
    pieces: unknown;
    created_at: string;
  }[] = [];

  if (session) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, stage, audience, pieces, created_at')
      .order('updated_at', { ascending: false })
      .limit(25);
    campaigns = data ?? [];
  }

  return (
    <div className="app-page">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      <p className="mt-0.5 text-sm text-steel-400">{t('subtitle')}</p>
      <CampaignBuilder existing={campaigns} />
    </div>
  );
}
