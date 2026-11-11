import { assertStaffRole, getSupabaseAdminClient } from '../../../../utils/supabaseServerClient';

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
      'Registration ID', 'Full Name', 'Phone Number', 'Email', 'Department', 'Role selected', 'Other role (specified)',
      'Organisation / affiliation selected', 'Other organisation / affiliation (specified)', 'Designation / role / position',
      'Date of birth', 'Gender', 'Residential address', 'Availability', 'Available match dates',
      'Reason for joining', 'Emergency contact name', 'Emergency contact phone', 'Media organisation / publication',
      'Type of media organisation', 'Published work / public profile', 'Media access requested', 'Professional body / association',
      'Professional qualification / grade', 'Professional registration / licence number', 'Recent officiating experience',
      'Conflict of interest', 'Conflict details', 'Technical specialty', 'Relevant experience', 'Crew work arrangement',
      'Crew organisation / provider', 'Crew lead / supervisor name', 'Crew lead / supervisor phone',
      'Profile photo download URL (expires in 30 minutes)', 'Terms accepted', 'WhatsApp pass updates consent', 'Status',
      'Assigned match', 'Assigned zone', 'Assigned shift', 'Possible duplicate', 'Submitted at',
    ]];

    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.from('campaign_applications')
        .select('application_number, full_name, date_of_birth, gender, phone, email, address, photo_storage_path, category, other_role, organisation, organisation_other, designation, availability, availability_match_ids, reason_for_joining, emergency_contact_name, emergency_contact_phone, media_outlet, media_organisation_type, portfolio_url, media_access_types, professional_body, professional_qualification, professional_registration_number, professional_experience, conflict_of_interest, conflict_details, technical_specialty, experience, crew_work_arrangement, crew_organisation, crew_lead_name, crew_lead_phone, application_status, event_id, assigned_zone, assigned_shift, potential_duplicate, terms_accepted_at, whatsapp_pass_opt_in_at, submitted_at, preferred_role:campaign_roles!preferred_role_id (name, code), event:campaign_events!event_id (title)')
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

      const photoPaths = [...new Set((data || [])
        .map((registration) => registration.photo_storage_path)
        .filter((path): path is string => typeof path === 'string' && path.length > 0))];
      const photoDownloads = new Map<string, string>();
      for (let start = 0; start < photoPaths.length; start += 100) {
        const { data: signedPhotos, error: photoError } = await supabase.storage
          .from('campaign_documents')
          .createSignedUrls(photoPaths.slice(start, start + 100), 1800, { download: true });
        if (!photoError) {
          for (const photo of signedPhotos || []) {
            if (photo.path && photo.signedUrl) photoDownloads.set(photo.path, photo.signedUrl);
          }
        }
      }

      for (const registration of data || []) {
        const role = Array.isArray(registration.preferred_role) ? registration.preferred_role[0] : registration.preferred_role;
        const event = Array.isArray(registration.event) ? registration.event[0] : registration.event;
        const hasOtherOrganisation = Boolean(registration.organisation_other)
          || registration.organisation === 'Others';
        const selectedOrganisation = hasOtherOrganisation ? 'Other' : registration.organisation;
        const availableMatches = Array.isArray(registration.availability_match_ids)
          ? registration.availability_match_ids.map((id) => availabilityTitles.get(id) || 'Match details unavailable').join('; ')
          : '';
        const crewWorkArrangement = registration.crew_work_arrangement === 'organisation'
          ? 'Working through an organisation / contractor'
          : registration.crew_work_arrangement === 'independent'
            ? 'Independent / freelance'
            : registration.crew_work_arrangement;
        rows.push([
          registration.application_number,
          registration.full_name,
          registration.phone,
          registration.email,
          DEPARTMENT_LABELS[registration.category] || registration.category,
          registration.category === 'management' ? '' : role?.name,
          registration.category === 'management' ? '' : registration.other_role,
          selectedOrganisation,
          registration.organisation_other,
          registration.designation,
          registration.date_of_birth,
          registration.gender,
          registration.address,
          registration.availability,
          availableMatches,
          registration.reason_for_joining,
          registration.emergency_contact_name,
          registration.emergency_contact_phone,
          registration.media_outlet,
          MEDIA_ORGANISATION_TYPE_LABELS[String(registration.media_organisation_type || '')] || registration.media_organisation_type,
          registration.portfolio_url,
          Array.isArray(registration.media_access_types)
            ? registration.media_access_types.map((value) => MEDIA_ACCESS_LABELS[value] || value).join('; ')
            : '',
          registration.professional_body,
          registration.professional_qualification,
          registration.professional_registration_number,
          registration.professional_experience,
          registration.conflict_of_interest == null ? '' : registration.conflict_of_interest ? 'Yes' : 'No',
          registration.conflict_details,
          registration.technical_specialty,
          registration.experience,
          crewWorkArrangement,
          registration.crew_organisation,
          registration.crew_lead_name,
          registration.crew_lead_phone,
          registration.photo_storage_path
            ? photoDownloads.get(registration.photo_storage_path) || 'Unavailable'
            : '',
          registration.terms_accepted_at ? 'Yes' : 'No',
          registration.whatsapp_pass_opt_in_at ? 'Yes' : 'No',
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
