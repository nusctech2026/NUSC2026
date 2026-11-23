import { CollectionConfig } from 'payload'

export const Fixtures: CollectionConfig = {
  slug: 'fixtures',
  labels: {
    singular: 'Fixture / Result',
    plural: 'Fixtures & Results',
  },
  admin: {
    useAsTitle: 'opponent',
    group: 'Website Content',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'opponent',
      type: 'text',
      required: true,
    },
    {
      name: 'dateTime',
      label: 'Date and Time',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      required: true,
    },
    {
      name: 'homeAway',
      label: 'Home or Away',
      type: 'radio',
      options: [
        { label: 'Home', value: 'home' },
        { label: 'Away', value: 'away' },
      ],
      defaultValue: 'home',
    },
    {
      name: 'homeTeamLogo',
      label: 'Home Club Logo',
      type: 'upload',
      relationTo: 'website-media',
      admin: {
        description: 'Shown as the home team crest in the homepage fixture table and match cards. If NUSC is away, upload the opponent crest here.',
      },
    },
    {
      name: 'awayTeamLogo',
      label: 'Away Club Logo',
      type: 'upload',
      relationTo: 'website-media',
      admin: {
        description: 'Shown as the away team crest in the homepage fixture table and match cards. If NUSC is away, upload the NUSC crest here.',
      },
    },
    {
      name: 'venue',
      type: 'text',
    },
    {
      name: 'competition',
      type: 'text',
    },
    {
      name: 'matchStatus',
      label: 'Match Status',
      type: 'select',
      options: [
        { label: 'Upcoming', value: 'upcoming' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Postponed', value: 'postponed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'upcoming',
      admin: {
        position: 'sidebar',
        description: 'Upcoming fixtures appear in the homepage Next Match card. Completed fixtures appear in Latest Result.',
      },
    },
    {
      name: 'scoreResult',
      label: 'Score / Result',
      type: 'text',
      admin: {
        description: 'Final score in home-away order, for example 2-1 (W). Required for the homepage result card.',
      },
    },
    {
      name: 'matchReport',
      type: 'relationship',
      relationTo: 'news',
      hasMany: false,
      admin: {
        description: 'Link to a news article match report.',
      },
    },
  ],
}
