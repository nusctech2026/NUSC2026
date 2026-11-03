'use server';

import crypto from 'crypto';
import QRCode from 'qrcode';
import { getSupabaseAdminClient, assertStaffRole } from '../utils/supabaseServerClient';
import { createPerformanceTrace } from '@nusc/db/src/performance';

function normalizeWorkforcePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

export interface CampaignListFilters {
  category?: string;
  status?: string;
  roleId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 1. Overview Dashboard Statistics (Fast PostgreSQL aggregation)
 */
export async function getAdminCampaignStats() {
  await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc('get_campaign_dashboard_stats');
  if (error) {
    console.error('getAdminCampaignStats RPC error:', error);
    throw new Error('Failed to retrieve campaign statistics: ' + error.message);
  }
  return data;
}

/**
 * 2. Applications Listing with multi-criteria filtering, search & pagination
 */
export async function getCampaignApplicationsList(filters: CampaignListFilters = {}) {
  const trace = createPerformanceTrace('admin.campaign_applications_list');
  try {
    await trace.measure('authorize', () => assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']));
    const supabase = getSupabaseAdminClient();

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(10, filters.pageSize || 20));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('campaign_applications')
      .select(`
      id,
      application_number,
      full_name,
      phone,
      email,
      category,
      preferred_role_id,
      assigned_role_id,
      application_status,
      assigned_zone,
      assigned_shift,
      submitted_at,
      potential_duplicate,
      preferred_role:campaign_roles!preferred_role_id (name, code),
      assigned_role:campaign_roles!assigned_role_id (name, code),
      other_role
      `, { count: 'exact' });

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('application_status', filters.status);
    }

    if (filters.roleId && filters.roleId !== 'all') {
      query = query.eq('preferred_role_id', filters.roleId);
    }

    // Lightweight search logic (Application number, phone, email, or name)
    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      if (s.toUpperCase().startsWith('NUSC-')) {
        query = query.ilike('application_number', `%${s}%`);
      } else if (s.includes('@')) {
        query = query.ilike('email', `%${s}%`);
      } else if (/^\d+$/.test(s)) {
        query = query.ilike('phone', `%${s}%`);
      } else {
        query = query.ilike('full_name', `%${s}%`);
      }
    }

    query = query.order('submitted_at', { ascending: false }).range(from, to);

    const { data, count, error } = await trace.measure('query', () => query);
    if (error) {
      console.error('getCampaignApplicationsList error:', error);
      throw new Error('Failed to retrieve applications: ' + error.message);
    }

    return {
      applications: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } finally { trace.finish(); }
}

/**
 * 3. Detailed Applicant Profile Viewer
 */
export async function getCampaignApplicationDetail(applicationId: string) {
  const trace = createPerformanceTrace('admin.campaign_detail');
  try {
    await trace.measure('authorize', () => assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']));
    const supabase = getSupabaseAdminClient();

    const { data: app, error } = await trace.measure('application', () => supabase
      .from('campaign_applications')
      .select(`
        *,
        preferred_role:campaign_roles!preferred_role_id (name, code),
        assigned_role:campaign_roles!assigned_role_id (name, code)
      `)
      .eq('id', applicationId)
      .single());

    if (error || !app) {
      throw new Error('Applicant record not found');
    }

    // All reads follow authorization and the authoritative application lookup.
    // Return editor options in this action instead of two more authenticated actions.
    const [photo, mediaAuthorisationDocument, officialCredentialDocument, issued, roles, matches, changeHistory] = await trace.measure('related_records', () => Promise.all([
      app.photo_storage_path
        ? supabase.storage.from('campaign_documents').createSignedUrl(app.photo_storage_path, 1800)
        : Promise.resolve({ data: null, error: null }),
      app.category === 'media' && app.media_authorisation_storage_path
        ? supabase.storage.from('campaign_documents').createSignedUrl(app.media_authorisation_storage_path, 900, { download: true })
        : Promise.resolve({ data: null, error: null }),
      app.category === 'officials' && app.official_credential_storage_path
        ? supabase.storage.from('campaign_documents').createSignedUrl(app.official_credential_storage_path, 900, { download: true })
        : Promise.resolve({ data: null, error: null }),
      supabase.from('campaign_ids')
        .select('id, id_number, pass_slug, valid_from, valid_until, is_active, revoked_at')
        .eq('application_id', app.id).maybeSingle(),
      supabase.from('campaign_roles').select('id, name, code')
        .eq('category', app.category).eq('is_active', true).order('name'),
      supabase.from('campaign_events').select('id, title, venue, start_date, end_date, is_active')
        .order('start_date', { ascending: false }),
      supabase.from('campaign_application_change_history')
        .select('id, changed_at, changed_by, changed_fields')
        .eq('application_id', app.id).order('changed_at', { ascending: false }).limit(25),
    ]));
    if (issued.error || roles.error || matches.error || changeHistory.error) throw new Error('Unable to load applicant details');
    const idRecord = issued.data;

    return {
      ...app,
      signedPhotoUrl: photo.data?.signedUrl || null,
      signedMediaAuthorisationUrl: mediaAuthorisationDocument.data?.signedUrl || null,
      signedOfficialCredentialUrl: officialCredentialDocument.data?.signedUrl || null,
      roleOptions: roles.data || [],
      matches: matches.data || [],
      changeHistory: changeHistory.data || [],
      issuedId: idRecord ? {
        ...idRecord,
        isExpired: new Date(idRecord.valid_until).getTime() < Date.now(),
        isNotYetValid: new Date(idRecord.valid_from).getTime() > Date.now(),
      } : null,
    };
  } finally { trace.finish(); }
}

/** Permanently remove one application and its linked pass, scans, audit history, and uploaded documents. */
export async function deleteCampaignApplication(applicationId: string, confirmationNumber: string) {
  await assertStaffRole(['super_admin']);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) {
    throw new Error('Invalid application identifier');
  }

  const supabase = getSupabaseAdminClient();
  const { data: application, error: lookupError } = await supabase
    .from('campaign_applications')
    .select('id, application_number, photo_storage_path, media_authorisation_storage_path, official_credential_storage_path')
    .eq('id', applicationId)
    .maybeSingle();

  if (lookupError || !application) {
    throw new Error('Application was not found or could not be loaded');
  }
  if (typeof confirmationNumber !== 'string' || confirmationNumber.trim() !== application.application_number) {
    throw new Error('The registration ID confirmation did not match. Nothing was deleted.');
  }

  const documentPaths = [...new Set([
    application.photo_storage_path,
    application.media_authorisation_storage_path,
    application.official_credential_storage_path,
  ].filter((path): path is string => typeof path === 'string' && path.trim().length > 0))];

  // These references are stored by the registration flow. Reject malformed stored paths
  // before deleting the database row so a bad reference cannot target another object.
  if (documentPaths.some(path => path.startsWith('/') || path.includes('\\') || path.split('/').some(part => part === '.' || part === '..'))) {
    throw new Error('Application has an invalid document reference and cannot be deleted automatically');
  }

  const { data: deleted, error: deleteError } = await supabase
    .from('campaign_applications')
    .delete()
    .eq('id', application.id)
    .select('id')
    .maybeSingle();

  if (deleteError) {
    console.error('Campaign application deletion failed', {
      code: deleteError.code || 'DATABASE_ERROR',
      applicationNumber: application.application_number,
    });
    throw new Error('Application could not be deleted. Contact a campaign manager if this keeps happening.');
  }
  if (!deleted) throw new Error('Application was already deleted or is no longer available');

  let storageCleanupWarning = false;
  if (documentPaths.length > 0) {
    const { error: storageError } = await supabase.storage.from('campaign_documents').remove(documentPaths);
    if (storageError) {
      storageCleanupWarning = true;
      console.error('Campaign application was deleted but document cleanup failed', {
        code: storageError.statusCode || storageError.name || 'STORAGE_ERROR',
        applicationNumber: application.application_number,
      });
    }
  }

  return { success: true, applicationNumber: application.application_number, storageCleanupWarning };
}

