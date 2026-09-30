'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionContext, isManagerRole } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { STAGE_IDS, type StageId } from '@/lib/truss/methodology';
import { isOpenAIConfigured } from '@/lib/ai/openai';
import {
  extractText,
  ingestDocument,
  KNOWLEDGE_SOURCE_TYPES,
  MAX_UPLOAD_BYTES,
  type KnowledgeSourceType,
} from '@/lib/ai/ingest';

/**
 * Manager actions: roleplay scenarios and the company knowledge base.
 *
 * Writes use the manager's own client. The custom_scenarios and knowledge
 * policies (owner, admin, manager of that org) are the gate; the role check
 * here only turns a refusal into a sentence. Each returns a result rather than
 * throwing, because Next.js replaces thrown server-action messages with an
 * opaque digest in production.
 */

export type TeamResult = { ok: true; id?: string; message?: string } | { ok: false; message: string };

async function managerSession() {
  const session = await getSessionContext();
  if (!session) return { error: 'Your session expired. Sign in and try again.' } as const;
  if (!isManagerRole(session.role)) return { error: 'Only managers can do that.' } as const;
  return { session } as const;
}

// ─── Scenarios ──────────────────────────────────────────────────────────────

const stage = z.enum(STAGE_IDS as unknown as [StageId, ...StageId[]]);

const scenarioSchema = z.object({
  id: z.string().uuid().nullable(),
  title: z.string().trim().min(3).max(120),
  setup: z.string().trim().min(20).max(1500),
  characterBrief: z.string().trim().min(80).max(6000),
  objections: z.array(z.string().trim().min(1).max(300)).max(12),
  difficulty: z.enum(['easy', 'moderate', 'hard']),
  focusStages: z.array(stage).max(5),
  persona: z.enum(['homeowner', 'adjuster', 'property-manager', 'business-owner']),
  voice: z.enum(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']),
  language: z.enum(['en', 'es']),
  isPublished: z.boolean(),
});

export async function saveScenario(input: z.input<typeof scenarioSchema>): Promise<TeamResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  const { session } = gate;

  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const hint =
      field === 'characterBrief'
        ? 'The character brief needs more detail — at least a short paragraph.'
        : field === 'setup'
          ? 'The setup needs a sentence or two the rep will read before starting.'
          : 'Check the scenario details and try again.';
    return { ok: false, message: hint };
  }
  const d = parsed.data;
  const supabase = await supabaseServer();

  const row = {
    org_id: session.orgId,
    title: d.title,
    setup: d.setup,
    character_brief: d.characterBrief,
    objections: d.objections,
    difficulty: d.difficulty,
    focus_stages: d.focusStages,
    persona: d.persona,
    voice: d.voice,
    language: d.language,
    is_published: d.isPublished,
  };

  if (d.id) {
    const { error } = await supabase
      .from('custom_scenarios')
      .update(row)
      .eq('id', d.id)
      .eq('org_id', session.orgId);
    if (error) return { ok: false, message: 'Could not save that scenario.' };
    await supabase.rpc('record_org_event', {
      p_org: session.orgId,
      p_action: 'scenario.update',
      p_detail: { scenario_id: d.id, title: d.title, published: d.isPublished },
    });
    revalidatePath('/team/scenarios');
    revalidatePath('/practice');
    return { ok: true, id: d.id };
  }

  const { data, error } = await supabase
    .from('custom_scenarios')
    .insert({ ...row, created_by: session.userId })
    .select('id')
    .single();
  if (error || !data) return { ok: false, message: 'Could not create that scenario.' };

  await supabase.rpc('record_org_event', {
    p_org: session.orgId,
    p_action: 'scenario.create',
    p_detail: { scenario_id: data.id, title: d.title, published: d.isPublished },
  });
  revalidatePath('/team/scenarios');
  revalidatePath('/practice');
  return { ok: true, id: data.id };
}

export async function deleteScenario(id: string): Promise<TeamResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: 'Unknown scenario.' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('custom_scenarios')
    .delete()
    .eq('id', id)
    .eq('org_id', gate.session.orgId)
    .select('title')
    .maybeSingle();
  if (error) return { ok: false, message: 'Could not delete that scenario.' };

  await supabase.rpc('record_org_event', {
    p_org: gate.session.orgId,
    p_action: 'scenario.delete',
    p_detail: { scenario_id: id, title: data?.title ?? null },
  });
  revalidatePath('/team/scenarios');
  revalidatePath('/practice');
  return { ok: true };
}

// ─── Knowledge ──────────────────────────────────────────────────────────────

/**
 * Loads a document from the Knowledge page: an uploaded PDF, Word, or text
 * file, or pasted text. FormData rather than JSON because a file is involved.
 */
export async function uploadKnowledge(form: FormData): Promise<TeamResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  if (!isOpenAIConfigured()) return { ok: false, message: 'Knowledge loading is not configured on this deployment.' };

  const title = String(form.get('title') ?? '').trim().slice(0, 200);
  const citationLabel = String(form.get('citationLabel') ?? '').trim().slice(0, 200) || null;
  const rawType = String(form.get('sourceType') ?? 'upload');
  const sourceType: KnowledgeSourceType = (KNOWLEDGE_SOURCE_TYPES as readonly string[]).includes(rawType)
    ? (rawType as KnowledgeSourceType)
    : 'upload';
  const stageTags = form
    .getAll('stageTags')
    .map(String)
    .filter((s): s is StageId => (STAGE_IDS as readonly string[]).includes(s));
  const file = form.get('file');
  const pasted = String(form.get('content') ?? '');

  let content = pasted;
  let finalTitle = title;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false, message: 'That file is over 4 MB — usually images. Save it as text, or split it, and load the pieces.' };
    }
    let text: string | null;
    try {
      text = await extractText(file);
    } catch {
      return { ok: false, message: 'Could not read that file. If it is a PDF, make sure it is not password-protected.' };
    }
    if (text == null) {
      return { ok: false, message: 'TRUSS reads PDF, Word (.docx), text, Markdown, and CSV files.' };
    }
    if (!text.trim()) {
      return {
        ok: false,
        message: 'That file has no text layer — it is probably a scan. Run it through OCR first, or paste the text.',
      };
    }
    content = text;
    finalTitle = title || file.name.replace(/\.[a-z0-9]+$/i, '');
  }

  if (!finalTitle) return { ok: false, message: 'Give the document a title.' };

  const supabase = await supabaseServer();
  const result = await ingestDocument(supabase, gate.session, {
    title: finalTitle,
    content,
    sourceType: file instanceof File && file.size > 0 ? sourceType : sourceType === 'upload' ? 'pasted' : sourceType,
    citationLabel,
    stageTags,
  });

  revalidatePath('/team/knowledge');
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, id: result.documentId, message: `Loaded in ${result.chunks} passage${result.chunks === 1 ? '' : 's'}.` };
}

export async function deleteKnowledge(id: string): Promise<TeamResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: 'Unknown document.' };

  const supabase = await supabaseServer();
  // Chunks cascade with the document.
  const { data, error } = await supabase
    .from('knowledge_documents')
    .delete()
    .eq('id', id)
    .eq('org_id', gate.session.orgId)
    .select('title')
    .maybeSingle();
  if (error) return { ok: false, message: 'Could not remove that document.' };

  await supabase.rpc('record_org_event', {
    p_org: gate.session.orgId,
    p_action: 'knowledge.delete',
    p_detail: { document_id: id, title: data?.title ?? null },
  });
  revalidatePath('/team/knowledge');
  return { ok: true };
}
