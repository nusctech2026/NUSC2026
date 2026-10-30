import { assertStaffRole, getSupabaseAdminClient } from '../../../../utils/supabaseServerClient';
import { campaignRoleLabel } from '../../../../utils/campaignRoleLabel';

const csvCell = (value: unknown) => {
  let text = String(value ?? '');
  if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

const DEPARTMENT_LABELS: Record<string, string> = {
  ahibi: 'Ahibi',
  volunteer: 'Volunteers',
  media: 'Press and Media',
  crew: 'Crew',
  management: 'Management',
  officials: 'Match Officials',
  medical: 'Medical Team',
};

const MEDIA_ACCESS_LABELS: Record<string, string> = {
  media_press_seating: 'Media / Press Seating',
  photography_area: 'Photography Area',
  press_conference_area: 'Press Conference Area',
  mixed_zone_interview_area: 'Mixed Zone / Post-Match Interview Area',
  broadcast_video_coverage_area: 'Broadcast / Video Coverage Area',
};

const MEDIA_ORGANISATION_TYPE_LABELS: Record<string, string> = {
  kaki: 'Kaki',
  print_media: 'Print Media',
  press_media: 'Press Media',
  broadcast_tv: 'Broadcast / TV',
  digital_online_media: 'Digital / Online Media',
  independent_freelance: 'Independent / Freelance',
  other: 'Other',
};

export async function GET() {
  try {
    // Exports include applicant contact details and professional credentials.
    await assertStaffRole(['super_admin', 'campaign_manager']);
    const supabase = getSupabaseAdminClient();
    const rows: unknown[][] = [[
      'Registration ID', 'Full Name', 'Phone', 'Email', 'Department', 'Role',
      'Organisation / Affiliation', 'Designation / Role / Position', 'Availability', 'Available Match Dates',
      'Media Organisation / Publication', 'Type of Media Organisation', 'Public Portfolio URL', 'Media Access Requested', 'Professional Body', 'Professional Qualification',
      'Professional Registration Number', 'Technical Specialty', 'Relevant Experience', 'Status',
      'Assigned Match', 'Assigned Zone', 'Assigned Shift', 'Possible Duplicate', 'Submitted At',
    ]];

    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.from('campaign_applications')
        .select('application_number, full_name, phone, email, category, other_role, organisation, designation, availability, availability_mode, availability_match_ids, media_outlet, media_organisation_type, portfolio_url, media_access_types, professional_body, professional_qualification, professional_registration_number, technical_specialty, experience, application_status, event_id, assigned_zone, assigned_shift, potential_duplicate, submitted_at, preferred_role:campaign_roles!preferred_role_id (name, code), event:campaign_events!event_id (title)')
        .order('submitted_at', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error('Registration export query failed');

      const selectedMatchIds = [...new Set((data || []).flatMap((registration) =>
        Array.isArray(registration.availability_match_ids) ? registration.availability_match_ids : []))];
      const availabilityTitles = new Map<string, string>();
      if (selectedMatchIds.length > 0) {
        const { data: selectedMatches, error: matchError } = await supabase.from('campaign_events')
          .select('id, title, start_date').in('id', selectedMatchIds);
        if (matchError) throw new Error('Availability export query failed');
        for (const match of selectedMatches || []) {
          const date = new Date(match.start_date).toLocaleDateString('en-IN');
          availabilityTitles.set(match.id, `${match.title} (${date})`);
        }
      }

      for (const registration of data || []) {
        const role = Array.isArray(registration.preferred_role) ? registration.preferred_role[0] : registration.preferred_role;
        const event = Array.isArray(registration.event) ? registration.event[0] : registration.event;
        const availableMatches = Array.isArray(registration.availability_match_ids)
          ? registration.availability_match_ids.map((id) => availabilityTitles.get(id) || 'Match details unavailable').join('; ')
          : '';
        rows.push([
          registration.application_number,
          registration.full_name,
          registration.phone,
          registration.email,
          DEPARTMENT_LABELS[registration.category] || registration.category,
          campaignRoleLabel(role as any, registration.other_role),
          registration.organisation,
          registration.designation,
          registration.availability,
          availableMatches,
          registration.media_outlet,
          MEDIA_ORGANISATION_TYPE_LABELS[String(registration.media_organisation_type || '')] || registration.media_organisation_type,
          registration.portfolio_url,
          Array.isArray(registration.media_access_types)
            ? registration.media_access_types.map((value) => MEDIA_ACCESS_LABELS[value] || value).join('; ')
            : '',
          registration.professional_body,
          registration.professional_qualification,
          registration.professional_registration_number,
          registration.technical_specialty,
          registration.experience,
          registration.application_status,
          event?.title || (registration.event_id ? 'Assigned match' : 'All 10 home matches'),
          registration.assigned_zone,
          registration.assigned_shift,
          registration.potential_duplicate ? 'Yes' : 'No',
          registration.submitted_at,
        ]);
      }
      if (!data || data.length < pageSize) break;
    }

    return new Response(rows.map(row => row.map(csvCell).join(',')).join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nusc_ifl_2026_27_workforce_registrations.csv"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    const denied = error instanceof Error && /authentication required|access denied/i.test(error.message);
    return new Response(denied
      ? 'Sign in with an authorised campaign staff account.'
      : 'Unable to export workforce registrations. Please try again.', {
      status: denied ? 403 : 500,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