/** Permanently remove a selected set of workforce applications and their linked records. */
export async function deleteCampaignApplications(applicationIds: string[], confirmationPhrase: string) {
  await assertStaffRole(['super_admin']);

  const maxBulkDeleteCount = 100;
  if (!Array.isArray(applicationIds) || applicationIds.length === 0 || applicationIds.length > maxBulkDeleteCount) {
    throw new Error(`Select between 1 and ${maxBulkDeleteCount} registrations to delete`);
  }
  if (applicationIds.some(id => typeof id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    throw new Error('One or more application identifiers are invalid');
  }

  const uniqueIds = [...new Set(applicationIds)];
  if (uniqueIds.length !== applicationIds.length) {
    throw new Error('Duplicate registrations were included in the selection');
  }
  if (typeof confirmationPhrase !== 'string' || confirmationPhrase.trim() !== `DELETE ${uniqueIds.length}`) {
    throw new Error('The bulk deletion confirmation did not match. Nothing was deleted.');
  }

  const supabase = getSupabaseAdminClient();
  const { data: applications, error: lookupError } = await supabase
    .from('campaign_applications')
    .select('id, application_number, photo_storage_path, media_authorisation_storage_path, official_credential_storage_path')
    .in('id', uniqueIds);

  if (lookupError || !applications || applications.length !== uniqueIds.length) {
    throw new Error('One or more selected registrations are unavailable. Refresh the list and select them again.');
  }

  const documentPathsByApplication = new Map<string, string[]>();
  for (const application of applications) {
    const documentPaths = [...new Set([
      application.photo_storage_path,
      application.media_authorisation_storage_path,
      application.official_credential_storage_path,
    ].filter((path): path is string => typeof path === 'string' && path.trim().length > 0))];

    // Validate every stored path before deleting any database rows.
    if (documentPaths.some(path => path.startsWith('/') || path.includes('\\') || path.split('/').some(part => part === '.' || part === '..'))) {
      throw new Error('A selected registration has an invalid document reference and cannot be deleted automatically');
    }
    documentPathsByApplication.set(application.id, documentPaths);
  }

  const { data: deletedApplications, error: deleteError } = await supabase
    .from('campaign_applications')
    .delete()
    .in('id', uniqueIds)
    .select('id');

  if (deleteError) {
    console.error('Campaign application bulk deletion failed', {
      code: deleteError.code || 'DATABASE_ERROR',
      requestedCount: uniqueIds.length,
    });
    throw new Error('Selected registrations could not be deleted. Contact a campaign manager if this keeps happening.');
  }

  const deletedIds = new Set((deletedApplications || []).map(application => application.id));
  if (deletedIds.size === 0) throw new Error('The selected registrations were already deleted or are no longer available');

  const documentPaths = [...new Set([...deletedIds].flatMap(id => documentPathsByApplication.get(id) || []))];
  let storageCleanupWarning = false;
  for (let offset = 0; offset < documentPaths.length; offset += 100) {
    try {
      const { error: storageError } = await supabase.storage.from('campaign_documents').remove(documentPaths.slice(offset, offset + 100));
      if (!storageError) continue;
      storageCleanupWarning = true;
      console.error('Campaign application bulk deletion document cleanup failed', {
        code: storageError.statusCode || storageError.name || 'STORAGE_ERROR',
        deletedCount: deletedIds.size,
      });
    } catch (storageError) {
      storageCleanupWarning = true;
      console.error('Campaign application bulk deletion document cleanup failed', {
        code: storageError instanceof Error ? storageError.name : 'STORAGE_ERROR',
        deletedCount: deletedIds.size,
      });
    }
  }

  return {
    success: true,
    deletedCount: deletedIds.size,
    alreadyUnavailableCount: uniqueIds.length - deletedIds.size,
    storageCleanupWarning,
  };
}

/**
 * 4. Update Application Status (submitted, under_review, waitlisted, approved, rejected, cancelled)
 */
export async function updateApplicationStatus(applicationId: string, newStatus: string, adminNotes?: string) {
  const staff = await assertStaffRole(newStatus === 'approved'
    ? ['super_admin', 'campaign_manager'] : ['super_admin', 'campaign_manager', 'reviewer']);
  if (!['submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'cancelled'].includes(newStatus)) {
    throw new Error('Invalid application status');
  }
  if (adminNotes && adminNotes.length > 4000) throw new Error('Keep notes within 4,000 characters');
  const { data, error } = await getSupabaseAdminClient().rpc('review_campaign_application', {
    p_application_id: applicationId, p_status: newStatus, p_actor: staff.email, p_notes: adminNotes ?? null,
  });
  if (error) {
    console.error('Campaign application review RPC failed', {
      code: error.code, message: error.message, hint: error.hint,
    });
    if (error.code === 'PGRST202') {
      throw new Error('Supabase could not resolve the approval function (PGRST202). Check that the admin app uses the same Supabase project as the campaign database, then refresh its API schema cache if needed.');
    }
    if (error.code === '42883') {
      throw new Error('PostgreSQL could not resolve the approval function or one of its dependencies (42883). Confirm both campaign workflow migrations are installed on the admin app’s Supabase project.');
    }
    throw new Error('The campaign status update failed. Check the admin server log for the database error, then retry.');
  }
  if (!data?.success) throw new Error('The database did not approve this status update. Confirm the applicant has an active role in their selected category.');
  return data;
}

/**
 * 5. Assign Role, Zone, and Shift to Candidate
 */
export async function assignRoleZoneShift(
  applicationId: string, assignedRoleId: string, assignedZone: string, assignedShift: string, eventId?: string | null
) {
  const staff = await assertStaffRole(['super_admin', 'campaign_manager']);
  const supabase = getSupabaseAdminClient();
  if (assignedZone.length > 100 || assignedShift.length > 100) throw new Error('Zone and shift must be at most 100 characters');
  const { data: app, error: appError } = await supabase.from('campaign_applications').select('category, other_role').eq('id', applicationId).single();
  if (appError || !app) throw new Error('Applicant not found');
  const { data: role, error: roleError } = await supabase.from('campaign_roles').select('id, code').eq('id', assignedRoleId)
    .eq('category', app.category).eq('is_active', true).single();
  if (roleError || !role) throw new Error('Choose an active role in this applicant category');
  if (role.code.endsWith('_others') && !app.other_role) throw new Error('This application has no specified Other role');
  if (eventId) {
    const { data: event, error } = await supabase.from('campaign_events').select('id').eq('id', eventId).eq('is_active', true).single();
    if (error || !event) throw new Error('Match is unavailable');
  }
  const { error } = await supabase.from('campaign_applications').update({
    assigned_role_id: role.id, assigned_zone: assignedZone.trim(), assigned_shift: assignedShift.trim(),
    ...(eventId !== undefined ? { event_id: eventId || null } : {}),
    last_updated_by: staff.email,
    updated_at: new Date().toISOString(),
  }).eq('id', applicationId);
  if (error) throw new Error('Unable to save assignment');
  return { success: true };
}

export async function updateCampaignRegistrationDetails(
  applicationId: string,
  input: {
    fullName: string;
    phone: string;
    email: string;
    otherRole: string;
    organisation: string;
    designation: string;
    availabilityMode: 'all' | 'selected';
    availabilityMatchIds: string[];
    mediaAccessTypes: string[];
    mediaOutlet: string;
    mediaOrganisationType: string;
    portfolioUrl: string;
    professionalBody: string;
    professionalQualification: string;
    professionalRegistrationNumber: string;
    professionalExperience: string;
    conflictOfInterest: string;
    conflictDetails: string;
    technicalSpecialty: string;
    experience: string;
    crewWorkArrangement: string;
    crewOrganisation: string;
    crewLeadName: string;
    crewLeadPhone: string;
  }
) {
  const staff = await assertStaffRole(['super_admin', 'campaign_manager']);
  if (!input || typeof input !== 'object') throw new Error('Enter valid registration details');
  const readText = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const fullName = readText(input.fullName);
  const phone = normalizeWorkforcePhone(readText(input.phone));
  const email = readText(input.email).toLowerCase();
  const otherRole = readText(input.otherRole);
  const organisation = readText(input.organisation);
  const designation = readText(input.designation);
  const availabilityMode = input.availabilityMode;
  const availabilityMatchIds = Array.isArray(input.availabilityMatchIds)
    ? input.availabilityMatchIds.filter((id): id is string => typeof id === 'string').map((id) => id.trim()).filter(Boolean)
    : [];
  const mediaAccessValues = Array.isArray(input.mediaAccessTypes) ? input.mediaAccessTypes : [];
  if (mediaAccessValues.some((value) => typeof value !== 'string')) {
    throw new Error('Choose valid media access areas');
  }
  const mediaAccessTypes = mediaAccessValues.map((value) => value.trim()).filter(Boolean);
  const mediaOutlet = readText(input.mediaOutlet);
  const mediaOrganisationType = readText(input.mediaOrganisationType);
  const portfolioUrlInput = readText(input.portfolioUrl);
  const professionalBody = readText(input.professionalBody);
  const professionalQualification = readText(input.professionalQualification);
  const professionalRegistrationNumber = readText(input.professionalRegistrationNumber);
  const professionalExperience = readText(input.professionalExperience);
  const conflictOfInterestAnswer = readText(input.conflictOfInterest);
  const conflictDetails = readText(input.conflictDetails);
  const technicalSpecialty = readText(input.technicalSpecialty);
  const experience = readText(input.experience);
  const crewWorkArrangement = readText(input.crewWorkArrangement);
  const crewOrganisation = readText(input.crewOrganisation);
  const crewLeadName = readText(input.crewLeadName);
  const crewLeadPhone = normalizeWorkforcePhone(readText(input.crewLeadPhone));
  if (fullName.length < 2 || fullName.length > 255 || !/^\d{10}$/.test(phone)
      || (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))) {
    throw new Error('Check the name, 10-digit phone number, and email address');
  }
  const allowedMediaAccessTypes = new Set([
    'media_press_seating',
    'photography_area',
    'press_conference_area',
    'mixed_zone_interview_area',
    'broadcast_video_coverage_area',
  ]);
  if (!['all', 'selected'].includes(availabilityMode)
      || availabilityMatchIds.length > 10
      || new Set(availabilityMatchIds).size !== availabilityMatchIds.length
      || (availabilityMode === 'selected' && availabilityMatchIds.length === 0)
      || (availabilityMode !== 'selected' && availabilityMatchIds.length > 0)) {
    throw new Error('Choose a valid match availability and match selection');
  }
  if (mediaAccessTypes.length > allowedMediaAccessTypes.size
      || new Set(mediaAccessTypes).size !== mediaAccessTypes.length
      || mediaAccessTypes.some((value) => !allowedMediaAccessTypes.has(value))) {
    throw new Error('Choose valid media access areas');
  }

  const supabase = getSupabaseAdminClient();
  const { data: app, error: appError } = await supabase.from('campaign_applications')
    .select('category, preferred_role_id, application_status, availability_match_ids, phone, email, idempotency_key, potential_duplicate')
    .eq('id', applicationId).single();
  if (appError || !app) throw new Error('Registration not found');
  if (app.idempotency_key && !email) {
    throw new Error('A registered email is required for new workforce submissions');
  }
  if (app.category === 'media' && mediaAccessTypes.length === 0) {
    throw new Error('Select at least one access area for the media accreditation request');
  }
  const allowedMediaOrganisationTypes = new Set([
    'kaki', 'print_media', 'press_media', 'broadcast_tv', 'digital_online_media', 'independent_freelance', 'other',
  ]);
  if (app.category === 'media' && !allowedMediaOrganisationTypes.has(mediaOrganisationType)) {
    throw new Error('Choose a valid type of media organisation');
  }
  if (app.category === 'media' && (designation.length < 2 || designation.length > 255)) {
    throw new Error('Enter a designation or role between 2 and 255 characters');
  }
  if (app.category !== 'media' && mediaAccessTypes.length > 0) {
    throw new Error('Media access areas are only valid for Press and Media registrations');
  }
  if (app.category !== 'media' && mediaOrganisationType) {
    throw new Error('Media organisation types are only valid for Press and Media registrations');
  }

  let role: { code: string; name: string } | null = null;
  if (app.preferred_role_id) {
    const { data, error: roleError } = await supabase.from('campaign_roles')
      .select('code, name').eq('id', app.preferred_role_id).eq('category', app.category).eq('is_active', true).single();
    if (roleError || !data) throw new Error('The registration role is unavailable');
    role = data;
  }
  const requiresOtherRole = Boolean(role && (role.code.endsWith('_others') || role.name === 'Others'));
  if (requiresOtherRole && (otherRole.length < 2 || otherRole.length > 255)) {
    throw new Error('Specify the applicant role in 2 to 255 characters');
  }
  if (app.category === 'management' && (!organisation || organisation.length > 255
      || designation.length < 2 || designation.length > 255)) {
    throw new Error('Management registrations need an organisation and designation');
  }

  let portfolioUrl: string | null = null;
  if (app.category === 'media') {
    if (mediaOutlet.length < 2 || mediaOutlet.length > 255) {
      throw new Error('Enter the name of the media organisation or publication (2 to 255 characters)');
    }
    if (portfolioUrlInput.length > 2048) throw new Error('Keep the public work link within 2,048 characters');
    if (portfolioUrlInput) {
      try {
        const parsedUrl = new URL(portfolioUrlInput);
        if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
          throw new Error('Portfolio links must use HTTP or HTTPS');
        }
        portfolioUrl = parsedUrl.toString();
      } catch (error) {
        throw error instanceof Error && error.message === 'Portfolio links must use HTTP or HTTPS'
          ? error : new Error('Enter a valid public portfolio link');
      }
    }
  }
  if (app.category === 'officials'
      && (professionalBody.length < 2 || professionalBody.length > 255
        || professionalQualification.length < 2 || professionalQualification.length > 255
        || professionalRegistrationNumber.length > 100
        || professionalExperience.length > 2000
        || !['', 'yes', 'no'].includes(conflictOfInterestAnswer)
        || (conflictOfInterestAnswer === 'yes' && (conflictDetails.length < 2 || conflictDetails.length > 2000))
        || (conflictOfInterestAnswer !== 'yes' && conflictDetails))) {
    throw new Error('Check the association, qualification, experience, and conflict-of-interest details');
  }
  if (app.category !== 'officials' && (professionalExperience || conflictOfInterestAnswer || conflictDetails)) {
    throw new Error('Match-official details are only valid for Match Officials registrations');
  }
  if (app.category === 'medical'
      && (professionalQualification.length < 2 || professionalQualification.length > 255
        || professionalBody.length > 255 || professionalRegistrationNumber.length > 100)) {
    throw new Error('Medical team members need a professional qualification');
  }
  if (app.category === 'crew' && (technicalSpecialty.length > 255 || experience.length > 2000)) {
    throw new Error('Crew details are too long');
  }
  if (app.category === 'crew'
      && ((crewWorkArrangement && !['organisation', 'independent'].includes(crewWorkArrangement))
        || (crewWorkArrangement === 'organisation'
          && (crewOrganisation.length < 2 || crewOrganisation.length > 255
            || crewLeadName.length < 2 || crewLeadName.length > 255
            || !/^\d{10}$/.test(crewLeadPhone)))
        || (crewWorkArrangement === 'independent' && (crewOrganisation || crewLeadName || crewLeadPhone))
        || (!crewWorkArrangement && (crewOrganisation || crewLeadName || crewLeadPhone)))) {
    throw new Error('Check the Crew work arrangement and organisation contact details');
  }
  if (app.category !== 'crew' && (crewWorkArrangement || crewOrganisation || crewLeadName || crewLeadPhone)) {
    throw new Error('Crew affiliation details are only valid for Crew registrations');
  }

  if (availabilityMode === 'selected') {
    const { data: activeMatches, error: matchError } = await supabase.from('campaign_events')
      .select('id').eq('is_active', true).in('id', availabilityMatchIds);
    if (matchError || !activeMatches) throw new Error('Unable to validate selected matches');
    const activeIds = new Set(activeMatches.map((match) => match.id));
    const existingIds = new Set(Array.isArray(app.availability_match_ids) ? app.availability_match_ids : []);
    if (availabilityMatchIds.some((id) => !activeIds.has(id) && !existingIds.has(id))) {
      throw new Error('One or more selected matches are unavailable');
    }
  }

  const currentPhone = typeof app.phone === 'string' ? normalizeWorkforcePhone(app.phone) : '';
  const currentEmail = typeof app.email === 'string' ? app.email.trim().toLowerCase() : '';
  if (phone !== currentPhone) {
    const phoneClaim = await supabase.from('workforce_registration_identity_claims').select('application_id')
      .eq('identity_kind', 'phone').eq('normalized_value', phone).maybeSingle();
    if (phoneClaim.error) throw new Error('Unable to check for duplicate registrations');
    if (phoneClaim.data && phoneClaim.data.application_id !== applicationId) {
      throw new Error('These contact details are already used by another registration');
    }
  }
  if (email !== currentEmail) {
    const emailClaim = await supabase.from('workforce_registration_identity_claims').select('application_id')
      .eq('identity_kind', 'email').eq('normalized_value', email).maybeSingle();
    if (emailClaim.error) throw new Error('Unable to check for duplicate registrations');
    if (emailClaim.data && emailClaim.data.application_id !== applicationId) {
      throw new Error('These contact details are already used by another registration');
    }
  }

  const availabilitySummary = availabilityMode === 'all'
    ? 'Available for all 10 NUSC home matches'
    : 'Available for selected NUSC home matches';
  let conflictOfInterest: boolean | null = null;
  if (conflictOfInterestAnswer === 'yes') conflictOfInterest = true;
  if (conflictOfInterestAnswer === 'no') conflictOfInterest = false;
  const { error } = await supabase.from('campaign_applications').update({
    full_name: fullName,
    phone,
    email: email || null,
    other_role: requiresOtherRole ? otherRole : null,
    organisation: app.category === 'management' ? organisation : null,
    organisation_other: null,
    designation: app.category === 'management' || app.category === 'media' ? designation : null,
    availability: availabilitySummary,
    availability_mode: availabilityMode,
    availability_match_ids: availabilityMode === 'selected' ? availabilityMatchIds : [],
    media_outlet: app.category === 'media' ? mediaOutlet || null : null,
    media_organisation_type: app.category === 'media' ? mediaOrganisationType : null,
    portfolio_url: app.category === 'media' ? portfolioUrl : null,
    media_access_types: app.category === 'media' ? mediaAccessTypes : [],
    professional_body: ['officials', 'medical'].includes(app.category) ? professionalBody || null : null,
    professional_qualification: ['officials', 'medical'].includes(app.category) ? professionalQualification || null : null,
    professional_registration_number: ['officials', 'medical'].includes(app.category)
      ? professionalRegistrationNumber || null : null,
    professional_experience: app.category === 'officials' ? professionalExperience || null : null,
    conflict_of_interest: app.category === 'officials' ? conflictOfInterest : null,
    conflict_details: app.category === 'officials' && conflictOfInterestAnswer === 'yes' ? conflictDetails : null,
    technical_specialty: app.category === 'crew' ? technicalSpecialty || null : null,
    experience: app.category === 'crew' ? experience || null : null,
    crew_work_arrangement: app.category === 'crew' ? crewWorkArrangement || null : null,
    crew_organisation: app.category === 'crew' && crewWorkArrangement === 'organisation' ? crewOrganisation : null,
    crew_lead_name: app.category === 'crew' && crewWorkArrangement === 'organisation' ? crewLeadName : null,
    crew_lead_phone: app.category === 'crew' && crewWorkArrangement === 'organisation' ? crewLeadPhone : null,
    last_updated_by: staff.email,
    updated_at: new Date().toISOString(),
  }).eq('id', applicationId);
  if (error?.code === '23505') throw new Error('These contact details are already used by another registration');
  if (error) throw new Error('Unable to save registration details');
  return { success: true };
}

