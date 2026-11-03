'use server';

export interface AccreditationSubmissionResult {
  success: boolean;
  accreditationId?: string;
  error?: string;
  data?: {
    fullName: string;
    mediaOrgName: string;
    designationRole: string;
    accreditationType: string;
    accreditationId: string;
    submissionDate: string;
    status: string;
  };
}

/**
 * The legacy press form is retired. The public page redirects applicants to
 * the unified Media registration flow, so this stale server action must not
 * write applicant records through the service-role client.
 */
export async function submitPressAccreditation(
  _formData: FormData,
): Promise<AccreditationSubmissionResult> {
  return {
    success: false,
    error: 'Press and Media registration has moved. Use the unified registration form to apply.',
  };
}
