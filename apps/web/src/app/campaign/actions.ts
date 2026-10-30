'use server';

import { createHash, randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { createAdminClient, createServerClient } from '@nusc/db';
import { campaignRateLimit, campaignRoleLabel, campaignSiteOrigin, CampaignRateLimitError, CampaignServiceError } from './server';
import { createPerformanceTrace } from '@nusc/db/src/performance';

const MEDIA_ACCESS_TYPES = [
  'media_press_seating',
  'photography_area',
  'press_conference_area',
  'mixed_zone_interview_area',
  'broadcast_video_coverage_area',
] as const;
const MEDIA_ORGANISATION_TYPE_CODES = [
  'kaki',
  'print_media',
  'press_media',
  'broadcast_tv',
  'digital_online_media',
  'independent_freelance',
  'other',
] as const;
const MEDIA_AUTHORISATION_PATH_PATTERN = /^media-authorisation\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpeg|png)$/i;
const OFFICIAL_CREDENTIAL_PATH_PATTERN = /^official-credential\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpeg|png)$/i;
const SUBMISSION_SCALAR_FIELDS = [
  'idempotencyKey', 'fullName', 'phone', 'email', 'category', 'preferredRoleId', 'otherRole',
  'organisation', 'organisationOther', 'designation', 'availabilityMode', 'mediaOutlet',
  'mediaOrganisationType', 'mediaDesignation', 'portfolioUrl', 'professionalBody',
  'professionalQualification', 'professionalRegistrationNumber', 'professionalExperience',
  'conflictOfInterest', 'conflictDetails', 'technicalSpecialty', 'experience',
  'crewWorkArrangement', 'crewOrganisation', 'crewLeadName', 'crewLeadPhone', 'termsAccepted',
  'mediaAuthorisationPath', 'officialCredentialPath',
] as const;
const SUBMISSION_REPEAT_FIELDS = ['availabilityMatchId', 'mediaAccessType'] as const;
const SUBMISSION_ALLOWED_FIELDS = new Set<string>([
  ...SUBMISSION_SCALAR_FIELDS, ...SUBMISSION_REPEAT_FIELDS, 'photo',
]);
const SUBMISSION_FIELD_LIMITS: Record<(typeof SUBMISSION_SCALAR_FIELDS)[number], number> = {
  idempotencyKey: 36, fullName: 255, phone: 50, email: 255, category: 50, preferredRoleId: 36,
  otherRole: 255, organisation: 255, organisationOther: 255, designation: 255, availabilityMode: 10,
  mediaOutlet: 255, mediaOrganisationType: 40, mediaDesignation: 255, portfolioUrl: 2048,
  professionalBody: 255, professionalQualification: 255, professionalRegistrationNumber: 100,
  professionalExperience: 2000, conflictOfInterest: 3, conflictDetails: 2000, technicalSpecialty: 255,
  experience: 2000, crewWorkArrangement: 20, crewOrganisation: 255, crewLeadName: 255,
  crewLeadPhone: 50, termsAccepted: 5, mediaAuthorisationPath: 100, officialCredentialPath: 100,
};

function validateSubmissionFormData(formData: FormData): string | null {
  for (const key of formData.keys()) {
    if (!SUBMISSION_ALLOWED_FIELDS.has(key)) return 'The registration form contains unsupported fields. Refresh and try again.';
  }
  for (const field of SUBMISSION_SCALAR_FIELDS) {
    const values = formData.getAll(field);
    if (values.length > 1 || values.some((value) => typeof value !== 'string')) {
      return 'The registration form contains an invalid field. Refresh and try again.';
    }
    if (typeof values[0] === 'string' && values[0].length > SUBMISSION_FIELD_LIMITS[field]) {
      return 'One or more fields exceed the allowed length.';
    }
  }
  for (const field of SUBMISSION_REPEAT_FIELDS) {
    if (formData.getAll(field).some((value) => typeof value !== 'string')) {
      return 'The registration form contains an invalid selection. Refresh and try again.';
    }
  }
  const photos = formData.getAll('photo');
  if (photos.length !== 1 || typeof File === 'undefined' || !(photos[0] instanceof File)) {
    return 'Upload one valid profile photograph.';
  }
  return null;
}

async function rateLimitCampaignRequestIp(purpose: string, limit: number) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-real-ip')
    || requestHeaders.get('cf-connecting-ip')
    || requestHeaders.get('x-forwarded-for')?.split(',')[0];
  const identity = forwarded?.trim().toLowerCase();
  if (identity) await campaignRateLimit(purpose, identity, limit);
}

function normalizeWorkforcePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

export async function createMediaAuthorisationUploadUrl(fileName: string, fileSize: number, phoneValue: string) {
  try {
    const safeFileName = typeof fileName === 'string' && fileName.length <= 255 ? fileName : '';
    const extension = safeFileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
    const contentTypeByExtension: Record<string, { extension: string; contentType: string }> = {
      pdf: { extension: 'pdf', contentType: 'application/pdf' },
      jpg: { extension: 'jpeg', contentType: 'image/jpeg' },
      jpeg: { extension: 'jpeg', contentType: 'image/jpeg' },
      png: { extension: 'png', contentType: 'image/png' },
    };
    const fileType = extension ? contentTypeByExtension[extension] : null;
    const phone = typeof phoneValue === 'string' && /^[0-9\s()+.-]+$/.test(phoneValue)
      ? normalizeWorkforcePhone(phoneValue)
      : '';
    if (!fileType || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 10 * 1024 * 1024 || !/^\d{10}$/.test(phone)) {
      return { success: false as const, error: 'Check the file type, 10 MB size limit, and 10-digit phone number.' };
    }

    await rateLimitCampaignRequestIp('media-document-upload-ip', 10);
    await campaignRateLimit('media-document-upload', phone, 5);
    const path = `media-authorisation/${randomUUID()}.${fileType.extension}`;
    const { data, error } = await createAdminClient().storage
      .from('campaign_documents')
      .createSignedUploadUrl(path);
    if (error || !data?.token) {
      return { success: false as const, error: 'Unable to prepare the media document upload. Please try again.' };
    }

    return { success: true as const, path, token: data.token, contentType: fileType.contentType };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof CampaignRateLimitError
        ? error.message
        : 'Unable to prepare the media document upload. Please try again.',
    };
  }
}