/**
 * 6. Issue Event ID Credential (enabled upon approval)
 */
export async function issueCampaignId(applicationId: string, reissue = false) {
  const staff = await assertStaffRole(['super_admin', 'campaign_manager']);
  if (typeof reissue !== 'boolean') throw new Error('Invalid reissue request');
  const { data, error } = await getSupabaseAdminClient().rpc('issue_campaign_id', {
    p_application_id: applicationId, p_actor: staff.email, p_reissue: reissue,
  });
  if (error || !data?.success) throw new Error('ID could not be issued. Confirm the candidate is approved and has an assigned role.');
  return data as { success: boolean; idNumber: string; passSlug: string };
}

type CampaignPassContext = {
  applicant: {
    full_name: string;
    email: string;
    assigned_role: { name: string } | null;
    assigned_zone: string | null;
    assigned_shift: string | null;
  };
  idNumber: string;
  passUrl: string;
  qrImage: Buffer;
};

async function loadCampaignPassContext(applicationId: string): Promise<CampaignPassContext> {
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteOrigin) throw new Error('Campaign site URL is not configured.');
  let origin: URL;
  try { origin = new URL(siteOrigin); } catch { throw new Error('Campaign site URL is invalid.'); }
  if (origin.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('Campaign pass delivery requires an HTTPS site URL.');
  }

  const { data, error } = await getSupabaseAdminClient().from('campaign_ids').select(`
    id_number, pass_slug, qr_token, valid_from, valid_until, is_active, revoked_at,
    application:campaign_applications!application_id (full_name, email, application_status,
      assigned_role:campaign_roles!assigned_role_id (name), assigned_zone, assigned_shift)
  `).eq('application_id', applicationId).maybeSingle();
  const applicant = Array.isArray(data?.application) ? data.application[0] : data?.application;
  const assignedRole = Array.isArray(applicant?.assigned_role) ? applicant.assigned_role[0] : applicant?.assigned_role;
  const validFrom = data ? new Date(data.valid_from).getTime() : Number.NaN;
  const validUntil = data ? new Date(data.valid_until).getTime() : Number.NaN;
  if (error || !data || !applicant || applicant.application_status !== 'approved' || !data.is_active || data.revoked_at
    || !Number.isFinite(validFrom) || !Number.isFinite(validUntil) || Date.now() > validUntil
    || typeof data.qr_token !== 'string' || !/^[0-9a-f]{64}$/i.test(data.qr_token)
    || typeof data.pass_slug !== 'string' || !assignedRole?.name) {
    throw new Error('Only approved candidates with an active, unexpired pass can receive it.');
  }
  const qrImage = await QRCode.toBuffer(data.qr_token, {
    type: 'png', errorCorrectionLevel: 'H', margin: 2, width: 480,
    color: { dark: '#050f24', light: '#ffffff' },
  });
  return {
    applicant: { ...applicant, assigned_role: assignedRole },
    idNumber: data.id_number,
    passUrl: new URL(`/campaign/id/${encodeURIComponent(data.pass_slug)}`, origin).toString(),
    qrImage,
  };
}

