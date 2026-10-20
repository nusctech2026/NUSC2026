'use server'

type SubmitResult = { success: true } | { success: false; error: string }

const allowedSizes = new Set(['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Not sure'])

export async function submitJerseyInterest(formData: FormData): Promise<SubmitResult> {
  const fullName = String(formData.get('fullName') ?? '').trim().replace(/\s+/g, ' ')
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()
  const usualSize = String(formData.get('usualSize') ?? '').trim()
  const quantity = Number(formData.get('quantity'))
  const contactConsent = formData.get('contactConsent') === 'on'
  const website = String(formData.get('website') ?? '').trim()

  if (website) return { success: true }
  if (fullName.length < 2 || fullName.length > 100) {
    return { success: false, error: 'Enter your name (2 to 100 characters).' }
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Enter a valid email address.' }
  }
  if (phone.length > 30 || (phone && !/^[+\d()\s.-]{7,30}$/.test(phone))) {
    return { success: false, error: 'Enter a valid phone number or leave it blank.' }
  }
  if (!allowedSizes.has(usualSize)) {
    return { success: false, error: 'Choose a size estimate from the list.' }
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
    return { success: false, error: 'Choose a quantity from 1 to 5.' }
  }
  if (!contactConsent) {
    return { success: false, error: 'Please agree to receive updates about the NUSC jersey.' }
  }

  const payloadUrl = (process.env.PAYLOAD_URL || process.env.NEXT_PUBLIC_PAYLOAD_URL || '').replace(/\/$/, '')
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
        usualSize: usualSize || undefined,
        quantity,
        contactConsent: true,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Jersey interest submission failed with Payload status:', response.status)
      return { success: false, error: 'We could not save your interest. Please try again.' }
    }

    return { success: true }
  } catch {
    console.error('Jersey interest submission could not reach Payload.')
    return { success: false, error: 'We could not save your interest. Please try again later.' }
  }
}
