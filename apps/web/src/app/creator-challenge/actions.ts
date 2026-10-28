'use server';

import crypto from 'node:crypto';
import { createAdminClient } from '@nusc/db';
import { CampaignRateLimitError, CampaignServiceError, campaignRateLimit } from '../campaign/server';
import { creatorChallengeValuesFromFormData, validateCreatorChallengeSubmission } from './validation';

export type CreatorChallengeSubmitResult =
  | { success: true; entryNumber: string }
  | { success: false; error: string };

function canonicalEntryUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || ['si', 'feature', 'fbclid', 'igsh'].includes(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

export async function submitCreatorChallengeEntry(formData: FormData): Promise<CreatorChallengeSubmitResult> {
  try {
    if (!(formData instanceof FormData)) return { success: false, error: 'Please complete the entry form and try again.' };
    const validation = validateCreatorChallengeSubmission(creatorChallengeValuesFromFormData(formData));
    if (!validation.success) return { success: false, error: validation.errors[0] };

    const entry = validation.data;
    await Promise.all([
      campaignRateLimit('creator-challenge-email', entry.email.toLowerCase(), 4, 3600),
      campaignRateLimit('creator-challenge-phone', entry.phone.replace(/\D/g, ''), 4, 3600),
    ]);

    const entryNumber = `NUSC-CC-${new Date().getUTCFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const { error } = await createAdminClient().from('creator_challenge_entries').insert({
      entry_number: entryNumber,
      full_name: entry.fullName,
      creator_handle: entry.creatorHandle || null,
      email: entry.email,
      phone: entry.phone,
      age_group: entry.ageGroup,
      location: entry.location,
      category: entry.category,
      matchday_number: Number(entry.matchday),
      publishing_platform: entry.publishingPlatform,
      public_profile_url: entry.publicProfileUrl,
      entry_title_description: entry.entryTitleDescription,
      published_entry_url: entry.publishedEntryUrl,
      published_entry_url_key: canonicalEntryUrl(entry.publishedEntryUrl),
      campaign_hashtag: entry.campaignHashtag,
      additional_notes: entry.additionalNotes || null,
      guardian_consent: entry.guardianConsent,
      declaration_original_work: entry.declarations.originalWork,
      declaration_rights_permissions: entry.declarations.rightsPermissions,
      declaration_rules_conduct: entry.declarations.rulesConduct,
      declaration_content_licence: entry.declarations.contentLicence,
      declaration_accuracy_respect: entry.declarations.accuracyRespect,
      declaration_contact_verification: entry.declarations.contactVerification,
      terms_accepted_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'This email/category/matchday entry or published entry URL has already been submitted.' };
      }
      console.error('Creator Challenge entry could not be saved:', error.code || 'database_error');
      return { success: false, error: 'Your entry could not be saved right now. Please try again shortly.' };
    }

    return { success: true, entryNumber };
  } catch (error) {
    if (error instanceof CampaignRateLimitError || error instanceof CampaignServiceError) {
      return { success: false, error: error.message };
    }
    console.error('Creator Challenge submission failed:', error instanceof Error ? error.name : 'unknown_error');
    return { success: false, error: 'Your entry could not be submitted right now. Please try again shortly.' };
  }
}