export async function discardCampaignMediaAuthorisationUpload(pathValue: string) {
  if (typeof pathValue !== 'string' || !MEDIA_AUTHORISATION_PATH_PATTERN.test(pathValue)) {
    return { success: false as const };
  }
  try {
    const supabase = createAdminClient();
    const { data: linkedApplication, error: lookupError } = await supabase.from('campaign_applications')
      .select('id').eq('media_authorisation_storage_path', pathValue).maybeSingle();
    if (lookupError || linkedApplication) return { success: false as const };
    const { error } = await supabase.storage.from('campaign_documents').remove([pathValue]);
    return { success: !error };
  } catch {
    return { success: false as const };
  }
}

export async function createOfficialCredentialUploadUrl(fileName: string, fileSize: number, phoneValue: string) {
  try {
    const safeFileName = typeof fileName === 'string' && fileName.length <= 255 ? fileName : '';
    const extension = safeFileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
    const contentTypeByExtension: Record<string, { extension: string; contentType: string }> = {
      pdf: { extension: 'pdf', contentType: 'application/pdf' },
      jpg: { extension: 'jpeg', contentType: 'image/jpeg' },
      jpeg: { extension: 'jpeg', contentType: 'image/jpeg' },
      png: { extension: 'png', contentType: 'image/png' },
    };
    const fileType = extension ? contentTypeByExtension[extension] : null;
    const phone = typeof phoneValue === 'string' && /^[0-9\s()+.-]+$/.test(phoneValue)
      ? normalizeWorkforcePhone(phoneValue)
      : '';
    if (!fileType || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 10 * 1024 * 1024 || !/^\d{10}$/.test(phone)) {
      return { success: false as const, error: 'Check the file type, 10 MB size limit, and 10-digit phone number.' };
    }

    await rateLimitCampaignRequestIp('official-credential-upload-ip', 10);
    await campaignRateLimit('official-credential-upload', phone, 5);
    const path = `official-credential/${randomUUID()}.${fileType.extension}`;
    const { data, error } = await createAdminClient().storage
      .from('campaign_documents')
      .createSignedUploadUrl(path);
    if (error || !data?.token) {
      return { success: false as const, error: 'Unable to prepare the qualification document upload. Please try again.' };
    }

    return { success: true as const, path, token: data.token, contentType: fileType.contentType };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof CampaignRateLimitError
        ? error.message
        : 'Unable to prepare the qualification document upload. Please try again.',
    };
  }
}

export async function discardOfficialCredentialUpload(pathValue: string) {
  if (typeof pathValue !== 'string' || !OFFICIAL_CREDENTIAL_PATH_PATTERN.test(pathValue)) {
    return { success: false as const };
  }
  try {
    const supabase = createAdminClient();
    const { data: linkedApplication, error: lookupError } = await supabase.from('campaign_applications')
      .select('id').eq('official_credential_storage_path', pathValue).maybeSingle();
    if (lookupError || linkedApplication) return { success: false as const };
    const { error } = await supabase.storage.from('campaign_documents').remove([pathValue]);
    return { success: !error };
  } catch {
    return { success: false as const };
  }
}

export interface CampaignSubmissionResult {
  success: boolean;
  applicationNumber?: string;
  error?: string;
  category?: string;
  fullName?: string;
}

export interface CampaignStatusResult {
  success: boolean;
  error?: string;
  requiresSignIn?: boolean;
  data?: {
    applicationNumber: string;
    fullName: string;
    category: string;
    preferredRoleName: string;
    status: 'submitted' | 'under_review' | 'waitlisted' | 'approved' | 'rejected' | 'cancelled';
    submittedAt: string;
    assignedRoleName?: string | null;
    assignedZone?: string | null;
    assignedShift?: string | null;
    passSlug?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
  };
}

export interface CampaignPassData {
  success: boolean;
  error?: string;
  pass?: {
    idNumber: string;
    registrationId: string;
    passSlug: string;
    fullName: string;
    category: string;
    assignedRole: string;
    accreditationType: string;
    assignedMatch: string;
    assignedZone: string;
    assignedShift: string;
    validFrom: string;
    validUntil: string;
    signedPhotoUrl: string | null;
    issuedAt: string;
    eventVenue: string;
  };
}

export interface CampaignRoleItem {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string | null;
}

export interface CampaignAvailabilityMatch {
  id: string;
  title: string;
  start_date: string;
}

/**
 * Fetch active roles for a given category (or all categories)
 */
export async function getCampaignRoles(category?: string): Promise<CampaignRoleItem[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('campaign_roles')
      .select('id, name, code, category, description')
      .eq('is_active', true)
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.error('getCampaignRoles error:', error);
      return [];
    }
    return data as CampaignRoleItem[];
  } catch (err) {
    console.error('getCampaignRoles exception:', err);
    return [];
  }
}

/** Return only the public fields needed to let applicants mark match availability. */
export async function getCampaignAvailabilityMatches(): Promise<CampaignAvailabilityMatch[]> {
  try {
    const { data, error } = await createAdminClient().from('campaign_events')
      .select('id, title, start_date')
      .eq('is_active', true)
      .order('start_date', { ascending: true });
    if (error || !data) {
      console.error('Unable to load workforce availability matches');
      return [];
    }
    return data as CampaignAvailabilityMatch[];
  } catch {
    console.error('Unable to load workforce availability matches');
    return [];
  }
}

/**
 * Submit campaign application with strict server-side validation and field allowlisting.
 * Clients cannot control application_status, assigned roles/zones/shifts, or registration IDs.
 */
