import { assertStaffRole, getSupabaseAdminClient } from '../../../../../../utils/supabaseServerClient';

export const runtime = 'nodejs';

const ENTRY_SELECT = `
  entry_number, full_name, creator_handle, email, phone, age_group, location,
  category, matchday_number, publishing_platform, public_profile_url,
  entry_title_description, published_entry_url, campaign_hashtag, additional_notes,
  guardian_consent, declaration_original_work, declaration_rights_permissions,
  declaration_rules_conduct, declaration_content_licence, declaration_accuracy_respect,
  declaration_contact_verification, terms_accepted_at, submitted_at
`;

const CSV_COLUMNS = [
  ['Entry reference', 'entry_number'],
  ['Full name', 'full_name'],
  ['Creator name / handle', 'creator_handle'],
  ['Email address', 'email'],
  ['Phone / WhatsApp', 'phone'],
  ['Age group', 'age_group'],
  ['Town / district / state', 'location'],
  ['Challenge category', 'category'],
  ['Matchday number', 'matchday_number'],
  ['Publishing platform', 'publishing_platform'],
  ['Public profile URL', 'public_profile_url'],
  ['Entry title / short description', 'entry_title_description'],
  ['Published entry URL', 'published_entry_url'],
  ['Campaign hashtag used', 'campaign_hashtag'],
  ['Additional notes', 'additional_notes'],
  ['Parent / guardian consent', 'guardian_consent'],
  ['Original work declaration', 'declaration_original_work'],
  ['Rights and permissions declaration', 'declaration_rights_permissions'],
  ['Rules and conduct declaration', 'declaration_rules_conduct'],
  ['Content-use licence declaration', 'declaration_content_licence'],
  ['Accuracy and respect declaration', 'declaration_accuracy_respect'],
  ['Contact and verification declaration', 'declaration_contact_verification'],
  ['Terms accepted at', 'terms_accepted_at'],
  ['Submitted at', 'submitted_at'],
] as const;

function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[\t\r\n ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']);
  } catch {
    return Response.json({ error: 'Access denied.' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const categoryValue = url.searchParams.get('category') || '';
    const category = ['poster', 'football_edits', 'fan_voice'].includes(categoryValue) ? categoryValue : '';
    const matchdayValue = Number(url.searchParams.get('matchday'));
    const matchday = Number.isInteger(matchdayValue) && matchdayValue >= 1 && matchdayValue <= 10
      ? matchdayValue
      : undefined;
    const search = (url.searchParams.get('search') || '').trim().slice(0, 120).replace(/[\\%_]/g, '\\$&');
    const supabase = getSupabaseAdminClient();
    const pageSize = 500;
    const rows: Record<string, unknown>[] = [];

    for (let from = 0; ; from += pageSize) {
      let query = supabase.from('creator_challenge_entries').select(ENTRY_SELECT);
      if (category) query = query.eq('category', category);
      if (matchday !== undefined) query = query.eq('matchday_number', matchday);
      if (search) {
        query = search.includes('@')
          ? query.ilike('email', `%${search}%`)
          : query.ilike('full_name', `%${search}%`);
      }

      const { data, error } = await query
        .order('submitted_at', { ascending: false })
        .order('entry_number', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error('Creator Challenge CSV export failed:', error.code || 'database_error');
        return Response.json({ error: 'Unable to export Creator Challenge entries.' }, { status: 500 });
      }

      rows.push(...(data || []) as Record<string, unknown>[]);
      if (!data || data.length < pageSize) break;
    }

    const lines = [
      CSV_COLUMNS.map(([header]) => csvCell(header)).join(','),
      ...rows.map(row => CSV_COLUMNS.map(([, field]) => csvCell(row[field])).join(',')),
    ];
    const date = new Date().toISOString().slice(0, 10);

    return new Response(`\uFEFF${lines.join('\r\n')}\r\n`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="nusc_creator_challenge_entries_${date}.csv"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Creator Challenge CSV export failed:', error instanceof Error ? error.name : 'unknown_error');
    return Response.json({ error: 'Unable to export Creator Challenge entries.' }, { status: 500 });
  }
}
