import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AreaResearch } from '@/components/research/AreaResearch';

export const metadata: Metadata = { title: 'Research' };

export default async function ResearchPage() {
  const t = await getTranslations('research');

  return (
    <div className="app-page">
      <header className="app-page-head">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>
      <AreaResearch />
    </div>
  );
}
