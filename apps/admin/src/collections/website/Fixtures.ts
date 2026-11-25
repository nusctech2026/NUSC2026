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
      label: 'NUSC Home or Away',
      type: 'radio',
      options: [
        { label: 'Home', value: 'home' },
        { label: 'Away', value: 'away' },
      ],
      defaultValue: 'home',
      admin: {
        description: 'Whether NUSC is the home or away team. Match cards position the team crests to match this setting.',
      },
    },
    {
      name: 'homeTeamLogo',
      label: 'NUSC Club Logo',
      type: 'upload',
      relationTo: 'website-media',
      admin: {
        description: 'NUSC crest for both home and away fixtures. Match cards place it on the side set by NUSC Home or Away.',
      },
    },
    {
      name: 'awayTeamLogo',
      label: 'Opponent Club Logo',
      type: 'upload',
      relationTo: 'website-media',
      admin: {
        description: 'Crest for the opponent named in Opponent. Match cards place it on the side opposite NUSC.',
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
