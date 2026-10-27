'use server';

import crypto from 'crypto';
import QRCode from 'qrcode';
import { getSupabaseAdminClient, assertStaffRole } from '../utils/supabaseServerClient';
import { createPerformanceTrace } from '@nusc/db/src/performance';

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
  await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']);
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

  const { data, count, error } = await query;
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
    const [photo, issued, roles, matches] = await trace.measure('related_records', () => Promise.all([
      app.photo_storage_path
        ? supabase.storage.from('campaign_documents').createSignedUrl(app.photo_storage_path, 1800)
        : Promise.resolve({ data: null, error: null }),
      supabase.from('campaign_ids')
        .select('id, id_number, pass_slug, valid_from, valid_until, is_active, revoked_at')
        .eq('application_id', app.id).maybeSingle(),
      supabase.from('campaign_roles').select('id, name, code')
        .eq('category', app.category).eq('is_active', true).order('name'),
      supabase.from('campaign_events').select('id, title, venue, start_date, end_date, is_active')
        .order('start_date', { ascending: false }),
    ]));
    if (issued.error || roles.error || matches.error) throw new Error('Unable to load applicant details');
    const idRecord = issued.data;

    return {
      ...app,
      signedPhotoUrl: photo.data?.signedUrl || null,
      roleOptions: roles.data || [],
      matches: matches.data || [],
      issuedId: idRecord ? { ...idRecord, isExpired: new Date(idRecord.valid_until).getTime() < Date.now() } : null,
    };
  } finally { trace.finish(); }
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
  await assertStaffRole(['super_admin', 'campaign_manager']);
  const supabase = getSupabaseAdminClient();
  if (assignedZone.length > 100 || assignedShift.length > 100) throw new Error('Zone and shift must be at most 100 characters');
  const { data: app, error: appError } = await supabase.from('campaign_applications').select('category, other_role').eq('id', applicationId).single();
  if (appError || !app) throw new Error('Applicant not found');
  const { data: role, error: roleError } = await supabase.from('campaign_roles').select('id, code').eq('id', assignedRoleId)
    .eq('category', app.category).eq('is_active', true).single();
  if (roleError || !role) throw new Error('Choose an active role in this applicant category');
  if (role.code === 'crew_others' && !app.other_role) throw new Error('This application has no specified Other role');
  if (eventId) {
    const { data: event, error } = await supabase.from('campaign_events').select('id').eq('id', eventId).eq('is_active', true).single();
    if (error || !event) throw new Error('Match is unavailable');
  }
  const { error } = await supabase.from('campaign_applications').update({
    assigned_role_id: role.id, assigned_zone: assignedZone.trim(), assigned_shift: assignedShift.trim(),
    ...(eventId !== undefined ? { event_id: eventId || null } : {}), updated_at: new Date().toISOString(),
  }).eq('id', applicationId);
  if (error) throw new Error('Unable to save assignment');
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

