import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AreaResearch } from '@/components/research/AreaResearch';

export const metadata: Metadata = { title: 'Research' };

export default async function ResearchPage() {
  const t = await getTranslations('research');

  return (
    <div className="px-5 py-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      <p className="mt-0.5 text-sm text-steel-400">{t('subtitle')}</p>
      <AreaResearch />
    </div>
  );
}
