import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@nusc/db';

export const runtime = 'nodejs';

const BUCKET = 'campaign_documents';
const PREFIXES = ['media-authorisation', 'official-credential'] as const;
const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 1000;
const ORPHAN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function loadLinkedDocumentPaths(supabase: ReturnType<typeof createAdminClient>) {
  const linkedPaths = new Set<string>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('campaign_applications')
      .select('media_authorisation_storage_path, official_credential_storage_path')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error || !data) throw new Error('Unable to load linked workforce documents');

    for (const application of data) {
      if (application.media_authorisation_storage_path) {
        linkedPaths.add(application.media_authorisation_storage_path);
      }
      if (application.official_credential_storage_path) {
        linkedPaths.add(application.official_credential_storage_path);
      }
    }

    if (data.length < PAGE_SIZE) return linkedPaths;
    offset += data.length;
  }
}

async function listUnlinkedDocuments(
  supabase: ReturnType<typeof createAdminClient>,
  linkedPaths: Set<string>,
  cutoff: number
) {
  const stalePaths: string[] = [];

  for (const prefix of PREFIXES) {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'created_at', order: 'asc' },
      });
      if (error || !data) throw new Error('Unable to list workforce documents');

      for (const file of data) {
        if (!file.id || !file.created_at) continue;
        const createdAt = Date.parse(file.created_at);
        if (!Number.isFinite(createdAt) || createdAt > cutoff) continue;

        const path = `${prefix}/${file.name}`;
        if (!linkedPaths.has(path)) stalePaths.push(path);
      }

      if (data.length < PAGE_SIZE) break;
      offset += data.length;
    }
  }

  return stalePaths;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ success: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const supabase = createAdminClient();
    const linkedPaths = await loadLinkedDocumentPaths(supabase);
    const stalePaths = await listUnlinkedDocuments(
      supabase,
      linkedPaths,
      Date.now() - ORPHAN_RETENTION_MS
    );

    // Recheck links after listing storage so newly submitted applications are
    // not removed based on the earlier snapshot.
    const latestLinkedPaths = await loadLinkedDocumentPaths(supabase);
    const pathsToDelete = stalePaths.filter((path) => !latestLinkedPaths.has(path));

    let deletedCount = 0;
    for (let offset = 0; offset < pathsToDelete.length; offset += DELETE_BATCH_SIZE) {
      const batch = pathsToDelete.slice(offset, offset + DELETE_BATCH_SIZE);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (error) throw new Error('Unable to remove unlinked workforce documents');
      deletedCount += batch.length;
    }

    return Response.json(
      { success: true, deletedCount },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    console.error('Campaign document cleanup failed');
    return Response.json(
      { success: false },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