export async function submitCampaignApplication(formData: FormData): Promise<CampaignSubmissionResult> {
  const trace = createPerformanceTrace('registration.workforce');
  let photoStoragePath: string | null = null;
  let mediaAuthorisationStoragePath: string | null = null;
  let officialCredentialStoragePath: string | null = null;
  let mediaAuthorisationBytes: Buffer | null = null;
  let officialCredentialBytes: Buffer | null = null;
  let uploadedStoragePaths: string[] = [];
  try {
    const payloadError = validateSubmissionFormData(formData);
    if (payloadError) return { success: false, error: payloadError };
    const discardApplicantDocuments = async () => {
      if (mediaAuthorisationStoragePath) await discardCampaignMediaAuthorisationUpload(mediaAuthorisationStoragePath);
      if (officialCredentialStoragePath) await discardOfficialCredentialUpload(officialCredentialStoragePath);
      uploadedStoragePaths = [];
    };
    const readText = (name: string) => {
      const value = formData.get(name);
      return typeof value === 'string' ? value.trim() : '';
    };
    const idempotencyKey = readText('idempotencyKey').toLowerCase();
    const fullName = readText('fullName');
    const rawPhone = readText('phone');
    const phone = normalizeWorkforcePhone(rawPhone);
    const email = readText('email').toLowerCase();
    const category = readText('category').toLowerCase();
    const preferredRoleId = readText('preferredRoleId');
    const otherRole = readText('otherRole');
    const organisation = readText('organisation');
    const organisationOther = readText('organisationOther');
    const designation = readText('designation');
    const availabilityMode = readText('availabilityMode');
    const availabilityMatchValues = formData.getAll('availabilityMatchId');
    const availabilityMatchIds = availabilityMatchValues
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
    const mediaAccessValues = formData.getAll('mediaAccessType');
    const mediaAccessTypes = mediaAccessValues
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);
    const mediaOutlet = readText('mediaOutlet');
    const mediaOrganisationType = readText('mediaOrganisationType');
    const mediaDesignation = readText('mediaDesignation');
    const portfolioUrlInput = readText('portfolioUrl');
    const professionalBody = readText('professionalBody');
    const professionalQualification = readText('professionalQualification');
    const professionalRegistrationNumber = readText('professionalRegistrationNumber');
    const professionalExperience = readText('professionalExperience');
    const conflictOfInterestAnswer = readText('conflictOfInterest');
    const conflictDetails = readText('conflictDetails');
    const technicalSpecialty = readText('technicalSpecialty');
    const experience = readText('experience');
    const crewWorkArrangement = readText('crewWorkArrangement');
    const crewOrganisation = readText('crewOrganisation');
    const crewLeadName = readText('crewLeadName');
    const rawCrewLeadPhone = readText('crewLeadPhone');
    const crewLeadPhone = normalizeWorkforcePhone(rawCrewLeadPhone);
    const termsAccepted = formData.get('termsAccepted') === 'on' || formData.get('termsAccepted') === 'true';
    const photoFile = formData.get('photo');
    const mediaAuthorisationPath = readText('mediaAuthorisationPath');
    const officialCredentialPath = readText('officialCredentialPath');

    const departments = ['ahibi', 'volunteer', 'media', 'crew', 'management', 'officials', 'medical'];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return { success: false, error: 'Refresh the form and try submitting again.' };
    }
    if (fullName.length < 2 || fullName.length > 255) {
      return { success: false, error: 'Enter your full name (2 to 255 characters).' };
    }
    if (!/^[0-9\s()+.-]+$/.test(rawPhone) || !/^\d{10}$/.test(phone)) {
      return { success: false, error: 'Enter a valid 10-digit mobile number.' };
    }
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Enter a valid email address.' };
    }
    if (!departments.includes(category)) {
      return { success: false, error: 'Select one of the seven available departments.' };
    }
    if (!['all', 'selected'].includes(availabilityMode)) {
      return { success: false, error: 'Choose your match availability.' };
    }
    if (availabilityMatchValues.some((value) => typeof value !== 'string')
      || availabilityMatchValues.length > 10
      || availabilityMatchIds.length !== availabilityMatchValues.length
      || new Set(availabilityMatchIds).size !== availabilityMatchIds.length) {
      return { success: false, error: 'Choose valid available matches.' };
    }
    if (availabilityMode === 'selected' && availabilityMatchIds.length === 0) {
      return { success: false, error: 'Select at least one match or choose another availability option.' };
    }
    if (availabilityMode !== 'selected' && availabilityMatchIds.length > 0) {
      return { success: false, error: 'Match selections are only valid with selected-match availability.' };
    }
    if (availabilityMatchIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      return { success: false, error: 'Choose valid available matches.' };
    }
    if (mediaAccessValues.some((value) => typeof value !== 'string')
      || mediaAccessValues.length > MEDIA_ACCESS_TYPES.length
      || mediaAccessTypes.length !== mediaAccessValues.length
      || new Set(mediaAccessTypes).size !== mediaAccessTypes.length
      || mediaAccessTypes.some((value) => !MEDIA_ACCESS_TYPES.includes(value as (typeof MEDIA_ACCESS_TYPES)[number]))) {
      return { success: false, error: 'Choose valid media access areas.' };
    }
    if (category === 'media' && mediaAccessTypes.length === 0) {
      return { success: false, error: 'Select at least one access area for your accreditation request.' };
    }
    if (category !== 'media' && mediaAccessTypes.length > 0) {
      return { success: false, error: 'Media access areas are only available for Press and Media registrations.' };
    }
    if (category === 'media' && !MEDIA_ORGANISATION_TYPE_CODES.includes(mediaOrganisationType as (typeof MEDIA_ORGANISATION_TYPE_CODES)[number])) {
      return { success: false, error: 'Choose a valid type of media organisation.' };
    }
    if (category !== 'media' && (mediaOrganisationType || mediaOutlet || mediaDesignation || portfolioUrlInput || mediaAuthorisationPath)) {
      return { success: false, error: 'Media details are only valid for Press and Media registrations.' };
    }
    if (category === 'media' && (mediaDesignation.length < 2 || mediaDesignation.length > 255)) {
      return { success: false, error: 'Enter your designation or role (2 to 255 characters).' };
    }
    if (category !== 'media' && mediaDesignation) {
      return { success: false, error: 'Media designations are only valid for Press and Media registrations.' };
    }
    if (!termsAccepted) {
      return { success: false, error: 'Confirm that the submitted information is correct.' };
    }
    if (!(photoFile instanceof File) || photoFile.size < 1 || photoFile.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Upload a JPG, JPEG or PNG photograph no larger than 5 MB.' };
    }
    if (category === 'media' && !MEDIA_AUTHORISATION_PATH_PATTERN.test(mediaAuthorisationPath)) {
      return { success: false, error: 'Upload an official media ID card or authorisation letter.' };
    }
    if (category !== 'media' && mediaAuthorisationPath) {
      return { success: false, error: 'Media authorisation documents are only accepted for Press and Media registrations.' };
    }
    if (category === 'officials' && !OFFICIAL_CREDENTIAL_PATH_PATTERN.test(officialCredentialPath) && officialCredentialPath) {
      return { success: false, error: 'Upload a valid match-official qualification document.' };
    }
    if (category !== 'officials' && officialCredentialPath) {
      return { success: false, error: 'Qualification documents are only accepted for Match Officials registrations.' };
    }
    if (category === 'management') {
      const organisations = [
        'Chümoukedima District Football Association (CDFA)',
        'Department of Youth Resources & Sports',
        'Others',
      ];
      if (!organisations.includes(organisation) || designation.length < 2 || designation.length > 255) {
        return { success: false, error: 'Management applicants must select an organisation and enter a designation.' };
      }
      if (organisation === 'Others' && (organisationOther.length < 2 || organisationOther.length > 255)) {
        return { success: false, error: 'Please specify the management organisation.' };
      }
      if (organisation !== 'Others' && organisationOther) {
        return { success: false, error: 'Only specify an organisation name when selecting Others.' };
      }
      if (preferredRoleId) {
        return { success: false, error: 'Management registrations do not use a role selection.' };
      }
    } else if (organisation || organisationOther || designation) {
      return { success: false, error: 'Management details are only accepted for Management registrations.' };
    }

    let portfolioUrl: string | null = null;
    if (category === 'media') {
      if (mediaOutlet.length < 2 || mediaOutlet.length > 255) {
        return { success: false, error: 'Enter the name of your media organisation or publication (2 to 255 characters).' };
      }
      if (portfolioUrlInput.length > 2048) {
        return { success: false, error: 'Keep the public work link within 2,048 characters.' };
      }
      if (portfolioUrlInput) {
        try {
          const parsedUrl = new URL(portfolioUrlInput);
          if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
            return { success: false, error: 'Enter a public HTTP or HTTPS portfolio link.' };
          }
          portfolioUrl = parsedUrl.toString();
        } catch {
          return { success: false, error: 'Enter a valid public portfolio link.' };
        }
      }
    }
    if (category === 'officials'
      && (professionalBody.length < 2 || professionalBody.length > 255
        || professionalQualification.length < 2 || professionalQualification.length > 255
        || professionalRegistrationNumber.length > 100
        || professionalExperience.length < 2 || professionalExperience.length > 2000
        || !['yes', 'no'].includes(conflictOfInterestAnswer)
        || (conflictOfInterestAnswer === 'yes' && (conflictDetails.length < 2 || conflictDetails.length > 2000))
        || (conflictOfInterestAnswer === 'no' && conflictDetails))) {
      return { success: false, error: 'Check your association, qualification, officiating experience, and conflict-of-interest declaration.' };
    }
    if (category !== 'officials' && (professionalExperience || conflictOfInterestAnswer || conflictDetails)) {
      return { success: false, error: 'Match-official details are only accepted for Match Officials registrations.' };
    }
    if (!['officials', 'medical'].includes(category)
      && (professionalBody || professionalQualification || professionalRegistrationNumber)) {
      return { success: false, error: 'Professional qualification details are only accepted for Medical Team and Match Officials registrations.' };
    }
    if (category === 'medical'
      && (professionalQualification.length < 2 || professionalQualification.length > 255
        || professionalBody.length > 255 || professionalRegistrationNumber.length > 100)) {
      return { success: false, error: 'Medical team members must enter their professional qualification.' };
    }
    if (category === 'crew'
      && (technicalSpecialty.length > 255 || experience.length > 2000
        || !['organisation', 'independent'].includes(crewWorkArrangement)
        || (crewWorkArrangement === 'organisation'
          && (crewOrganisation.length < 2 || crewOrganisation.length > 255
            || crewLeadName.length < 2 || crewLeadName.length > 255
            || !/^[0-9\s()+.-]+$/.test(rawCrewLeadPhone)
            || !/^\d{10}$/.test(crewLeadPhone)))
        || (crewWorkArrangement === 'independent' && (crewOrganisation || crewLeadName || crewLeadPhone)))) {
      return { success: false, error: 'Enter a valid Crew work arrangement and, when organisation-backed, its crew lead contact.' };
    }
    if (category !== 'crew' && (crewWorkArrangement || crewOrganisation || crewLeadName || crewLeadPhone)) {
      return { success: false, error: 'Crew affiliation details are only accepted for Crew registrations.' };
    }
    if (category !== 'crew' && (technicalSpecialty || experience)) {
      return { success: false, error: 'Technical specialty and experience details are only accepted for Crew registrations.' };
    }

    await trace.measure('rate_limits', () => Promise.all([
      rateLimitCampaignRequestIp('submit-ip', 10),
      campaignRateLimit('submit-phone', phone, 5),
      campaignRateLimit('submit-email', email, 5),
    ]));

    const supabase = createAdminClient();
    if (preferredRoleId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(preferredRoleId)) {
      return { success: false, error: 'Select a valid role for your department.' };
    }
    const roleValidation = await trace.measure('role_validation', async () => {
      const roleQuery = supabase.from('campaign_roles')
        .select('id, name, code, category')
        .eq('category', category)
        .eq('is_active', true);

      if (category === 'management') {
        const result = await roleQuery.eq('code', 'management_role').maybeSingle();
        return {
          roleRecord: result.data,
          roleQueryFailed: Boolean(result.error),
          roleRequiredButMissing: false,
        };
      }
      if (preferredRoleId) {
        const result = await roleQuery.eq('id', preferredRoleId).maybeSingle();
        return {
          roleRecord: result.data,
          roleQueryFailed: Boolean(result.error),
          roleRequiredButMissing: false,
        };
      }

      const { data, error } = await supabase.from('campaign_roles')
        .select('id')
        .eq('category', category)
        .eq('is_active', true)
        .limit(1);
      return {
        roleRecord: null,
        roleQueryFailed: Boolean(error),
        roleRequiredButMissing: !error && Boolean(data?.length),
      };
    });

    const { roleRecord, roleQueryFailed, roleRequiredButMissing } = roleValidation;
    if (roleQueryFailed) {
      return { success: false, error: 'Department roles could not be checked. Please try again.' };
    }
    if (roleRequiredButMissing) {
      return { success: false, error: 'Select a role for your department.' };
    }
    if (preferredRoleId && (!roleRecord || roleRecord.category !== category)) {
      return { success: false, error: 'The selected role is not available in that department.' };
    }

    if (availabilityMode === 'selected') {
      const { data: availableMatches, error: matchError } = await supabase.from('campaign_events')
        .select('id')
        .eq('is_active', true)
        .in('id', availabilityMatchIds);
      if (matchError || !availableMatches || availableMatches.length !== availabilityMatchIds.length) {
        return { success: false, error: 'One or more selected matches are no longer available. Refresh and choose again.' };
      }
    }

    const isOtherRole = Boolean(roleRecord && (roleRecord.code.endsWith('_others') || roleRecord.name === 'Others'));
    if (isOtherRole && (otherRole.length < 2 || otherRole.length > 255)) {
      return { success: false, error: 'Please specify your role in 2 to 255 characters.' };
    }
    if (!isOtherRole && otherRole) {
      return { success: false, error: 'A role description is only accepted when Others is selected.' };
    }

    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    const isPng = photoBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = photoBuffer[0] === 255 && photoBuffer[1] === 216 && photoBuffer[2] === 255;
    if (!isPng && !isJpeg) {
      return { success: false, error: 'The photograph must be a valid JPG, JPEG or PNG file.' };
    }
    const imageType = isPng ? 'png' : 'jpeg';

    if (category === 'media') {
      const { data: existingDocument, error: existingDocumentError } = await supabase.from('campaign_applications')
        .select('id, idempotency_key').eq('media_authorisation_storage_path', mediaAuthorisationPath).maybeSingle();
      if (existingDocumentError || (existingDocument && existingDocument.idempotency_key !== idempotencyKey)) {
        return { success: false, error: 'Choose a new media ID card or authorisation letter upload.' };
      }
      const { data: documentBlob, error: documentDownloadError } = await supabase.storage
        .from('campaign_documents').download(mediaAuthorisationPath);
      if (documentDownloadError || !documentBlob || documentBlob.size < 1 || documentBlob.size > 10 * 1024 * 1024) {
        return { success: false, error: 'The media ID card or authorisation letter upload is unavailable or exceeds 10 MB.' };
      }
      const documentBuffer = Buffer.from(await documentBlob.arrayBuffer());
      const documentIsPng = documentBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const documentIsJpeg = documentBuffer[0] === 255 && documentBuffer[1] === 216 && documentBuffer[2] === 255;
      const documentIsPdf = documentBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
      const expectedExtension = mediaAuthorisationPath.split('.').pop()?.toLowerCase();
      const verifiedExtension = documentIsPdf ? 'pdf' : documentIsPng ? 'png' : documentIsJpeg ? 'jpeg' : '';
      if (!verifiedExtension || verifiedExtension !== expectedExtension) {
        return { success: false, error: 'The media ID card or authorisation letter must be a valid PDF, JPG, JPEG or PNG file.' };
      }
      mediaAuthorisationStoragePath = mediaAuthorisationPath;
      mediaAuthorisationBytes = documentBuffer;
      uploadedStoragePaths.push(mediaAuthorisationPath);
    }

    if (category === 'officials' && officialCredentialPath) {
      const { data: existingDocument, error: existingDocumentError } = await supabase.from('campaign_applications')
        .select('id, idempotency_key').eq('official_credential_storage_path', officialCredentialPath).maybeSingle();
      if (existingDocumentError || (existingDocument && existingDocument.idempotency_key !== idempotencyKey)) {
        return { success: false, error: 'Choose a new qualification document upload.' };
      }
      const { data: documentBlob, error: documentDownloadError } = await supabase.storage
        .from('campaign_documents').download(officialCredentialPath);
      if (documentDownloadError || !documentBlob || documentBlob.size < 1 || documentBlob.size > 10 * 1024 * 1024) {
        return { success: false, error: 'The qualification document is unavailable or exceeds 10 MB.' };
      }
      const documentBuffer = Buffer.from(await documentBlob.arrayBuffer());
      const documentIsPng = documentBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const documentIsJpeg = documentBuffer[0] === 255 && documentBuffer[1] === 216 && documentBuffer[2] === 255;
      const documentIsPdf = documentBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
      const expectedExtension = officialCredentialPath.split('.').pop()?.toLowerCase();
      const verifiedExtension = documentIsPdf ? 'pdf' : documentIsPng ? 'png' : documentIsJpeg ? 'jpeg' : '';
      if (!verifiedExtension || verifiedExtension !== expectedExtension) {
        return { success: false, error: 'The qualification document must be a valid PDF, JPG, JPEG or PNG file.' };
      }
      officialCredentialStoragePath = officialCredentialPath;
      officialCredentialBytes = documentBuffer;
      uploadedStoragePaths.push(officialCredentialPath);
    }

    const idempotencyRequestHash = createHash('sha256').update(JSON.stringify({
      fullName, phone, email, category, preferredRoleId, otherRole,
      organisation, organisationOther, designation, availabilityMode,
      availabilityMatchIds: [...availabilityMatchIds].sort(), mediaAccessTypes: [...mediaAccessTypes].sort(),
      mediaOutlet, mediaOrganisationType, mediaDesignation, portfolioUrl: portfolioUrl || portfolioUrlInput,
      professionalBody, professionalQualification, professionalRegistrationNumber, professionalExperience,
      conflictOfInterestAnswer, conflictDetails, technicalSpecialty, experience,
      crewWorkArrangement, crewOrganisation, crewLeadName, crewLeadPhone, termsAccepted,
      photo: createHash('sha256').update(photoBuffer).digest('hex'),
      mediaAuthorisation: mediaAuthorisationBytes ? createHash('sha256').update(mediaAuthorisationBytes).digest('hex') : null,
      officialCredential: officialCredentialBytes ? createHash('sha256').update(officialCredentialBytes).digest('hex') : null,
    })).digest('hex');

    const { data: previousSubmission, error: previousSubmissionError } = await supabase.from('campaign_applications')
      .select('id, application_number, full_name, category, phone, email, idempotency_request_hash, media_authorisation_storage_path, official_credential_storage_path')
      .eq('idempotency_key', idempotencyKey).maybeSingle();
    if (previousSubmissionError) {
      console.error('Workforce idempotency check failed', { code: previousSubmissionError.code || 'UNKNOWN' });
      await discardApplicantDocuments();
      return { success: false, error: 'Registration could not be confirmed. Please try again later.' };
    }
    if (previousSubmission) {
      if (previousSubmission.idempotency_request_hash !== idempotencyRequestHash) {
        await discardApplicantDocuments();
        return { success: false, error: 'This submission was already completed with different details. Refresh the form before starting another registration.' };
      }
      if (mediaAuthorisationPath && mediaAuthorisationPath !== previousSubmission.media_authorisation_storage_path) {
        await discardCampaignMediaAuthorisationUpload(mediaAuthorisationPath);
      }
      if (officialCredentialPath && officialCredentialPath !== previousSubmission.official_credential_storage_path) {
        await discardOfficialCredentialUpload(officialCredentialPath);
      }
      uploadedStoragePaths = [];
      return {
        success: true,
        applicationNumber: previousSubmission.application_number,
        fullName: previousSubmission.full_name,
        category: previousSubmission.category,
      };
    }

    const [phoneClaim, emailClaim] = await Promise.all([
      supabase.from('workforce_registration_identity_claims').select('application_id')
        .eq('identity_kind', 'phone').eq('normalized_value', phone).maybeSingle(),
      supabase.from('workforce_registration_identity_claims').select('application_id')
        .eq('identity_kind', 'email').eq('normalized_value', email).maybeSingle(),
    ]);
    if (phoneClaim.error || emailClaim.error) {
      console.error('Workforce identity check failed', { code: phoneClaim.error?.code || emailClaim.error?.code || 'UNKNOWN' });
      await discardApplicantDocuments();
      return { success: false, error: 'Registration could not be verified. Please try again later.' };
    }
    if (phoneClaim.data || emailClaim.data) {
      await discardApplicantDocuments();
      return { success: false, error: 'A registration using these contact details has already been submitted. Contact the registration team if you need to make a change.' };
    }

    const { data: registrationId, error: registrationIdError } = await trace.measure('registration_id', () =>
      supabase.rpc('next_workforce_registration_id', { p_department: category }));
    if (registrationIdError || typeof registrationId !== 'string'
      || !/^NUSC-(AHB|VOL|MED|CRW|MGT|OFC|HLT)-\d{3,}$/.test(registrationId)) {
      console.error('Workforce registration ID allocation failed', { code: registrationIdError?.code || 'INVALID_RESPONSE' });
      await discardApplicantDocuments();
      return { success: false, error: 'Registration is temporarily unavailable. Please try again later.' };
    }

    photoStoragePath = registrationId + '/photo.' + imageType;

    const { error: uploadError } = await trace.measure('photo_upload', () => supabase.storage
      .from('campaign_documents')
      .upload(photoStoragePath!, photoBuffer, {
        contentType: 'image/' + imageType,
        upsert: false,
      }));
    if (uploadError) {
      console.error('Workforce photo upload failed');
      await discardApplicantDocuments();
      return { success: false, error: 'Photograph upload failed. Please try again.' };
    }
    uploadedStoragePaths.push(photoStoragePath);

    const effectiveOrganisation = organisation === 'Others' ? organisationOther : organisation;
    const availabilitySummary = availabilityMode === 'all'
      ? 'Available for all 10 NUSC home matches'
      : 'Available for selected NUSC home matches';
    const { error: dbError } = await trace.measure('record_insert', () => supabase.from('campaign_applications').insert({
      application_number: registrationId,
      full_name: fullName,
      date_of_birth: null,
      gender: null,
      phone,
      email,
      address: null,
      photo_storage_path: photoStoragePath,
      idempotency_key: idempotencyKey,
      idempotency_request_hash: idempotencyRequestHash,
      media_authorisation_storage_path: mediaAuthorisationStoragePath,
      official_credential_storage_path: officialCredentialStoragePath,
      category,
      preferred_role_id: roleRecord?.id ?? null,
      other_role: isOtherRole ? otherRole : null,
      organisation: category === 'management' ? effectiveOrganisation : null,
      organisation_other: category === 'management' && organisation === 'Others' ? organisationOther : null,
      designation: category === 'management' ? designation : category === 'media' ? mediaDesignation : null,
      media_outlet: category === 'media' ? mediaOutlet || null : null,
      media_organisation_type: category === 'media' ? mediaOrganisationType : null,
      portfolio_url: category === 'media' ? portfolioUrl : null,
      media_access_types: category === 'media' ? mediaAccessTypes : [],
      professional_body: ['officials', 'medical'].includes(category) ? professionalBody || null : null,
      professional_qualification: ['officials', 'medical'].includes(category) ? professionalQualification : null,
      professional_registration_number: ['officials', 'medical'].includes(category)
        ? professionalRegistrationNumber || null : null,
      professional_experience: category === 'officials' ? professionalExperience : null,
      conflict_of_interest: category === 'officials' ? conflictOfInterestAnswer === 'yes' : null,
      conflict_details: category === 'officials' && conflictOfInterestAnswer === 'yes' ? conflictDetails : null,
      technical_specialty: category === 'crew' ? technicalSpecialty || null : null,
      experience: category === 'crew' ? experience || null : null,
      crew_work_arrangement: category === 'crew' ? crewWorkArrangement : null,
      crew_organisation: category === 'crew' && crewWorkArrangement === 'organisation' ? crewOrganisation : null,
      crew_lead_name: category === 'crew' && crewWorkArrangement === 'organisation' ? crewLeadName : null,
      crew_lead_phone: category === 'crew' && crewWorkArrangement === 'organisation' ? crewLeadPhone : null,
      availability: availabilitySummary,
      availability_mode: availabilityMode,
      availability_match_ids: availabilityMatchIds,
      reason_for_joining: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      application_status: 'submitted',
      terms_accepted_at: new Date().toISOString(),
    }));

    if (dbError) {
      const { error: cleanupError } = await supabase.storage.from('campaign_documents').remove(uploadedStoragePaths);
      if (cleanupError) throw new Error('Unable to clean up workforce uploads after registration failure');
      uploadedStoragePaths = [];
      photoStoragePath = null;
      mediaAuthorisationStoragePath = null;
      officialCredentialStoragePath = null;
      const uniqueConstraint = typeof dbError.message === 'string'
        ? dbError.message.match(/unique constraint ["']([^"']+)["']/i)?.[1]
        : undefined;
      console.error('Workforce registration insert failed', {
        code: dbError.code,
        constraint: uniqueConstraint,
      });
      if (dbError.code === '23505') {
        const { data: replay, error: replayError } = await supabase.from('campaign_applications')
          .select('application_number, full_name, category, idempotency_request_hash')
          .eq('idempotency_key', idempotencyKey).maybeSingle();
        if (!replayError && replay?.idempotency_request_hash === idempotencyRequestHash) {
          return {
            success: true,
            applicationNumber: replay.application_number,
            fullName: replay.full_name,
            category: replay.category,
          };
        }
        const [phoneConflict, emailConflict] = await Promise.all([
          supabase.from('workforce_registration_identity_claims').select('application_id')
            .eq('identity_kind', 'phone').eq('normalized_value', phone).maybeSingle(),
          supabase.from('workforce_registration_identity_claims').select('application_id')
            .eq('identity_kind', 'email').eq('normalized_value', email).maybeSingle(),
        ]);
        if (!phoneConflict.error && !emailConflict.error && (phoneConflict.data || emailConflict.data)) {
          return { success: false, error: 'A registration using these contact details has already been submitted. Contact the registration team if you need to make a change.' };
        }
        return { success: false, error: 'Registration could not be saved. Please try again later.' };
      }
      return { success: false, error: 'Registration could not be saved. Please try again later.' };
    }

    uploadedStoragePaths = [];

    return {
      success: true,
      applicationNumber: registrationId,
      fullName,
      category,
    };
  } catch (error) {
    if (uploadedStoragePaths.length > 0) {
      try {
        await createAdminClient().storage.from('campaign_documents').remove(uploadedStoragePaths);
      } catch {
        // A storage cleanup failure does not expose private upload details.
      }
    }
    console.error('Workforce registration failed:', error);
    return {
      success: false,
      error: error instanceof CampaignRateLimitError || error instanceof CampaignServiceError
        ? error.message : 'Unable to submit your registration. Please try again.',
    };
  } finally {
    trace.finish();
  }
}
export async function getCampaignSessionEmail(): Promise<string | null> {
  try {
    const session = await createServerClient();
    const { data: { user }, error } = await session.auth.getUser();
    return !error && user?.email_confirmed_at ? user.email?.toLowerCase() || null : null;
  } catch { return null; }
}

