import { CollectionConfig } from 'payload'

export const PressAccreditations: CollectionConfig = {
  slug: 'press-accreditations',
  admin: {
    useAsTitle: 'fullName',
    group: 'Registrations',
    components: {
      beforeListTable: ['./components/ExportPressAccreditationButton#ExportPressAccreditationButton'],
    },
    defaultColumns: [
      'accreditationId',
      'fullName',
      'mediaOrgName',
      'designationRole',
      'accreditationType',
      'status',
      'createdAt',
    ],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  endpoints: [
    {
      path: '/export-csv',
      method: 'get',
      handler: async (req) => {
        const { payload } = req;
        const result = await payload.find({
          collection: 'press-accreditations',
          limit: 5000,
        });

        const fieldMap: Record<string, string> = {
          accreditationId: 'Accreditation ID',
          fullName: 'Full Legal Name',
          email: 'Email Address',
          phone: 'Phone / WhatsApp',
          mediaOrgName: 'Media Organisation',
          mediaOrgType: 'Media Org Type',
          mediaOrgTypeOther: 'Other Org Type Details',
          designationRole: 'Designation / Role',
          designationRoleOther: 'Other Designation Details',
          mediaWebsiteUrl: 'Media Website / Link',
          accreditationType: 'Accreditation Type',
          singleMatchDetails: 'Single Match Details',
          accessRequired: 'Access Areas Requested',
          approvedAccessAreas: 'Approved Access Areas',
          equipmentCarried: 'Equipment Carried',
          equipmentOther: 'Other Equipment Details',
          photoUrl: 'Passport Photo URL',
          govtIdUrl: 'Government ID Document URL',
          mediaIdLetterUrl: 'Media ID / Authorisation URL',
          residentialAddress: 'Residential Address',
          status: 'Application Status',
          validity: 'Pass Validity',
          authorisedBy: 'Authorised By',
          applicantSignatureName: 'Applicant Signature',
          declarationDate: 'Declaration Date',
          termsAccepted: 'Terms Accepted',
          consentGiven: 'Consent Given',
          createdAt: 'Submitted At',
        };

        const headers = Object.keys(fieldMap);
        const headerLabels = Object.values(fieldMap);
        const csvRows = [headerLabels.map((label) => `"${label}"`).join(',')];

        for (const doc of result.docs) {
          const row = headers.map((header) => {
            let val = doc[header as keyof typeof doc];
            if (val && typeof val === 'object') {
              val = JSON.stringify(val);
            }
            return `"${String(val ?? '').replace(/"/g, '""')}"`;
          });
          csvRows.push(row.join(','));
        }

        return new Response(csvRows.join('\n'), {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="nusc_press_accreditations.csv"',
          },
        });
      },
    },
  ],
  fields: [
    {
      name: 'accreditationId',
      label: 'Accreditation ID',
      type: 'text',
      required: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Official Unique Media Pass Identifier',
      },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending Verification', value: 'pending' },
        { label: 'Under Review', value: 'under_review' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'validity',
      label: 'Validity',
      type: 'text',
      defaultValue: 'Season 2026–27',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'authorisedBy',
      label: 'Authorised By',
      type: 'text',
      defaultValue: 'NUSC Media Department',
      admin: {
        position: 'sidebar',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Registration Details',
          fields: [
            // 1. Personal & Contact Information
            {
              type: 'row',
              fields: [
                {
                  name: 'fullName',
                  label: 'Full Legal Name',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'email',
                  label: 'Official Email',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'phone',
                  label: 'Mobile / WhatsApp',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'mediaWebsiteUrl',
                  label: 'Media Website / Profile URL',
                  type: 'text',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'residentialAddress',
              label: 'Residential Address',
              type: 'textarea',
              required: true,
            },

            // 2. Media Organisation & Professional Role
            {
              type: 'row',
              fields: [
                {
                  name: 'mediaOrgName',
                  label: 'Media Organisation / Publication',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'mediaOrgType',
                  label: 'Organisation Type',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'mediaOrgTypeOther',
              label: 'Other Organisation Type Details',
              type: 'text',
              admin: {
                condition: (data) => Boolean(data?.mediaOrgTypeOther),
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'designationRole',
                  label: 'Designation / Role',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'designationRoleOther',
                  label: 'Other Designation Details',
                  type: 'text',
                  admin: {
                    width: '50%',
                    condition: (data) => Boolean(data?.designationRoleOther),
                  },
                },
              ],
            },

            // 3. Pass Type & Single Match Details
            {
              type: 'row',
              fields: [
                {
                  name: 'accreditationType',
                  label: 'Accreditation Pass Type',
                  type: 'select',
                  required: true,
                  defaultValue: 'season',
                  options: [
                    { label: 'Season Pass (All Home Matches)', value: 'season' },
                    { label: 'Single Match Pass', value: 'single_match' },
                  ],
                  admin: { width: '50%' },
                },
                {
                  name: 'singleMatchDetails',
                  label: 'Single Match Details (Opponent / Date)',
                  type: 'text',
                  admin: { width: '50%' },
                },
              ],
            },

            // 4. Access & Equipment Requested
            {
              type: 'row',
              fields: [
                {
                  name: 'accessRequired',
                  label: 'Access Areas Requested by Applicant',
                  type: 'json',
                  admin: {
                    width: '50%',
                    description: 'Requested access zones (e.g. media_seating, pitch_side, press_conference, mixed_zone)',
                    components: {
                      Field: './components/PressAccessFields#PressRequestedAccessField',
                    },
                  },
                },
                {
                  name: 'approvedAccessAreas',
                  label: 'Approved Access Zones (Granted by Club)',
                  type: 'json',
                  admin: {
                    width: '50%',
                    description: 'Official stadium access zones authorised for this pass holder',
                    components: {
                      Field: './components/PressAccessFields#PressApprovedAccessField',
                    },
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'equipmentCarried',
                  label: 'Equipment Declared by Applicant',
                  type: 'json',
                  admin: {
                    width: '50%',
                    description: 'Cameras, lenses, laptops, audio recorders, tripods',
                    components: {
                      Field: './components/PressAccessFields#PressEquipmentField',
                    },
                  },
                },
                {
                  name: 'equipmentOther',
                  label: 'Other Equipment Notes',
                  type: 'text',
                  admin: { width: '50%' },
                },
              ],
            },

            // 5. Uploaded Documents & Verification
            {
              name: 'documentPreview',
              type: 'ui',
              admin: {
                components: {
                  Field: './components/PressDocumentPreview#PressDocumentPreview',
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'photoFilename',
                  label: 'Photo Filename',
                  type: 'text',
                  admin: { width: '50%' },
                },
                {
                  name: 'photoUrl',
                  label: 'Photo Public URL',
                  type: 'text',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'govtIdFilename',
                  label: 'Govt ID Filename',
                  type: 'text',
                  admin: { width: '50%' },
                },
                {
                  name: 'govtIdUrl',
                  label: 'Govt ID Public URL',
                  type: 'text',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'mediaIdLetterFilename',
                  label: 'Media ID / Letter Filename',
                  type: 'text',
                  admin: { width: '50%' },
                },
                {
                  name: 'mediaIdLetterUrl',
                  label: 'Media ID / Letter Public URL',
                  type: 'text',
                  admin: { width: '50%' },
                },
              ],
            },

            // 6. Declaration & Compliance
            {
              type: 'row',
              fields: [
                {
                  name: 'applicantSignatureName',
                  label: 'Applicant Electronic Signature',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'declarationDate',
                  label: 'Declaration Date',
                  type: 'date',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'termsAccepted',
                  label: 'Terms & Conditions Accepted',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'consentGiven',
                  label: 'Verification & Background Consent Given',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
