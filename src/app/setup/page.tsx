import type { Metadata } from 'next';
import { Wordmark } from '@/components/brand/Logo';

export const metadata: Metadata = { title: 'Setup' };

/**
 * Shown when the app is reachable but not yet configured. Better than a stack
 * trace, and it doubles as the checklist for a first deployment.
 */

const REQUIRED = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', what: 'Supabase project URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', what: 'Supabase anon key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', what: 'Supabase service role key (server only)' },
  { key: 'OPENAI_API_KEY', what: 'OpenAI key — powers Coach, voice practice, and scoring' },
  { key: 'GOOGLE_MAPS_API_KEY', what: 'Google Maps key — Geocoding, Places, and Weather' },
];

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <Wordmark />

      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Finish setting up TRUSS</h1>
      <p className="mt-3 text-steel-300">
        The app is running but it is not connected to its services yet. Add these environment
        variables, then run the migrations in <code className="rounded bg-steel-800 px-1.5 py-0.5 text-sm">supabase/migrations</code> in order.
      </p>

      <ul className="mt-8 space-y-3">
        {REQUIRED.map((item) => {
          const present = Boolean(process.env[item.key]);
          return (
            <li key={item.key} className="card flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 text-lg"
                style={{ color: present ? 'var(--color-go)' : 'var(--color-nogo)' }}
              >
                {present ? '✓' : '✗'}
              </span>
              <div>
                <code className="text-sm font-bold">{item.key}</code>
                <p className="text-sm text-steel-400">{item.what}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-sm text-steel-500">
        Full instructions are in <code className="rounded bg-steel-800 px-1.5 py-0.5">docs/DEPLOYMENT.md</code>.
      </p>
    </div>
  );
}
