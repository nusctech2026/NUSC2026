export const JERSEY_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Not sure'] as const
export type JerseySize = (typeof JERSEY_SIZES)[number]

export type JerseyInterestInput = {
  fullName: string
  email: string
  phone: string
  interestedInOfficial: boolean
  officialKitSize?: string
  interestedInAway: boolean
  awayKitSize?: string
  interestedInReserve: boolean
  reserveKitSize?: string
  usualSize?: string
  quantity: number
  notes?: string
  contactConsent: boolean
}

export type JerseyInterestValidation =
  | { success: true; data: JerseyInterestInput }
  | { success: false; error: string }

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function validateJerseyInterest(values: Record<string, unknown>): JerseyInterestValidation {
  const fullName = stringValue(values.fullName).trim().replace(/\s+/g, ' ')
  const email = stringValue(values.email).trim().toLowerCase()
  const phone = stringValue(values.phone).trim()
  const notes = stringValue(values.notes).trim().slice(0, 500)

  const interestedInOfficial = values.interestedInOfficial === true || values.interestedInOfficial === 'true' || values.interestedInOfficial === 'on'
  const interestedInAway = values.interestedInAway === true || values.interestedInAway === 'true' || values.interestedInAway === 'on'
  const interestedInReserve = values.interestedInReserve === true || values.interestedInReserve === 'true' || values.interestedInReserve === 'on'

  const officialKitSize = stringValue(values.officialKitSize).trim()
  const awayKitSize = stringValue(values.awayKitSize).trim()
  const reserveKitSize = stringValue(values.reserveKitSize).trim()
  const usualSize = stringValue(values.usualSize).trim()

  const rawQuantity = values.quantity
  const quantity = typeof rawQuantity === 'number' ? rawQuantity : Number(rawQuantity) || 1
  const contactConsent = values.contactConsent === true || values.contactConsent === 'on' || values.contactConsent === 'true'

  if (fullName.length < 2 || fullName.length > 100) {
    return { success: false, error: 'Enter your name (2 to 100 characters).' }
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Enter a valid email address.' }
  }
  if (phone.length > 30 || (phone !== '' && !/^[+\d() .-]{7,30}$/.test(phone))) {
    return { success: false, error: 'Enter a valid phone number or leave it blank.' }
  }

  // Must select at least one kit
  if (!interestedInOfficial && !interestedInAway && !interestedInReserve) {
    return { success: false, error: 'Please select at least one kit (Official, Away, or Reserve).' }
  }

  const validSizes: readonly string[] = [...JERSEY_SIZES, '']
  if (interestedInOfficial && officialKitSize && !validSizes.includes(officialKitSize)) {
    return { success: false, error: 'Invalid size selected for Official Kit.' }
  }
  if (interestedInAway && awayKitSize && !validSizes.includes(awayKitSize)) {
    return { success: false, error: 'Invalid size selected for Away Kit.' }
  }
  if (interestedInReserve && reserveKitSize && !validSizes.includes(reserveKitSize)) {
    return { success: false, error: 'Invalid size selected for Reserve Kit.' }
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    return { success: false, error: 'Choose a quantity from 1 to 10.' }
  }
  if (!contactConsent) {
    return { success: false, error: 'Please agree to receive updates about the NUSC jersey.' }
  }

  return {
    success: true,
    data: {
      fullName,
      email,
      phone,
      interestedInOfficial,
      officialKitSize: officialKitSize || 'Not sure',
      interestedInAway,
      awayKitSize: awayKitSize || 'Not sure',
      interestedInReserve,
      reserveKitSize: reserveKitSize || 'Not sure',
      usualSize: usualSize || officialKitSize || awayKitSize || reserveKitSize || 'Not sure',
      quantity,
      notes: notes || undefined,
      contactConsent,
    },
  }
}

