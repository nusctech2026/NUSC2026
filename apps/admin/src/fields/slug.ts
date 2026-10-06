import { Field } from 'payload'

export const slugField = (fieldToUse: string = 'title'): Field => ({
  name: 'slug',
  label: 'Slug',
  type: 'text',
  index: true,
  admin: {
    position: 'sidebar',
  },
  hooks: {
    beforeValidate: [
      ({ value, originalDoc, data }) => {
        if (typeof value === 'string') {
          return value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
        }
        const fallbackData = data?.[fieldToUse] || originalDoc?.[fieldToUse]
        if (fallbackData && typeof fallbackData === 'string') {
          return fallbackData.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
        }
        return value
      },
    ],
  },
})