/** Prepare a manager-only preview/download payload without exposing the QR token. */
export async function prepareCampaignPassPreview(applicationId: string) {
  try {
    await assertStaffRole(['super_admin', 'campaign_manager']);
    const context = await loadCampaignPassContext(applicationId);
    return {
      success: true as const,
      idNumber: context.idNumber,
      passUrl: context.passUrl,
      qrImageBase64: context.qrImage.toString('base64'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The pass preview could not be prepared.';
    console.error('Campaign pass preview preparation failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return { success: false as const, message };
  }
}

/** Send the approved candidate their private pass and scannable QR by email. */
export async function emailCampaignPass(applicationId: string) {
  try {
    await assertStaffRole(['super_admin', 'campaign_manager']);
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CAMPAIGN_EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      throw new Error('Pass email is not configured. Check the Admin Resend key and verified sender settings.');
    }
    const bracketSender = from.match(/^(.*?)\s*<([^<>\s]+@[^<>\s]+)>$/);
    const namedSender = from.match(/^(.*?)\s+([^<>\s]+@[^<>\s]+)$/);
    const bareSender = from.match(/^([^<>\s]+@[^<>\s]+)$/);
    const senderMatch = bracketSender || namedSender || bareSender;
    const senderAddress = bracketSender?.[2] || namedSender?.[2] || bareSender?.[1] || '';
    const senderName = bracketSender?.[1]?.trim() || namedSender?.[1]?.trim() || '';
    const senderDomain = senderAddress.split('@')[1] || '';
    if (!senderMatch || !senderDomain.includes('.')) {
      throw new Error('The campaign sender address is invalid.');
    }
    if (['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'].includes(senderDomain.toLowerCase())) {
      throw new Error('Resend requires a sender address on a verified domain, not a personal mailbox.');
    }
    const context = await loadCampaignPassContext(applicationId);
    const recipient = context.applicant.email?.trim();
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      throw new Error('This applicant does not have a valid email address.');
    }
    const resendFrom = senderName ? `${senderName} <${senderAddress}>` : senderAddress;
    const qrImageBase64 = context.qrImage.toString('base64');
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]!));
    const passUrl = escapeHtml(context.passUrl);
    const text = `Your NUSC campaign pass is ready.\n\nPass ID: ${context.idNumber}\n${context.passUrl}\n\nYour QR code is embedded below and attached as a PNG. Show it at the gate or your assigned booth for each match day. Keep this private; it grants event access.`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1730"><h1>Your NUSC campaign pass</h1><p>Hello ${escapeHtml(context.applicant.full_name)}, your registration has been approved.</p><p><strong>Pass ID:</strong> ${escapeHtml(context.idNumber)}<br><strong>Role:</strong> ${escapeHtml(context.applicant.assigned_role?.name)}<br><strong>Zone:</strong> ${escapeHtml(context.applicant.assigned_zone || 'To be assigned')}<br><strong>Shift:</strong> ${escapeHtml(context.applicant.assigned_shift || 'To be assigned')}</p><p>Show this QR at the gate or your assigned booth for each match day. If it does not display, open the attached PNG image.</p><p><a href="${passUrl}"><img src="cid:nusc-campaign-pass-qr" alt="Your secure NUSC campaign QR pass" width="240" height="240" style="display:block;border:1px solid #ddd;padding:8px;background:#fff"></a></p><p><a href="${passUrl}">Open or print your pass</a></p><p>Keep this pass private. It grants event access. Present your photo ID if staff ask to verify your identity.</p></div>`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: resendFrom, to: [recipient], subject: 'Your NUSC Campaign Pass', text, html,
        attachments: [{
          filename: 'nusc-campaign-pass-qr.png', content: qrImageBase64,
          content_type: 'image/png', content_id: 'nusc-campaign-pass-qr',
        }, {
          filename: `${context.idNumber}-QR.png`, content: qrImageBase64, content_type: 'image/png',
        }],
      }),
      cache: 'no-store',
    });
    if (!response.ok) {
      const providerError = await response.json().catch(() => null) as { name?: unknown } | null;
      const providerCode = typeof providerError?.name === 'string' ? providerError.name : 'unknown';
      console.error('Campaign pass email provider rejected request', { status: response.status, providerCode });
      if (response.status === 401 || response.status === 403 || providerCode === 'restricted_api_key') {
        throw new Error('Resend rejected the API key or sender domain. Check the key has Sending access for the verified domain.');
      }
      if (response.status === 422 || providerCode === 'validation_error' || providerCode === 'domain_not_found') {
        throw new Error('Resend rejected the sender or recipient. Check the verified sender domain and recipient address.');
      }
      throw new Error(`Resend could not accept the pass email (HTTP ${response.status}). Check the Admin server and Resend logs.`);
    }
    return { success: true as const, recipient };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pass email could not be sent. Check the Admin server and Resend logs.';
    console.error('Campaign pass email action failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return { success: false as const, message };
  }
}