/** Send the approved candidate their private pass and scannable QR by email. */
export async function emailCampaignPass(applicationId: string) {
  await assertStaffRole(['super_admin', 'campaign_manager']);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CAMPAIGN_EMAIL_FROM?.trim();
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !from || !siteOrigin) {
    throw new Error('Pass email is not configured. Set RESEND_API_KEY, CAMPAIGN_EMAIL_FROM and NEXT_PUBLIC_SITE_URL for the admin app.');
  }
  const bracketSender = from.match(/^(.*?)\s*<([^<>\s]+@[^<>\s]+)>$/);
  const namedSender = from.match(/^(.*?)\s+([^<>\s]+@[^<>\s]+)$/);
  const bareSender = from.match(/^([^<>\s]+@[^<>\s]+)$/);
  const senderMatch = bracketSender || namedSender || bareSender;
  const senderAddress = bracketSender?.[2] || namedSender?.[2] || bareSender?.[1] || '';
  const senderName = bracketSender?.[1]?.trim() || namedSender?.[1]?.trim() || '';
  const senderDomain = senderAddress.split('@')[1] || '';
  if (!senderMatch || !senderDomain.includes('.')) {
    throw new Error('CAMPAIGN_EMAIL_FROM must be an email address, such as "NUSC Campaign <campaign@your-domain.com>".');
  }
  if (['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'].includes(senderDomain.toLowerCase())) {
    throw new Error('Resend requires a sender address on a domain verified in your Resend account. A personal mailbox address cannot be used as the sender.');
  }
  const resendFrom = senderName ? `${senderName} <${senderAddress}>` : senderAddress;
  let origin: URL;
  try { origin = new URL(siteOrigin); } catch { throw new Error('Campaign site URL is invalid'); }
  if (origin.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('Campaign pass email requires an HTTPS site URL');
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from('campaign_ids').select(`
    id_number, pass_slug, qr_token, valid_from, valid_until, is_active, revoked_at,
    application:campaign_applications!application_id (full_name, email, application_status,
      assigned_role:campaign_roles!assigned_role_id (name), assigned_zone, assigned_shift)
  `).eq('application_id', applicationId).maybeSingle();
  const app = Array.isArray(data?.application) ? data.application[0] : data?.application;
  const assignedRole = Array.isArray(app?.assigned_role) ? app.assigned_role[0] : app?.assigned_role;
  const now = Date.now();
  if (error || !data || !app || app.application_status !== 'approved' || !data.is_active || data.revoked_at
    || now < new Date(data.valid_from).getTime() || now > new Date(data.valid_until).getTime()) {
    throw new Error('Only approved candidates with an active, valid pass can receive it.');
  }

  const passUrl = new URL(`/campaign/id/${encodeURIComponent(data.pass_slug)}`, origin).toString();
  const qrImage = await QRCode.toBuffer(data.qr_token, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 480,
    color: { dark: '#050f24', light: '#ffffff' },
  });
  const qrImageBase64 = qrImage.toString('base64');
  const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]!));
  const text = `Your NUSC campaign pass is ready.\n\nPass ID: ${data.id_number}\n${passUrl}\n\nYour QR code is embedded below and attached as a PNG. Show it at the gate for each match. Keep this private; it grants event access.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1730"><h1>Your NUSC campaign pass</h1><p>Hello ${escapeHtml(app.full_name)}, your registration has been approved.</p><p><strong>Pass ID:</strong> ${escapeHtml(data.id_number)}<br><strong>Role:</strong> ${escapeHtml(assignedRole?.name)}<br><strong>Zone:</strong> ${escapeHtml(app.assigned_zone || 'To be assigned')}<br><strong>Shift:</strong> ${escapeHtml(app.assigned_shift || 'To be assigned')}</p><p>Show this QR at the gate for each match. If it does not display, open the attached PNG image.</p><p><a href="${escapeHtml(passUrl)}"><img src="cid:nusc-campaign-pass-qr" alt="Your secure NUSC campaign QR pass" width="240" height="240" style="display:block;border:1px solid #ddd;padding:8px;background:#fff"></a></p><p><a href="${escapeHtml(passUrl)}">Open or print your pass</a></p><p>Keep this pass private. It grants event access. Present your photo ID if staff ask to verify your identity.</p></div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: resendFrom,
      to: [app.email],
      subject: 'Your NUSC Campaign Pass',
      text,
      html,
      attachments: [{
        filename: 'nusc-campaign-pass-qr.png',
        content: qrImageBase64,
        content_type: 'image/png',
        content_id: 'nusc-campaign-pass-qr',
      }, {
        filename: 'NUSC-Campaign-QR.png',
        content: qrImageBase64,
        content_type: 'image/png',
      }],
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const providerError = await response.json().catch(() => null) as { name?: unknown } | null;
    const providerCode = typeof providerError?.name === 'string' ? providerError.name : 'unknown';
    console.error('Campaign pass email delivery failed', { status: response.status, providerCode });
    if (response.status === 401 || response.status === 403 || providerCode === 'restricted_api_key') {
      throw new Error('Resend rejected the API key or sender domain. Confirm the key has Sending access for the same verified domain used in CAMPAIGN_EMAIL_FROM.');
    }
    if (response.status === 422 || providerCode === 'validation_error' || providerCode === 'domain_not_found') {
      throw new Error('Resend rejected the sender or recipient. Verify the sender domain and make sure this recipient is allowed by your Resend account.');
    }
    throw new Error(`Resend could not send this message (HTTP ${response.status}, ${providerCode}). Check the admin server log and Resend email logs.`);
  }
  return { success: true, recipient: app.email };
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
  await assertStaffRole(['super_admin', 'campaign_manager']);
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

  const { data, count, error } = await query;
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
  await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer', 'gate_staff']);
  const { data, error } = await getSupabaseAdminClient().from('campaign_events')
    .select('id, title, venue, start_date, end_date, is_active').order('start_date', { ascending: false });
  if (error) throw new Error('Unable to load matches');
  return data || [];
}

export async function getCampaignRoleOptions(category: string) {
  await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']);
  const { data, error } = await getSupabaseAdminClient().from('campaign_roles')
    .select('id, name, code').eq('category', category).eq('is_active', true).order('name');
  if (error) throw new Error('Unable to load roles');
  return data || [];
}

export async function saveCampaignMatch(input: {
  id?: string; title: string; venue: string; startDate: string; endDate: string; isActive: boolean;
}) {
  await assertStaffRole(['super_admin', 'campaign_manager']);
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
  const result = input.id ? await supabase.from('campaign_events').update(values).eq('id', input.id).select('id').single()
    : await supabase.from('campaign_events').insert({ ...values, slug: 'match-' + crypto.randomBytes(8).toString('hex') }).select('id').single();
  if (result.error || !result.data) throw new Error('Unable to save match');
  return { success: true };
}
