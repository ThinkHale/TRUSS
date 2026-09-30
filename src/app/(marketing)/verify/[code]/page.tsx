import type { Metadata } from 'next';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase/server';
import { CERTIFICATION_DISCLAIMER } from '@/lib/truss/curriculum';

export const metadata: Metadata = { title: 'Verify a credential' };

interface Credential {
  holder_name: string | null;
  company_name: string;
  issued_at: string;
  revoked: boolean;
}

/**
 * Public verification of a TRUSS credential. A rep can show the code to a
 * homeowner or a future employer; anyone can check it here. verify_certification
 * (migration 0020) is callable without signing in and returns only what the
 * credential itself states — holder, company, program, date, and whether it has
 * been revoked. Never scores or evidence.
 */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = decodeURIComponent(code).trim().toUpperCase();
  const valid = /^TRS-[0-9A-F]{5}-[0-9A-F]{5}$/.test(clean);

  let record: Credential | null = null;
  if (valid && isSupabaseConfigured()) {
    const supabase = await supabaseServer();
    const { data } = await supabase.rpc('verify_certification', { p_code: clean });
    record = (data as Credential[] | null)?.[0] ?? null;
  }

  return (
    <div className="px-5 py-16">
      <div className="mx-auto max-w-lg">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-gold-600">Credential check</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{clean}</h1>

        <div className="card mt-6">
          {!record ? (
            <p className="text-lg font-bold text-nogo">No TRUSS credential has this code.</p>
          ) : record.revoked ? (
            <>
              <p className="text-lg font-bold text-nogo">This credential has been revoked.</p>
              <p className="mt-2 text-sm text-ink-600">
                It was issued to {record.holder_name ?? 'a TRUSS participant'} at {record.company_name}.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-go">Valid</p>
              <p className="mt-2">
                <b>{record.holder_name ?? 'This participant'}</b> completed the TRUSS Eight-Week Training Program at{' '}
                <b>{record.company_name}</b> and was certified on{' '}
                {new Date(record.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
              </p>
            </>
          )}
        </div>
        <p className="mt-4 text-sm text-ink-500">{CERTIFICATION_DISCLAIMER.en}</p>
      </div>
    </div>
  );
}
