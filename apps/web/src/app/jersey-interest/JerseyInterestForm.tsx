'use client'

import { useState } from 'react'
import { submitJerseyInterest } from './actions'
import './jersey-interest.css'

export default function JerseyInterestForm() {
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError('')
    try {
      const result = await submitJerseyInterest(formData)
      if (result.success) setSubmitted(true)
      else setError(result.error)
    } catch {
      setError('We could not save your interest. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (submitted) {
    return (
      <div className="jersey-interest-success" role="status" aria-live="polite">
        <span className="jersey-interest-success-mark" aria-hidden="true">✓</span>
        <h2>Thanks. We’ll keep you posted.</h2>
        <p>We’ll get in touch when the jersey details are ready. You haven’t reserved a jersey or committed to buy.</p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="jersey-interest-form">
      <div className="jersey-interest-field">
        <label htmlFor="jersey-full-name">Full name <span aria-hidden="true">*</span></label>
        <input id="jersey-full-name" name="fullName" autoComplete="name" maxLength={100} required />
      </div>

      <div className="jersey-interest-field">
        <label htmlFor="jersey-email">Email address <span aria-hidden="true">*</span></label>
        <input id="jersey-email" name="email" type="email" autoComplete="email" maxLength={254} required />
      </div>

      <div className="jersey-interest-field">
        <label htmlFor="jersey-phone">Phone / WhatsApp</label>
        <input id="jersey-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} />
      </div>

      <div className="jersey-interest-row">
        <div className="jersey-interest-field">
          <label htmlFor="jersey-size">Usual jersey size <span className="jersey-interest-optional">Estimate only</span></label>
          <select id="jersey-size" name="usualSize" defaultValue="">
            <option value="">Select a size</option>
            {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Not sure'].map((size) => <option key={size}>{size}</option>)}
          </select>
          <small>We don’t have the final size chart yet.</small>
        </div>

        <div className="jersey-interest-field jersey-interest-quantity">
          <label htmlFor="jersey-quantity">Likely quantity</label>
          <select id="jersey-quantity" name="quantity" defaultValue="1">
            {[1, 2, 3, 4, 5].map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}
          </select>
        </div>
      </div>

      <div className="jersey-interest-trap" aria-hidden="true">
        <label htmlFor="jersey-website">Leave this field blank</label>
        <input id="jersey-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && <p className="jersey-interest-error" role="alert">{error}</p>}

      <label className="jersey-interest-consent">
        <input type="checkbox" name="contactConsent" required />
        <span>Please contact me with NUSC jersey updates. I understand this doesn’t place an order.</span>
      </label>

      <button className="jersey-interest-submit" type="submit" disabled={pending}>
        {pending ? 'Adding you to the list…' : 'Keep me posted'}
      </button>
      <p className="jersey-interest-privacy">We’ll only use your details to send NUSC jersey updates.</p>
    </form>
  )
}
