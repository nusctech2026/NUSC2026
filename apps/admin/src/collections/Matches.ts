import type { CollectionConfig } from 'payload'

export const Matches: CollectionConfig = {
  slug: 'matches',
  admin: {
    useAsTitle: 'opponent',
  },
  access: {
    read: () => true, // You may want to lock this down to admins later
  },
  fields: [
    {
      name: 'opponent',
      type: 'text',
      required: true,
    },
    {
      name: 'matchDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'venue',
      type: 'text',
      required: true,
    },
    {
      name: 'ahibiEventId',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'scheduled',
      required: true,
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Ongoing', value: 'ongoing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ],
}
