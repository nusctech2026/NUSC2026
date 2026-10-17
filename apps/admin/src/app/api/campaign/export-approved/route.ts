import { getApprovedCandidatesForExport } from '../../../../actions/campaignAdminActions';
import { campaignRoleLabel } from '../../../../utils/campaignRoleLabel';

// Quote every field and prevent spreadsheet formulas in applicant-provided data.
const csvCell = (value: unknown) => {
  let text = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

export async function GET() {
  try {
    const candidates = await getApprovedCandidatesForExport();
    const rows: unknown[][] = [[
      'Application Number','Full Name','Category','Preferred Role','Assigned Role','Other Role Description',
      'Assigned Zone','Assigned Shift','Phone','Email','Emergency Contact Name','Emergency Contact Phone','Issued ID Number','ID Active',
    ]];
    for (const candidate of candidates) {
      const id = Array.isArray(candidate.campaign_ids) ? candidate.campaign_ids[0] : candidate.campaign_ids;
      rows.push([candidate.application_number,candidate.full_name,candidate.category,
        campaignRoleLabel(candidate.preferred_role as any,candidate.other_role),
        campaignRoleLabel(candidate.assigned_role as any,candidate.other_role),candidate.other_role,
        candidate.assigned_zone,candidate.assigned_shift,candidate.phone,candidate.email,
        candidate.emergency_contact_name,candidate.emergency_contact_phone,(id as any)?.id_number || 'Not issued',
        (id as any)?.is_active ? 'Yes' : 'No',
      ]);
    }
    return new Response(rows.map(row => row.map(csvCell).join(',')).join('\r\n'), {
      headers: {'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="nusc_campaign_approved_candidates.csv"','Cache-Control':'private, no-store'},
    });
  } catch { return new Response('Unable to export candidates. Sign in with a campaign manager account.',{status:403}); }
}