// Always return the same response for matching and nonmatching applicants.
export async function requestCampaignAccess(applicationNumber: string, email: string) {
  const message = 'If these details match an application, a sign-in link will arrive in the registered email. Open it in this browser.';
  try {
    const number = typeof applicationNumber === 'string' ? applicationNumber.trim().toUpperCase() : '';
    const contact = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^NUSC-(?:CMP-\d{4}-[A-Z0-9]{5,32}|(?:AHB|VOL|CRW|MGT|OFC|HLT)-\d{3,})$/.test(number) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      return { success: false, error: 'Enter your application number and registered email.' };
    }
    await campaignRateLimit('access-application', number, 3);
    await campaignRateLimit('access-email', contact, 3);
    const origin = campaignSiteOrigin();
    const { data, error } = await createAdminClient().from('campaign_applications')
      .select('id').eq('application_number', number).eq('email', contact).maybeSingle();
    if (error) throw new Error('Application lookup unavailable');
    if (data) {
      const session = await createServerClient();
      const { error: deliveryError } = await session.auth.signInWithOtp({
        email: contact,
        options: { shouldCreateUser: true, emailRedirectTo: `${origin}/campaign/auth/callback?num=${encodeURIComponent(number)}` },
      });
      // Provider/account existence errors must not reveal which applications exist.
      if (deliveryError) console.error('Campaign sign-in email could not be sent');
    }
    return { success: true, message };
  } catch (error) {
    return { success: false, error: error instanceof CampaignRateLimitError || error instanceof CampaignServiceError
      ? error.message : 'Email access is temporarily unavailable. Please try again later.' };
  }
}

