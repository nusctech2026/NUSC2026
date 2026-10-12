import { CollectionConfig } from 'payload'

export const MembershipInterestRegistrations: CollectionConfig = {
  slug: 'membership-interests',
  admin: {
    useAsTitle: 'email',
    group: 'Registrations',
    components: {
      beforeListTable: ['./components/ExportInterestButton#ExportInterestButton'],
    },
    defaultColumns: ['firstName', 'lastName', 'email', 'phone', 'cityDistrict', 'interestedTier', 'status', 'createdAt'],
  },
  access: {
    read: () => true,
    create: () => true, // Allow public submissions from the pre-registration form
  },
  endpoints: [
    {
      path: '/export-csv',
      method: 'get',
      handler: async (req) => {
        const { payload } = req;
        const result = await payload.find({
          collection: 'membership-interests',
          limit: 5000,
        });

        const fieldMap: Record<string, string> = {
          id: 'ID',
          firstName: 'First Name',
          lastName: 'Last Name',
          email: 'Email',
          phone: 'Phone Number',
          dateOfBirth: 'Date of Birth',
          cityDistrict: 'City / District',
          interestedTier: 'Interested Tier',
          marketingConsent: 'Marketing Consent',
          termsAccepted: 'Terms Accepted',
          notes: 'Notes / Suggestions',
          status: 'Status',
          createdAt: 'Pre-Registered At',
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
            'Content-Disposition': 'attachment; filename="nusc_membership_pre_registrations.csv"',
          },
        });
      },
    },
  ],
  fields: [
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'text',
      required: true,
      validate: (value: unknown) => {
        if (!value) return 'Email is required';
        const emailStr = String(value);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          return 'Please enter a valid email address';
        }
        return true;
      },
    },
    {
      name: 'phone',
      label: 'Mobile / WhatsApp Number',
      type: 'text',
      required: true,
      validate: (value: unknown) => {
        if (!value) return 'Phone number is required';
        const valStr = String(value).replace(/\D/g, '');
        if (valStr.length < 10) {
          return 'Please enter a valid 10-digit phone number';
        }
        return true;
      },
    },
    {
      name: 'dateOfBirth',
      label: 'Date of Birth',
      type: 'date',
      required: true,
    },
    {
      name: 'cityDistrict',
      label: 'City / District',
      type: 'text',
      required: true,
    },
    {
      name: 'interestedTier',
      label: 'Interested Membership Tier',
      type: 'text',
      required: true,
      defaultValue: 'rise_general',
    },
    {
      name: 'marketingConsent',
      label: 'Marketing / News Consent',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'termsAccepted',
      label: 'Terms & Conditions Accepted',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'notes',
      label: 'Suggestions / Comments',
      type: 'textarea',
      required: false,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'text',
      defaultValue: 'new',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
