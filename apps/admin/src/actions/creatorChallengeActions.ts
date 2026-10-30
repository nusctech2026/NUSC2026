'use server';

import { assertStaffRole, getSupabaseAdminClient } from '../utils/supabaseServerClient';
import configPromise from '@payload-config';
import { getPayload } from 'payload';

export type CreatorChallengeEntry = {
  id: string;
  entry_number: string;
  full_name: string;
  creator_handle: string | null;
  email: string;
  phone: string;
  age_group: string;
  location: string;
  category: string;
  matchday_number: number;
  publishing_platform: string;
  public_profile_url: string;
  entry_title_description: string;
  published_entry_url: string;
  campaign_hashtag: string;
  additional_notes: string | null;
  guardian_consent: boolean;
  declaration_original_work: boolean;
  declaration_rights_permissions: boolean;
  declaration_rules_conduct: boolean;
  declaration_content_licence: boolean;
  declaration_accuracy_respect: boolean;
  declaration_contact_verification: boolean;
  terms_accepted_at: string;
  submitted_at: string;
};

export type CreatorChallengeEntryFilters = {
  category?: string;
  matchday?: number;
  search?: string;
  page?: number;
};

export type CreatorChallengeSummary = {
  total: number;
  categories: Record<'poster' | 'football_edits' | 'fan_voice', number>;
  matchdays: number[];
  canDeleteEntries: boolean;
};

type CreatorChallengeSummaryRow = {
  total: number;
  poster: number;
  football_edits: number;
  fan_voice: number;
  matchday_1: number;
  matchday_2: number;
  matchday_3: number;
  matchday_4: number;
  matchday_5: number;
  matchday_6: number;
  matchday_7: number;
  matchday_8: number;
  matchday_9: number;
  matchday_10: number;
};

export async function getCreatorChallengeSummary(): Promise<CreatorChallengeSummary> {
  const staff = await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']);

  const payload = await getPayload({ config: configPromise });
  let row: CreatorChallengeSummaryRow | undefined;
  try {
    const result = await payload.db.pool.query<CreatorChallengeSummaryRow>(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE category = 'poster')::int AS poster,
        COUNT(*) FILTER (WHERE category = 'football_edits')::int AS football_edits,
        COUNT(*) FILTER (WHERE category = 'fan_voice')::int AS fan_voice,
        COUNT(*) FILTER (WHERE matchday_number = 1)::int AS matchday_1,
        COUNT(*) FILTER (WHERE matchday_number = 2)::int AS matchday_2,
        COUNT(*) FILTER (WHERE matchday_number = 3)::int AS matchday_3,
        COUNT(*) FILTER (WHERE matchday_number = 4)::int AS matchday_4,
        COUNT(*) FILTER (WHERE matchday_number = 5)::int AS matchday_5,
        COUNT(*) FILTER (WHERE matchday_number = 6)::int AS matchday_6,
        COUNT(*) FILTER (WHERE matchday_number = 7)::int AS matchday_7,
        COUNT(*) FILTER (WHERE matchday_number = 8)::int AS matchday_8,
        COUNT(*) FILTER (WHERE matchday_number = 9)::int AS matchday_9,
        COUNT(*) FILTER (WHERE matchday_number = 10)::int AS matchday_10
      FROM public.creator_challenge_entries
    `);
    row = result.rows[0];
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'database_error';
    console.error('Creator Challenge summary lookup failed:', code);
    throw new Error('Unable to load the Creator Challenge summary. Please try again.');
  }

  return {
    total: row?.total ?? 0,
    categories: {
      poster: row?.poster ?? 0,
      football_edits: row?.football_edits ?? 0,
      fan_voice: row?.fan_voice ?? 0,
    },
    matchdays: [
      row?.matchday_1 ?? 0,
      row?.matchday_2 ?? 0,
      row?.matchday_3 ?? 0,
      row?.matchday_4 ?? 0,
      row?.matchday_5 ?? 0,
      row?.matchday_6 ?? 0,
      row?.matchday_7 ?? 0,
      row?.matchday_8 ?? 0,
      row?.matchday_9 ?? 0,
      row?.matchday_10 ?? 0,
    ],
    canDeleteEntries: staff.roles.some(role => role === 'super_admin' || role === 'campaign_manager'),
  };
}

export async function getCreatorChallengeEntries(filters: CreatorChallengeEntryFilters = {}) {
  await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']);

  const page = Number.isInteger(filters.page) ? Math.max(1, Math.min(10000, filters.page || 1)) : 1;
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const escapedSearch = typeof filters.search === 'string'
    ? filters.search.trim().slice(0, 120).replace(/[\\%_]/g, '\\$&')
    : '';
  const category = ['poster', 'football_edits', 'fan_voice'].includes(filters.category || '') ? filters.category : '';
  const matchday = Number.isInteger(filters.matchday) && (filters.matchday || 0) >= 1 && (filters.matchday || 0) <= 10
    ? filters.matchday
    : undefined;

  let query = getSupabaseAdminClient().from('creator_challenge_entries').select(`
    id, entry_number, full_name, creator_handle, email, phone, age_group, location,
    category, matchday_number, publishing_platform, public_profile_url,
    entry_title_description, published_entry_url, campaign_hashtag, additional_notes,
    guardian_consent, declaration_original_work, declaration_rights_permissions,
    declaration_rules_conduct, declaration_content_licence, declaration_accuracy_respect,
    declaration_contact_verification, terms_accepted_at, submitted_at
  `, { count: 'exact' });

  if (category) query = query.eq('category', category);
  if (matchday !== undefined) query = query.eq('matchday_number', matchday);
  if (escapedSearch) {
    query = escapedSearch.includes('@')
      ? query.ilike('email', `%${escapedSearch}%`)
      : query.ilike('full_name', `%${escapedSearch}%`);
  }

  const { data, count, error } = await query.order('submitted_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) {
    console.error('Creator Challenge entries lookup failed:', error.code || 'database_error');
    throw new Error('Unable to load Creator Challenge entries. Please try again.');
  }

  return {
    entries: (data || []) as CreatorChallengeEntry[],
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
  };
}

export async function deleteCreatorChallengeEntry(entryId: unknown): Promise<void> {
  const staff = await assertStaffRole(['super_admin', 'campaign_manager']);
  if (!staff.roles.some(role => role === 'super_admin' || role === 'campaign_manager')) {
    throw new Error('Access denied: only campaign managers and super admins can delete entries.');
  }

  const id = typeof entryId === 'string' ? entryId.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid Creator Challenge entry identifier.');
  }

  const { data, error } = await getSupabaseAdminClient()
    .from('creator_challenge_entries')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Creator Challenge entry deletion failed:', error.code || 'database_error');
    throw new Error('Unable to delete this entry. Please try again.');
  }
  if (!data) {
    throw new Error('This entry was not found or has already been deleted. Refresh the page and try again.');
  }
}