/** Status and pass links require a server-verified session for the applicant email. */
export async function checkCampaignStatus(
  applicationNumber: string
): Promise<CampaignStatusResult> {
  try {
    const cleanAppNum = typeof applicationNumber === 'string' ? applicationNumber.trim().toUpperCase() : '';
    const email = await getCampaignSessionEmail();
    if (!email) return { success: false, requiresSignIn: true, error: 'Verify your registered email to view this application.' };
    await campaignRateLimit('status-email', email, 30);

    if (!/^NUSC-(?:CMP-\d{4}-[A-Z0-9]{5,32}|(?:AHB|VOL|CRW|MGT|OFC|HLT)-\d{3,})$/.test(cleanAppNum)) {
      return { success: false, error: 'Please enter your application number.' };
    }

    const supabase = createAdminClient();

    // Query application
    const { data: app, error: appError } = await supabase
      .from('campaign_applications')
      .select(`
        id,
        application_number,
        full_name,
        category,
        application_status,
        submitted_at,
        assigned_zone,
        assigned_shift,
        preferred_role:campaign_roles!preferred_role_id (name, code),
        assigned_role:campaign_roles!assigned_role_id (name, code),
        other_role
      `)
      .eq('application_number', cleanAppNum)
      .eq('email', email)
      .maybeSingle();

    if (appError || !app) {
      return {
        success: false,
        error: 'No application found with the provided details. Please verify your Application Number.',
      };
    }

    // Check if ID pass has been issued (if approved)
    let passSlug: string | null = null;
    let validFrom: string | null = null;
    let validUntil: string | null = null;

    if (app.application_status === 'approved') {
      const { data: idRecord } = await supabase
        .from('campaign_ids')
        .select('pass_slug, valid_from, valid_until, is_active, revoked_at')
        .eq('application_id', app.id)
        .eq('is_active', true)
        .is('revoked_at', null)
        .maybeSingle();

      if (idRecord) {
        passSlug = idRecord.pass_slug;
        validFrom = idRecord.valid_from;
        validUntil = idRecord.valid_until;
      }
    }

    const preferredRoleName = campaignRoleLabel(app.preferred_role, app.other_role);
    const assignedRoleName = app.assigned_role ? campaignRoleLabel(app.assigned_role, app.other_role) : null;

    return {
      success: true,
      data: {
        applicationNumber: app.application_number,
        fullName: app.full_name,
        category: app.category,
        preferredRoleName,
        status: app.application_status,
        submittedAt: app.submitted_at,
        assignedRoleName,
        assignedZone: app.assigned_zone,
        assignedShift: app.assigned_shift,
        passSlug,
        validFrom,
        validUntil,
      },
    };
  } catch (err) {
    console.error('checkCampaignStatus exception:', err);
    return { success: false, error: err instanceof CampaignRateLimitError || err instanceof CampaignServiceError
      ? err.message : 'System error querying application status. Please try again later.' };
  }
}