/**
 * 7. Revoke an Issued Event ID
 */
export async function revokeCampaignId(idRecordId: string, reason?: string) {
  const staff = await assertStaffRole(['super_admin', 'campaign_manager']);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from('campaign_ids')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      revoked_by: `${staff.email}${reason ? ` (${reason})` : ''}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', idRecordId);

  if (error) {
    throw new Error('Failed to revoke ID: ' + error.message);
  }

  return { success: true };
}

/**
 * 8. Gate Staff Atomic QR Verification & Check-in
 * Strictly asserts role is super_admin, campaign_manager, or gate_staff.
 * Staff email is derived authoritatively from session, never client parameters!
 */
export async function verifyAndCheckInGateScan(qrToken: string, gate: string, eventId: string) {
  const staff = await assertStaffRole(['super_admin', 'campaign_manager', 'gate_staff']);
  const supabase = getSupabaseAdminClient();

  let cleanToken = typeof qrToken === 'string' ? qrToken.trim() : '';
  const cleanGate = typeof gate === 'string' ? gate.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(eventId || '') || !['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4'].includes(cleanGate)) {
    return { success: false, code: 'MATCH_REQUIRED', message: 'Choose a match and gate before scanning' };
  }
  // Manual fallback uses the printed ID; only authorised gate staff can resolve it.
  if (/^NUSC-ID-\d{4}-[A-Z0-9]{6,32}$/i.test(cleanToken)) {
    const { data, error } = await supabase.from('campaign_ids').select('qr_token').eq('id_number', cleanToken.toUpperCase()).maybeSingle();
    if (error || !data) return { success: false, code: 'INVALID_TOKEN', message: 'Credential not recognised' };
    cleanToken = data.qr_token;
  }
  if (!/^[0-9a-f]{64}$/i.test(cleanToken)) return { success: false, code: 'INVALID_TOKEN', message: 'Credential not recognised' };

  // Call atomic PostgreSQL function
  const { data, error } = await supabase.rpc('verify_and_check_in_campaign_id', {
    p_qr_token: cleanToken,
    p_gate: cleanGate,
    p_scanned_by: staff.email, // authoritatively derived!
    p_event_id: eventId,
  });

  if (error) {
    console.error('verify_and_check_in_campaign_id RPC error:', error);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      message: 'Check-in is temporarily unavailable. Please retry.',
    };
  }

  // If candidate photo is present, generate a 15-min signed URL so gate staff can visually verify
  if (data?.candidate?.photo_storage_path) {
    const { data: signedData } = await supabase.storage
      .from('campaign_documents')
      .createSignedUrl(data.candidate.photo_storage_path, 900);
    data.candidate.signedPhotoUrl = signedData?.signedUrl || null;
  }

  return data;
}

/**
 * 9. Attendance Logs Query (Audit History)
 */
export async function getCampaignAttendanceHistory(page = 1, pageSize = 30, gateFilter?: string, actionFilter?: string, eventId?: string) {
  const trace = createPerformanceTrace('admin.campaign_attendance_list');
  try {
    await trace.measure('authorize', () => assertStaffRole(['super_admin', 'campaign_manager']));
    const supabase = getSupabaseAdminClient();
    page = Math.max(1, Math.floor(page) || 1);
    pageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 30));

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('campaign_attendance')
      .select(`
      id,
      action,
      event:campaign_events!event_id (title, start_date),
      gate,
      scanned_by,
      scanned_at,
      notes,
      application:campaign_applications!application_id (
        full_name,
        category,
        assigned_zone,
        assigned_shift,
        other_role,
        assigned_role:campaign_roles!assigned_role_id (name, code)
      ),
      campaign_id_record:campaign_ids!campaign_id (
        id_number
      )
    `, { count: 'exact' });

    if (eventId && eventId !== 'all') query = query.eq('event_id', eventId);

    if (gateFilter && gateFilter !== 'all') {
      query = query.eq('gate', gateFilter);
    }

    if (actionFilter && actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    query = query.order('scanned_at', { ascending: false }).range(from, to);

    const { data, count, error } = await trace.measure('query', () => query);
    if (error) {
      throw new Error('Failed to retrieve attendance logs: ' + error.message);
    }

    return {
      logs: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } finally { trace.finish(); }
}

/**
 * 10. Issued IDs Registry List
 */
export async function getIssuedCampaignIds(page = 1, pageSize = 30, activeOnly = false) {
  await assertStaffRole(['super_admin', 'campaign_manager']);
  const supabase = getSupabaseAdminClient();
  page = Math.max(1, Math.floor(page) || 1);
  pageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 30));

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('campaign_ids')
    .select(`
      id,
      id_number,
      pass_slug,
      issued_at,
      issued_by,
      valid_from,
      valid_until,
      is_active,
      revoked_at,
      revoked_by,
      application:campaign_applications!application_id (
        id,
        full_name,
        category,
        assigned_zone,
        assigned_shift,
        assigned_role:campaign_roles!assigned_role_id (name, code)
      )
    `, { count: 'exact' });

  if (activeOnly) {
    query = query.eq('is_active', true).is('revoked_at', null)
      .lte('valid_from', new Date().toISOString()).gte('valid_until', new Date().toISOString());
  }

  query = query.order('issued_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    throw new Error('Failed to retrieve issued IDs: ' + error.message);
  }

  return {
    ids: (data || []).map(row => ({ ...row, isExpired: new Date(row.valid_until).getTime() < Date.now() })),
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * 11. Export Approved Candidates CSV
 */
export async function getApprovedCandidatesForExport() {
  await assertStaffRole(['super_admin', 'campaign_manager']);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('campaign_applications')
    .select(`
      application_number,
      full_name,
      phone,
      email,
      category,
      gender,
      designation,
      availability,
      availability_match_ids,
      media_outlet,
      media_organisation_type,
      portfolio_url,
      media_access_types,
      professional_body,
      professional_qualification,
      professional_registration_number,
      professional_experience,
      conflict_of_interest,
      conflict_details,
      technical_specialty,
      experience,
      crew_work_arrangement,
      crew_organisation,
      crew_lead_name,
      crew_lead_phone,
      assigned_zone,
      assigned_shift,
      emergency_contact_name,
      emergency_contact_phone,
      preferred_role:campaign_roles!preferred_role_id (name, code),
      assigned_role:campaign_roles!assigned_role_id (name, code),
      other_role,
      campaign_ids (
        id_number,
        is_active,
        issued_at
      )
    `)
    .eq('application_status', 'approved')
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new Error('Failed to export approved candidates: ' + error.message);
  }

  return data || [];
}

export async function getCampaignMatches() {
  const trace = createPerformanceTrace('admin.campaign_matches_list');
  try {
    await trace.measure('authorize', () => assertStaffRole(['super_admin', 'campaign_manager', 'reviewer', 'gate_staff']));
    const { data, error } = await trace.measure('query', () => getSupabaseAdminClient().from('campaign_events')
      .select('id, title, venue, start_date, end_date, is_active').order('start_date', { ascending: false }));
    if (error) throw new Error('Unable to load matches');
    return data || [];
  } finally { trace.finish(); }
}

export async function getCampaignRoleOptions(category: string) {
  await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']);
  let query = getSupabaseAdminClient().from('campaign_roles')
    .select('id, name, code').eq('is_active', true).order('name');
  if (category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw new Error('Unable to load roles');
  return data || [];
}

export async function saveCampaignMatch(input: {
  id?: string; title: string; venue: string; startDate: string; endDate: string; isActive: boolean;
}) {
  const trace = createPerformanceTrace('admin.campaign_match_save');
  try {
    await trace.measure('authorize', () => assertStaffRole(['super_admin', 'campaign_manager']));
    if (!input || typeof input.title !== 'string' || typeof input.venue !== 'string'
        || !input.title.trim() || !input.venue.trim() || input.title.length > 255 || input.venue.length > 255
        || typeof input.isActive !== 'boolean') throw new Error('Enter a match name and venue');
    const start = new Date(input.startDate), end = new Date(input.endDate);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      throw new Error('Check-in closing time must be after opening time');
    }
    const supabase = getSupabaseAdminClient();
    const values = { title: input.title.trim(), venue: input.venue.trim(), start_date: start.toISOString(),
      end_date: end.toISOString(), is_active: input.isActive, updated_at: new Date().toISOString() };
    const result = await trace.measure(input.id ? 'update' : 'insert', () => input.id
      ? supabase.from('campaign_events').update(values).eq('id', input.id).select('id').single()
      : supabase.from('campaign_events').insert({ ...values, slug: 'match-' + crypto.randomBytes(8).toString('hex') }).select('id').single());
    if (result.error || !result.data) throw new Error('Unable to save match');
    return { success: true };
  } finally { trace.finish(); }
}
