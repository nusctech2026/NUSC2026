'use server';

import { assertStaffRole, getSupabaseAdminClient } from '../utils/supabaseServerClient';

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
};

export async function getCreatorChallengeSummary(): Promise<CreatorChallengeSummary> {
  await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']);

  const supabase = getSupabaseAdminClient();
  const totalRequest = supabase.from('creator_challenge_entries').select('id', { count: 'exact', head: true });
  const categoryRequests = Promise.all((['poster', 'football_edits', 'fan_voice'] as const).map(async category => ({
    category,
    ...await supabase.from('creator_challenge_entries').select('id', { count: 'exact', head: true }).eq('category', category),
  })));
  const matchdayRequests = Promise.all(Array.from({ length: 10 }, (_, index) => index + 1).map(async matchday => ({
    matchday,
    ...await supabase.from('creator_challenge_entries').select('id', { count: 'exact', head: true }).eq('matchday_number', matchday),
  })));

  const [total, categoryResults, matchdayResults] = await Promise.all([totalRequest, categoryRequests, matchdayRequests]);
  if (total.error || categoryResults.some(result => result.error) || matchdayResults.some(result => result.error)) {
    console.error('Creator Challenge summary lookup failed:', total.error?.code || 'database_error');
    throw new Error('Unable to load the Creator Challenge summary. Please try again.');
  }

  const categories: CreatorChallengeSummary['categories'] = { poster: 0, football_edits: 0, fan_voice: 0 };
  for (const result of categoryResults) categories[result.category] = result.count || 0;

  const byMatchday = new Map(matchdayResults.map(result => [result.matchday, result.count || 0]));
  return {
    total: total.count || 0,
    categories,
    matchdays: Array.from({ length: 10 }, (_, index) => byMatchday.get(index + 1) || 0),
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
