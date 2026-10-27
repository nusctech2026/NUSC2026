'use server';

import { createAdminClient, createServerClient } from '@nusc/db';
import crypto from 'crypto';
import { campaignRateLimit, campaignRoleLabel, campaignSiteOrigin, CampaignRateLimitError, CampaignServiceError } from './server';
import { createPerformanceTrace } from '@nusc/db/src/performance';

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
    passSlug: string;
    fullName: string;
    category: string;
    assignedRole: string;
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

/**
 * Submit campaign application with strict server-side validation and field allowlisting.
 * Clients cannot control application_status, assigned roles/zones/shifts, or application numbers.
 */
export async function submitCampaignApplication(formData: FormData): Promise<CampaignSubmissionResult> {
  const trace = createPerformanceTrace('registration.campaign');
  try {
    const fullName = (formData.get('fullName') as string)?.trim() || '';
    const dateOfBirth = (formData.get('dateOfBirth') as string)?.trim() || '';
    const gender = (formData.get('gender') as string)?.trim() || '';
    const rawPhone = (formData.get('phone') as string)?.trim() || '';
    const phone = rawPhone.replace(/\D/g, '');
    const email = (formData.get('email') as string)?.trim().toLowerCase() || '';
    const address = (formData.get('address') as string)?.trim() || '';
    const category = (formData.get('category') as string)?.trim().toLowerCase() || '';
    const preferredRoleId = (formData.get('preferredRoleId') as string)?.trim() || '';
    const otherRole = (formData.get('otherRole') as string)?.trim() || '';
    const experience = (formData.get('experience') as string)?.trim() || '';
    const availability = (formData.get('availability') as string)?.trim() || '';
    const reasonForJoining = (formData.get('reasonForJoining') as string)?.trim() || '';
    const emergencyContactName = (formData.get('emergencyContactName') as string)?.trim() || '';
    const rawEmergencyPhone = (formData.get('emergencyContactPhone') as string)?.trim() || '';
    const emergencyContactPhone = rawEmergencyPhone.replace(/\D/g, '');
    const termsAccepted = formData.get('termsAccepted') === 'on' || formData.get('termsAccepted') === 'true';

    const photoFile = formData.get('photo') as File | null;

    // --- Validation Rules ---
    if (!fullName || fullName.length < 2) {
      return { success: false, error: 'Full legal name is required (minimum 2 characters).' };
    }

    if (!dateOfBirth) {
      return { success: false, error: 'Date of birth is required.' };
    }
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
      return { success: false, error: 'Please enter a valid date of birth.' };
    }

    if (!gender) {
      return { success: false, error: 'Please select your gender.' };
    }

    if (!/^\d{10}$/.test(phone)) {
      return { success: false, error: 'A valid 10-digit mobile number is required.' };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'A valid email address is required.' };
    }

    if (!address || address.length < 5) {
      return { success: false, error: 'Please provide your full residential address.' };
    }

    if (!['ahibi', 'volunteer', 'crew'].includes(category)) {
      return { success: false, error: 'Please select a valid campaign category (Ahibi, Volunteer, or Crew).' };
    }

    if (!preferredRoleId) {
      return { success: false, error: 'Please select your preferred role.' };
    }

    if (!availability) {
      return { success: false, error: 'Please indicate your availability.' };
    }

    if (!emergencyContactName || emergencyContactName.length < 2) {
      return { success: false, error: 'Emergency contact name is required.' };
    }

    if (!/^\d{10}$/.test(emergencyContactPhone)) {
      return { success: false, error: 'Emergency contact phone number (10 digits) is required.' };
    }

    if (!termsAccepted) {
      return { success: false, error: 'You must agree to the NUSC Campaign regulations and declaration.' };
    }

    if (!(photoFile instanceof File) || photoFile.size === 0) {
      return { success: false, error: 'A passport-size photograph is required for event credentialing.' };
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (photoFile.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Photograph file size must not exceed 5MB.' };
    }

    const supabase = createAdminClient();
    await trace.measure('rate_limits', () => Promise.all([
      campaignRateLimit('submit-email', email, 5),
      campaignRateLimit('submit-phone', phone, 5),
    ]));
    if (fullName.length > 255 || email.length > 255 || otherRole.length > 255 || address.length > 2000
      || experience.length > 4000 || reasonForJoining.length > 4000 || availability.length > 500
      || emergencyContactName.length > 255 || !['Male', 'Female', 'Other', 'Prefer not to say'].includes(gender)) {
      return { success: false, error: 'Please check the form values and keep descriptions within the indicated limits.' };
    }
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    const imageType = photoBuffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png'
      : photoBuffer[0] === 255 && photoBuffer[1] === 216 && photoBuffer[2] === 255 ? 'jpeg'
      : photoBuffer.toString('ascii', 0, 4) === 'RIFF' && photoBuffer.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null;
    if (!imageType) return { success: false, error: 'Upload a JPG, PNG, or WebP photograph.' };

    // Verify preferredRoleId exists and belongs to the requested category
    const { data: roleRecord, error: roleError } = await trace.measure('role_validation', () => supabase
      .from('campaign_roles')
      .select('id, name, code, category')
      .eq('id', preferredRoleId)
      .eq('is_active', true)
      .single());

    if (roleError || !roleRecord || roleRecord.category !== category) {
      return { success: false, error: 'Selected role is invalid for the chosen category.' };
    }

    if (roleRecord.code === 'crew_others' && (!otherRole || otherRole.length < 2)) {
      return { success: false, error: 'Please specify your role description in the "Other" field.' };
    }

    // Authoritative Server-side Application Number Generation
    const randomSuffix = crypto.randomBytes(8).toString('hex').toUpperCase();
    const applicationNumber = `NUSC-CMP-${new Date().getUTCFullYear()}-${randomSuffix}`;

    // Upload photo to private bucket campaign_documents
    let photoStoragePath: string | null = null;
    try {
      const storagePath = `${applicationNumber}/photo.${imageType}`;

      const { error: uploadError } = await trace.measure('photo_upload', () => supabase.storage
        .from('campaign_documents')
        .upload(storagePath, photoBuffer, {
          contentType: `image/${imageType}`,
          upsert: false,
        }));

      if (uploadError) {
        console.error('Storage upload error for campaign photo:', uploadError);
        return { success: false, error: 'Failed to upload photograph. Please check the file and try again.' };
      }
      photoStoragePath = storagePath;
    } catch (uploadErr) {
      console.error('Upload exception:', uploadErr);
      return { success: false, error: 'An error occurred uploading your photograph.' };
    }

    // Explicitly constructed database payload (strict server-side allowlist)
    const { error: dbError } = await trace.measure('record_insert', () => supabase.from('campaign_applications').insert({
      application_number: applicationNumber,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      gender,
      phone,
      email,
      address,
      photo_storage_path: photoStoragePath,
      category,
      preferred_role_id: preferredRoleId,
      other_role: roleRecord.code === 'crew_others' ? otherRole : null,
      experience: experience || null,
      availability,
      reason_for_joining: reasonForJoining || null,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      application_status: 'submitted', // strictly server-controlled
      terms_accepted_at: new Date().toISOString(),
    }));

    if (dbError) {
      if (photoStoragePath) await supabase.storage.from('campaign_documents').remove([photoStoragePath]);
      console.error('Database insertion error for campaign application:', dbError);
      return {
        success: false,
        error: 'Database error recording application. Please try again or contact support.',
      };
    }

    return {
      success: true,
      applicationNumber,
      fullName,
      category,
    };
  } catch (error) {
    console.error('submitCampaignApplication exception:', error);
    return {
      success: false,
      error: error instanceof CampaignRateLimitError || error instanceof CampaignServiceError
        ? error.message : 'Unable to submit your application. Please try again.',
    };
  } finally { trace.finish(); }
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
    if (!/^NUSC-CMP-\d{4}-[A-Z0-9]{5,32}$/.test(number) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
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

    if (!/^NUSC-CMP-\d{4}-[A-Z0-9]{5,32}$/.test(cleanAppNum)) {
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
          full_name,
          category,
          photo_storage_path,
          assigned_zone,
          assigned_shift,
          other_role,
          application_status,
          assigned_role:campaign_roles!assigned_role_id (name, code),
          event:campaign_events!event_id (venue)
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

    const assignedRole = campaignRoleLabel(app.assigned_role, app.other_role);
    const event = Array.isArray(app.event) ? app.event[0] : app.event;
    const eventVenue = event?.venue || 'Chümoukedima Football Stadium, Nagaland';

    return {
      success: true,
      pass: {
        idNumber: idRecord.id_number,
        passSlug: idRecord.pass_slug,
        fullName: app.full_name,
        category: app.category,
        assignedRole,
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
