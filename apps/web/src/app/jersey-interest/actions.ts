'use server'

import { validateJerseyInterest } from './validation'

type SubmitResult = { success: true } | { success: false; error: string }

export async function submitJerseyInterest(formData: FormData): Promise<SubmitResult> {
  const website = formData.get('website')

  if (typeof website === 'string' && website.trim()) return { success: true }

  const validation = validateJerseyInterest({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    interestedInOfficial: formData.get('interestedInOfficial'),
    officialKitSize: formData.get('officialKitSize'),
    interestedInAway: formData.get('interestedInAway'),
    awayKitSize: formData.get('awayKitSize'),
    interestedInReserve: formData.get('interestedInReserve'),
    reserveKitSize: formData.get('reserveKitSize'),
    usualSize: formData.get('usualSize'),
    quantity: formData.get('quantity'),
    notes: formData.get('notes'),
    contactConsent: formData.get('contactConsent'),
  })
  if (!validation.success) return validation
  const {
    fullName,
    email,
    phone,
    interestedInOfficial,
    officialKitSize,
    interestedInAway,
    awayKitSize,
    interestedInReserve,
    reserveKitSize,
    usualSize,
    quantity,
    notes,
  } = validation.data

  const defaultUrl = process.env.NODE_ENV === 'production' ? 'https://admin.nagalandunited.com' : 'http://localhost:3001'
  const payloadUrl = (process.env.PAYLOAD_URL || process.env.NEXT_PUBLIC_PAYLOAD_URL || defaultUrl).replace(/\/$/, '')
  if (!payloadUrl) {
    console.error('Jersey interest submission is unavailable: Payload URL is not configured.')
    return { success: false, error: 'The form is temporarily unavailable. Please try again later.' }
  }

  try {
    const response = await fetch(`${payloadUrl}/api/jersey-interest-registrations?depth=0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        phone: phone || undefined,
        interestedInOfficial,
        officialKitSize: interestedInOfficial ? officialKitSize : undefined,
        interestedInAway,
        awayKitSize: interestedInAway ? awayKitSize : undefined,
        interestedInReserve,
        reserveKitSize: interestedInReserve ? reserveKitSize : undefined,
        usualSize: usualSize || undefined,
        quantity,
        notes: notes || undefined,
        contactConsent: true,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '')
      if (
        response.status === 409 ||
        (/email/i.test(responseBody) && /unique|duplicate|already/i.test(responseBody))
      ) {
        return { success: false, error: 'You have already shared interest with this email address.' }
      }
      console.error('Jersey interest submission failed with Payload status:', response.status, responseBody)
      return { success: false, error: 'We could not save your interest. Please try again.' }
    }

    return { success: true }
  } catch (err) {
    console.error('Jersey interest submission could not reach Payload:', err)
    return { success: false, error: 'We could not save your interest. Please try again later.' }
  }
}

