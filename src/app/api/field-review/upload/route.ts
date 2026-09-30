/**
 * Step one of a field review: a one-time URL to upload the recording to.
 *
 * Recordings are too large to pass through a function body (Vercel stops at
 * 4.5 MB), so the browser uploads straight to private storage with a signed
 * URL, then asks /api/field-review to process it. The path is chosen here —
 * `<org>/<user>/<random>` — and the processing route refuses any path outside
 * the caller's own folder, so a client cannot point it at someone else's file.
 *
 * The bucket is private and created on first use. Anything in the caller's
 * folder older than an hour is an upload that was never submitted, and is
 * deleted here, so abandoned audio does not sit in storage.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { isOpenAIConfigured } from '@/lib/ai/openai';
import { FIELD_AUDIO_BUCKET, MAX_FIELD_AUDIO_BYTES, ORPHAN_UPLOAD_MS } from '@/lib/truss/field';

export const runtime = 'nodejs';

const bodySchema = z.object({
  contentType: z.string().regex(/^audio\/[a-z0-9.+-]+$/i).max(80),
  size: z.number().int().positive().max(MAX_FIELD_AUDIO_BYTES),
});

const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
};

export async function POST(req: NextRequest) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: 'Field reviews are not configured on this deployment.' }, { status: 503 });
  }
  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Upload an audio file under 25 MB.' }, { status: 400 });
  }

  // Checked here as well as on submit, so nobody uploads a recording only to
  // be told afterwards that the month's reviews are used up.
  const supabase = await supabaseServer();
  const { data: allowed } = await supabase.rpc('within_quota', { target_org: session.orgId, event_kind: 'field_review' });
  if (!allowed) {
    return Response.json({ error: 'quota', message: 'Your company has used its field reviews for this month.' }, { status: 402 });
  }

  const admin = supabaseAdmin();
  const bucket = admin.storage.from(FIELD_AUDIO_BUCKET);

  const { error: bucketError } = await admin.storage.getBucket(FIELD_AUDIO_BUCKET);
  if (bucketError) {
    await admin.storage.createBucket(FIELD_AUDIO_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FIELD_AUDIO_BYTES,
      allowedMimeTypes: ['audio/*'],
    });
  }

  const folder = `${session.orgId}/${session.userId}`;
  const { data: existing } = await bucket.list(folder, { limit: 100 });
  const stale = (existing ?? [])
    .filter((f) => f.created_at && Date.now() - new Date(f.created_at).getTime() > ORPHAN_UPLOAD_MS)
    .map((f) => `${folder}/${f.name}`);
  if (stale.length) await bucket.remove(stale);

  const ext = EXTENSIONS[parsed.data.contentType.toLowerCase().split(';')[0]] ?? 'audio';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await bucket.createSignedUploadUrl(path);
  if (error || !data) {
    console.error('field upload url failed', { message: error?.message });
    return Response.json({ error: 'Could not prepare the upload. Try again.' }, { status: 500 });
  }

  return Response.json({ bucket: FIELD_AUDIO_BUCKET, path: data.path, token: data.token });
}
