import type { Metadata } from 'next';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { isOpenAIConfigured } from '@/lib/ai/openai';
import { DeleteKnowledgeButton, KnowledgeUpload } from '@/components/team/KnowledgeUpload';

export const metadata: Metadata = { title: 'Knowledge' };

/**
 * What the Coach knows about this company: its playbooks, policies, pricing
 * rules, and transcripts. Each document is chunked and embedded for this
 * company only; the Coach cites it by name. A portfolio's documents are listed
 * too, because they reach this company's reps as the house standard.
 */
export default async function KnowledgePage() {
  const session = await getSessionContext();
  if (!session) return null;
  const supabase = await supabaseServer();

  const { data: docs } = await supabase
    .from('knowledge_documents')
    .select('id, org_id, title, citation_label, source_type, status, error_message, chunk_count, byte_size, created_at')
    .order('created_at', { ascending: false })
    .limit(300);

  const own = (docs ?? []).filter((d) => d.org_id === session.orgId);
  const inherited = (docs ?? []).filter((d) => d.org_id !== session.orgId);

  return (
    <div>
      <section className="card">
        <h2 className="mb-1 text-lg font-bold">Teach the Coach your company</h2>
        <p className="team-note mb-4">
          Anything you would hand a new rep on day one. Company material is reference, not instruction: it can
          make the Coach stricter or more specific, never looser than the TRUSS guardrails.
        </p>
        <KnowledgeUpload configured={isOpenAIConfigured()} />
      </section>

      <h2 className="team-section-title">Loaded ({own.length})</h2>
      {own.length === 0 ? (
        <p className="card team-empty">Nothing loaded yet. The Coach is working from the TRUSS knowledge base alone.</p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr><th>Title</th><th>Cited as</th><th>Type</th><th>Status</th><th className="num">Passages</th><th>Added</th><th /></tr>
            </thead>
            <tbody>
              {own.map((d) => (
                <tr key={d.id}>
                  <td><b>{d.title}</b></td>
                  <td>{d.citation_label ?? d.title}</td>
                  <td>{d.source_type}</td>
                  <td>
                    <span className={d.status === 'ready' ? 'team-pill team-pill-good' : d.status === 'failed' ? 'team-pill team-pill-bad' : 'team-pill'}>
                      {d.status}
                    </span>
                    {d.error_message && <div className="team-note">{d.error_message}</div>}
                  </td>
                  <td className="num">{d.chunk_count}</td>
                  <td>{new Date(d.created_at).toLocaleDateString()}</td>
                  <td><DeleteKnowledgeButton id={d.id} title={d.title} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inherited.length > 0 && (
        <>
          <h2 className="team-section-title">From your portfolio</h2>
          <div className="team-table-wrap">
            <table className="team-table">
              <thead><tr><th>Title</th><th>Status</th><th className="num">Passages</th></tr></thead>
              <tbody>
                {inherited.map((d) => (
                  <tr key={d.id}>
                    <td><b>{d.title}</b> <span className="team-pill team-pill-gold ml-1">House standard</span></td>
                    <td>{d.status}</td>
                    <td className="num">{d.chunk_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
