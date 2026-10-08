import { CollectionConfig } from 'payload'

export const TrialRegistrations: CollectionConfig = {
  slug: 'trial-registrations',
  admin: {
    useAsTitle: 'fullName',
    group: 'Registrations',
    components: {
      beforeListTable: ['./components/ExportButton#ExportButton'],
    },
  },
  access: {
    read: () => true,
    create: () => true, // Allow public submissions
  },
  endpoints: [
    {
      path: '/export-csv',
      method: 'get',
      handler: async (req) => {
        const { payload } = req;
        const result = await payload.find({
          collection: 'trial-registrations',
          limit: 5000,
        });
        
        const fieldMap: Record<string, string> = {
          'id': 'ID',
          'fullName': 'Full Name',
          'email': 'Email',
          'phone': 'Phone Number',
          'playerPosition': 'Player Position',
          'dateOfBirth': 'Date of Birth',
          'crsNumber': 'CRS Number',
          'address': 'Residential Address',
          'aadharCard': 'Aadhar Card URL',
          'indigenousCertificate': 'Indigenous Certificate URL',
          'location': 'Trial Location',
          'eventDate': 'Trial Date',
          'createdAt': 'Registered At'
        };
        const headers = Object.keys(fieldMap);
        const headerLabels = Object.values(fieldMap);
        const csvRows = [headerLabels.map(label => `"${label}"`).join(',')];
        
        for (const doc of result.docs) {
          const row = headers.map(header => {
            let val = doc[header as keyof typeof doc];
            if (val && typeof val === 'object' && 'url' in val) {
               const serverUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || 'https://admin.nagalandunited.com';
               val = `${serverUrl}${val.url}`;
            } else if (val && typeof val === 'object') {
               val = JSON.stringify(val);
            }
            return `"${String(val || '').replace(/"/g, '""')}"`;
          });
          csvRows.push(row.join(','));
        }
        
        return new Response(csvRows.join('\n'), {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="trial_registrations.csv"',
          }
        });
      },
    }
  ],
  fields: [
    {
      name: 'fullName',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
    },
    {
      name: 'playerPosition',
      label: 'Player Position',
      type: 'text',
      required: false,
    },
    {
      name: 'dateOfBirth',
      label: 'Date of Birth',
      type: 'date',
      required: true,
      validate: (value) => {
        if (!value) return true;
        const dob = new Date(value as any);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age > 23) {
          return 'You must be 23 years old or younger to register.';
        }
        return true;
      },
      admin: {
        date: {
          displayFormat: 'dd-MM-yyyy',
          pickerAppearance: 'default',
        },
      },
    },
    {
      name: 'indigenousCertificate',
      label: 'Indigenous Certificate',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'downloadCert',
      type: 'ui',
      admin: {
        components: {
          Field: './components/DownloadLinks#DownloadCertificate',
        },
      },
    },
    {
      name: 'aadharCard',
      label: 'Aadhar Card',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'downloadAadhar',
      type: 'ui',
      admin: {
        components: {
          Field: './components/DownloadLinks#DownloadAadhar',
        },
      },
    },
    {
      name: 'crsNumber',
      label: 'CRS Number',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'location',
      type: 'text',
      defaultValue: 'RENPO LU ASTRO TURF Ungma, Mokokchung',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'address',
      label: 'Residential Address',
      type: 'textarea',
      required: true,
    },
    {
      name: 'eventDate',
      type: 'date',
      defaultValue: '2026-10-21T00:00:00.000Z',
      admin: {
        readOnly: true,
      },
    },
  ],
}