/**
 * Fetch digital ID pass presentation details using pass_slug.
 * Exposes ONLY minimal credential data: full name, role, zone, shift, validity, and a 15-min signed photo URL.
 * NEVER leaks DOB, home address, phone, email, emergency contacts, or internal notes.
 */
export async function getCampaignPass(passSlug: string): Promise<CampaignPassData> {
  try {
    const cleanSlug = (passSlug || '').trim();
    if (!cleanSlug) {
      return { success: false, error: 'Pass token parameter is missing.' };
    }

    const supabase = createAdminClient();

    const { data: idRecord, error: idError } = await supabase
      .from('campaign_ids')
      .select(`
        id,
        id_number,
        pass_slug,
        valid_from,
        valid_until,
        issued_at,
        is_active,
        revoked_at,
        application:campaign_applications!application_id (
          id,
          application_number,
          full_name,
          category,
          photo_storage_path,
          event_id,
          assigned_zone,
          assigned_shift,
          other_role,
          designation,
          application_status,
          assigned_role:campaign_roles!assigned_role_id (name, code),
          event:campaign_events!event_id (title, venue)
        )
      `)
      .eq('pass_slug', cleanSlug)
      .maybeSingle();

  if (idError || !idRecord) {
      return { success: false, error: 'Event ID pass not found or invalid pass token.' };
    }

    if (!idRecord.is_active || idRecord.revoked_at) {
      return { success: false, error: 'This Event ID pass has been revoked and is no longer valid.' };
    }

    const app = Array.isArray(idRecord.application) ? idRecord.application[0] : idRecord.application;
    if (!app || app.application_status !== 'approved') {
      return { success: false, error: 'This credential is not in approved status.' };
    }
    const now = Date.now();
    if (now < new Date(idRecord.valid_from).getTime() || now > new Date(idRecord.valid_until).getTime()) {
      return { success: false, error: 'This credential is outside its validity dates.' };
    }

    // Generate short-lived signed photo URL (15-minute expiration)
    let signedPhotoUrl: string | null = null;
    if (app.photo_storage_path) {
      const { data: signedData } = await supabase.storage
        .from('campaign_documents')
        .createSignedUrl(app.photo_storage_path, 900); // 15 mins
      signedPhotoUrl = signedData?.signedUrl || null;
    }

    const baseRole = campaignRoleLabel(app.assigned_role, app.other_role);
    const assignedRole = app.designation ? baseRole + ' · ' + app.designation : baseRole;
    const event = Array.isArray(app.event) ? app.event[0] : app.event;
    const eventVenue = event?.venue || 'ChÃ¼moukedima Football Stadium, Nagaland';

    return {
      success: true,
      pass: {
        idNumber: idRecord.id_number,
        registrationId: app.application_number,
        passSlug: idRecord.pass_slug,
        fullName: app.full_name,
        category: app.category,
        assignedRole,
        accreditationType: app.event_id ? 'Match-day pass' : 'Season pass',
        assignedMatch: event?.title || 'All 10 NUSC home matches',
        assignedZone: app.assigned_zone || 'Awaiting staff assignment',
        assignedShift: app.assigned_shift || 'Awaiting staff assignment',
        validFrom: idRecord.valid_from,
        validUntil: idRecord.valid_until,
        signedPhotoUrl,
        issuedAt: idRecord.issued_at,
        eventVenue,
      },
    };
  } catch (err) {
    console.error('getCampaignPass exception:', err);
    return { success: false, error: 'System error retrieving Event Pass credentials.' };
  }
}
