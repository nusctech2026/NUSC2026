'use client'

import { useRef, useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { submitJerseyInterest } from './actions'
import { JERSEY_SIZES, type JerseySize } from './validation'

type KitId = 'official' | 'away' | 'reserve'

type KitConfig = {
  id: KitId
  number: string
  tagLabel: string
  tag: string
  name: string
  edition: string
  editionType: 'black' | 'red' | 'navy'
  subBadge: string
  colorName: string
  dotColor: string
  quote: string
  tags: string[]
  frontImage: string
  backImage: string
  description: string
}

const SIZE_CHART = [
  { value: 'XS', size: 'XS / 34', chest: 36, length: 25 },
  { value: 'S', size: 'S / 36', chest: 38, length: 26 },
  { value: 'M', size: 'M / 38', chest: 40, length: 27 },
  { value: 'L', size: 'L / 40', chest: 42, length: 28 },
  { value: 'XL', size: 'XL / 42', chest: 44, length: 29 },
  { value: 'XXL', size: 'XXL / 44', chest: 46, length: 30 },
  { value: '3XL', size: '3XL / 46', chest: 48, length: 31 },
] as const

function JerseySizeTable({
  kitName,
  selectedSize,
  onSelectSize,
}: {
  kitName: string
  selectedSize: JerseySize
  onSelectSize: (size: JerseySize) => void
}) {
  return (
    <table className="identity-size-guide-table">
      <caption className="identity-visually-hidden">
        NUSC jersey size chart with chest and length measurements in inches.
      </caption>
      <thead>
        <tr>
          <th scope="col">Size</th>
          <th scope="col">Chest (in)</th>
          <th scope="col">Length (in)</th>
        </tr>
      </thead>
      <tbody>
        {SIZE_CHART.map((measurement) => (
          <tr key={measurement.size}>
            <th scope="row">
              <button
                type="button"
                className="identity-size-option"
                aria-label={`Select ${measurement.size} for ${kitName}`}
                aria-pressed={selectedSize === measurement.value}
                onClick={() => onSelectSize(measurement.value)}
              >
                {measurement.size}
              </button>
            </th>
            <td>{measurement.chest}</td>
            <td>{measurement.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const KITS: KitConfig[] = [
  {
    id: 'official',
    number: '01 / HOME',
    tagLabel: '2026/27 OFFICIAL KIT',
    tag: 'Official',
    name: 'Official Home Kit',
    edition: 'CLUB HERITAGE',
    editionType: 'black',
    subBadge: 'DR. T. AO LEGACY',
    colorName: 'Royal Navy & Pure White',
    dotColor: '#1d4ed8',
    quote: '“We play football, barefoot or booted.” — Dr. T. Ao',
    tags: ['Woven NUSC Crest', 'Naga Geometric Weave', 'Dr. T. Ao Tribute'],
    frontImage: '/images/jerseys/official-kit-front.webp',
    backImage: '/images/jerseys/official-kit-back.webp',
    description:
      'The flagship identity of Nagaland United. Featuring traditional geometric handloom weave motifs across the chest, royal navy sleeves, and the historic Dr. T. Ao inscription on the inner collar.',
  },
  {
    id: 'away',
    number: '02 / AWAY',
    tagLabel: '2026/27 AWAY KIT',
    tag: 'Away',
    name: 'Warrior Away Kit',
    edition: 'WARRIOR CRIMSON',
    editionType: 'red',
    subBadge: 'OFFICIAL BATTLE CRY',
    colorName: 'Scarlet Red & Shadow Black',
    dotColor: '#dc2626',
    quote: '“Rise Together, Unbroken.” — Kohima Motto',
    tags: ['Naga Spearhead Motif', 'Ancestral Shield Weave', 'Stealth Black Piping'],
    frontImage: '/images/jerseys/away-kit-front.webp',
    backImage: '/images/jerseys/away-kit-back.webp',
    description:
      'A ferocious away kit forged in warrior crimson and shadow black. Dynamic spearhead and tribal shield graphics down the body pay homage to ancestral courage and unyielding pride on rival turf.',
  },
  {
    id: 'reserve',
    number: '03 / RESERVE',
    tagLabel: '2026/27 RESERVE KIT',
    tag: 'Reserve',
    name: 'Reserve 3rd Kit',
    edition: 'GLACIAL SKY',
    editionType: 'navy',
    subBadge: 'HISTORIC UNITY SALUTE',
    colorName: 'Mountain Blue & Prism Armband',
    dotColor: '#0284c7',
    quote: '“Kuknalim” — Historic Unity Salute',
    tags: ['Glacial Sky Tone', 'Prismatic Rainbow Armband', '“Kuknalim” Collar Tribute'],
    frontImage: '/images/jerseys/reserve-kit-front.webp',
    backImage: '/images/jerseys/reserve-kit-back.webp',
    description:
      'Inspired by the high mountain skies and rolling mists of Nagaland. Accented by a symbolic rainbow armband band and charcoal geo trims, celebrating unity across all Naga tribes with "Kuknalim" in the collar.',
  },
]

export default function JerseyShowcaseClient() {
  const sizeChartDialogRef = useRef<HTMLDialogElement>(null)
  const [sizeChartKit, setSizeChartKit] = useState<KitId>('official')
  const [sizeChartSelectionMessage, setSizeChartSelectionMessage] = useState('')

  const [kitViews, setKitViews] = useState<Record<KitId, 'front' | 'back'>>({
    official: 'front',
    away: 'front',
    reserve: 'front',
  })

  const [selectedKits, setSelectedKits] = useState<Record<KitId, boolean>>({
    official: false,
    away: false,
    reserve: false,
  })

  const [kitSizes, setKitSizes] = useState<Record<KitId, JerseySize>>({
    official: 'L',
    away: 'L',
    reserve: 'L',
  })


  const [activeFilter, setActiveFilter] = useState<'all' | 'match' | 'replica'>('all')
  const [quantity, setQuantity] = useState<number>(1)
  const [error, setError] = useState<string>('')
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [isPending, startTransition] = useTransition()

  const selectedCount = Object.values(selectedKits).filter(Boolean).length
  const sizeChartKitName = KITS.find((kit) => kit.id === sizeChartKit)?.name ?? 'Official Home Kit'

  const toggleKitSelection = (id: KitId) => {
    setSelectedKits((prev) => {
      const updated = { ...prev, [id]: !prev[id] }
      const newCount = Object.values(updated).filter(Boolean).length
      if (newCount > 0) {
        setQuantity(newCount)
      }
      return updated
    })
    if (error) setError('')
  }

  const setView = (id: KitId, view: 'front' | 'back') => {
    setKitViews((prev) => ({ ...prev, [id]: view }))
  }

  const setSize = (id: KitId, size: JerseySize) => {
    setKitSizes((prev) => ({ ...prev, [id]: size }))
  }

  const setSizeChartTarget = (kitId: KitId) => {
    setSizeChartKit(kitId)
    setSizeChartSelectionMessage('')
  }

  const applyChartSize = (size: JerseySize) => {
    setSize(sizeChartKit, size)
    const chartLabel = SIZE_CHART.find((measurement) => measurement.value === size)?.size ?? size
    setSizeChartSelectionMessage(`${chartLabel} selected for ${sizeChartKitName}.`)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedCount === 0) {
      setError('Please select at least one kit (Official, Away, or Reserve) above.')
      const showcaseSection = document.getElementById('kits-showcase')
      showcaseSection?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)

    formData.set('interestedInOfficial', String(selectedKits.official))
    if (selectedKits.official) formData.set('officialKitSize', kitSizes.official)

    formData.set('interestedInAway', String(selectedKits.away))
    if (selectedKits.away) formData.set('awayKitSize', kitSizes.away)

    formData.set('interestedInReserve', String(selectedKits.reserve))
    if (selectedKits.reserve) formData.set('reserveKitSize', kitSizes.reserve)

    formData.set('quantity', String(quantity))

    setError('')
    startTransition(async () => {
      try {
        const result = await submitJerseyInterest(formData)
        if (result.success) {
          setSubmitted(true)
          const registerAnchor = document.getElementById('registration-section')
          registerAnchor?.scrollIntoView({ behavior: 'smooth' })
        } else {
          setError(result.error)
        }
      } catch {
        setError('We could not save your interest. Please check your connection and try again.')
      }
    })
  }

  return (
    <div className="identity-experience">
      {/* Main Showcase Section */}
      <section id="kits-showcase" className="identity-showcase-section" aria-label="NUSC Jersey Collection Kits">
        {/* Section Header */}
        <div className="identity-header-block">
          <h1 className="identity-main-title">Wear your NUSC pride.</h1>
          <p className="identity-main-desc">
            Interested in one? Join the list and we’ll share the details and availability once they’re confirmed.
          </p>
        </div>

        {/* 3-Column Identity Cards Grid */}
        <div className="identity-cards-grid">
          {KITS.map((kit) => {
            const isSelected = selectedKits[kit.id]
            const currentView = kitViews[kit.id]
            const currentSize = kitSizes[kit.id]

            return (
              <article
                key={kit.id}
                className={`identity-card ${isSelected ? 'is-selected' : ''}`}
              >
                {/* Upper Media Box */}
                <div className="identity-card-media">
                  {/* Kit Type Tag - Top Right */}
                  <span className="identity-kit-type-tag">
                    {kit.tag}
                  </span>

                  {/* Jersey Photography */}
                  <div className="identity-image-stage">
                    <img
                      src={kit.frontImage}
                      alt={`${kit.name} - Front view`}
                      className={`identity-jersey-img ${currentView === 'front' ? 'is-visible' : 'is-hidden'}`}
                      loading="eager"
                      decoding="async"
                    />
                    <img
                      src={kit.backImage}
                      alt={`${kit.name} - Back view`}
                      className={`identity-jersey-img ${currentView === 'back' ? 'is-visible' : 'is-hidden'}`}
                      loading="eager"
                      decoding="async"
                    />

                    {/* Quick View Angle Switcher - Bottom Right */}
                    <div className="identity-view-switcher">
                      <button
                        type="button"
                        className={`identity-switch-btn ${currentView === 'front' ? 'active' : ''}`}
                        onClick={() => setView(kit.id, 'front')}
                      >
                        Front
                      </button>
                      <button
                        type="button"
                        className={`identity-switch-btn ${currentView === 'back' ? 'active' : ''}`}
                        onClick={() => setView(kit.id, 'back')}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lower Card Content Section */}
                <div className="identity-card-body">
                  {/* Clean Kit Title */}
                  <div className="identity-name-row">
                    <h3 className="identity-kit-name">{kit.name}</h3>
                  </div>

                  <p className="identity-kit-colorway">{kit.colorName}</p>

                  {/* Size Selector */}
                  <div className="identity-size-block" aria-label={`Select estimated size for ${kit.name}`}>
                    <div className="identity-size-header">
                      <span className="identity-size-label">SIZE</span>
                      <span className="identity-size-selected-val" aria-live="polite" aria-atomic="true">
                        {currentSize}
                      </span>
                    </div>
                    <div className="identity-size-pills">
                      {JERSEY_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={`identity-size-pill ${currentSize === size ? 'active' : ''}`}
                          onClick={() => setSize(kit.id, size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="identity-size-chart-trigger"
                      aria-haspopup="dialog"
                      aria-controls="jersey-size-chart-dialog"
                      aria-label={`View size chart for ${kit.name}`}
                      onClick={() => {
                        setSizeChartTarget(kit.id)
                        sizeChartDialogRef.current?.showModal()
                      }}
                    >
                      View size chart
                    </button>
                  </div>

                  {/* Action Button: Pill CTA */}
                  <div className="identity-action-row">
                    <button
                      type="button"
                      className={`identity-select-cta ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleKitSelection(kit.id)}
                      aria-pressed={isSelected}
                    >
                      {isSelected ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="identity-btn-svg" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Selected ({currentSize})</span>
                        </>
                      ) : (
                        <>
                          <span className="identity-btn-plus" aria-hidden="true">+</span>
                          <span>Select Kit</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* Floating Sticky Bottom Bar for Quick Action */}
      {selectedCount > 0 && !submitted && (
        <aside className="identity-sticky-bar" aria-label="Selection summary">
          <div className="identity-sticky-inner">
            <div className="identity-sticky-summary">
              <span className="identity-sticky-count">
                <strong>{selectedCount}</strong> {selectedCount === 1 ? 'KIT SELECTED' : 'KITS SELECTED'}:
              </span>
              <span className="identity-sticky-kits">
                {KITS.filter((k) => selectedKits[k.id])
                  .map((k) => `${k.name} (${kitSizes[k.id]})`)
                  .join(', ')}
              </span>
            </div>
            <a href="#registration-section" className="identity-sticky-cta">
              COMPLETE PRE-ORDER INTEREST &darr;
            </a>
          </div>
        </aside>
      )}

      {/* Registration Form Section */}
      <section id="registration-section" className="identity-registration-section" aria-labelledby="form-heading">
        <div className={`identity-form-container ${submitted ? 'is-submitted' : ''}`}>
          {submitted ? (
            <div className="identity-success-panel" role="status" aria-live="polite">
              <div className="identity-success-icon-wrap" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="identity-success-title">Pre-Order Interest Recorded</h2>
              <p className="identity-success-message">
                Thank you for supporting Nagaland United. Your interest and estimated sizing have been recorded to help us determine manufacturing quantities. You will be notified when official sales launch.
              </p>

              <div className="identity-success-summary-box">
                <span className="identity-summary-label">LOGGED ALLOCATION</span>
                <div className="identity-summary-kits-list">
                  {KITS.filter((k) => selectedKits[k.id]).map((k) => (
                    <div key={k.id} className="identity-summary-kit-row">
                      <div className="identity-summary-kit-name">
                        <span className="identity-color-dot" style={{ backgroundColor: k.dotColor }} />
                        <strong>{k.name}</strong>
                      </div>
                      <span className="identity-summary-kit-size">Size: <strong>{kitSizes[k.id]}</strong></span>
                    </div>
                  ))}
                </div>
                <div className="identity-summary-quantity">
                  <span>Total Allocation:</span>
                  <strong>{quantity} units</strong>
                </div>
              </div>

              <div className="identity-success-actions">
                <Link href="/" className="identity-btn-dark">
                  Return to Club Home
                </Link>
                <button
                  type="button"
                  className="identity-btn-outline"
                  onClick={() => {
                    setSubmitted(false)
                    setSelectedKits({ official: false, away: false, reserve: false })
                  }}
                >
                  Register Another Preference
                </button>
              </div>
            </div>
          ) : (
            <div className="identity-registration-layout">
              <div className="identity-form-card">
                <div className="identity-form-header">
                  <h2 id="form-heading" className="identity-form-title">
                    Register Your Pre-Order Interest
                  </h2>
                  <p className="identity-form-subtitle">
                    No payment required today &mdash; submitting ensures priority early-bird notification when official orders open.
                  </p>
                </div>

                {/* Selected Kits Overview Inside Form */}
                <div className="identity-form-kits-summary">
                  <span className="identity-form-summary-label">SELECTED KITS:</span>
                  {selectedCount === 0 ? (
                    <div className="identity-no-kit-warning">
                      <span>No kits selected yet.</span>
                      <a href="#kits-showcase" className="identity-choose-link">
                        Select kits above &uarr;
                      </a>
                    </div>
                  ) : (
                    <div className="identity-chips-wrap">
                      {KITS.filter((k) => selectedKits[k.id]).map((k) => (
                        <div key={k.id} className="identity-selected-chip">
                          <span className="identity-color-dot" style={{ backgroundColor: k.dotColor }} />
                          <span className="identity-chip-text">
                            <strong>{k.name}</strong> &bull; Size {kitSizes[k.id]}
                          </span>
                          <button
                            type="button"
                            className="identity-chip-remove"
                            onClick={() => toggleKitSelection(k.id)}
                            aria-label={`Remove ${k.name}`}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="identity-main-form" noValidate>
                  {/* Honeypot anti-spam trap */}
                  <div className="identity-trap" aria-hidden="true">
                    <label htmlFor="jersey-website">Website (leave empty)</label>
                    <input id="jersey-website" name="website" tabIndex={-1} autoComplete="off" />
                  </div>

                  <div className="identity-field-grid">
                    {/* Full Name */}
                    <div className="identity-field">
                      <label htmlFor="jersey-fullname">
                        FULL NAME <span className="identity-required">*</span>
                      </label>
                      <input
                        id="jersey-fullname"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        placeholder="e.g. Temsu Ao"
                        minLength={2}
                        maxLength={100}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div className="identity-field">
                      <label htmlFor="jersey-email">
                        EMAIL ADDRESS <span className="identity-required">*</span>
                      </label>
                      <input
                        id="jersey-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="e.g. temsu@nagalandunited.com"
                        maxLength={254}
                        required
                      />
                    </div>

                    {/* Phone / WhatsApp */}
                    <div className="identity-field">
                      <label htmlFor="jersey-phone">
                        WHATSAPP / PHONE <span className="identity-sublabel">(Optional)</span>
                      </label>
                      <input
                        id="jersey-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+91 98765 43210"
                        maxLength={30}
                      />
                    </div>

                    {/* Quantity estimate */}
                    <div className="identity-field">
                      <label htmlFor="jersey-quantity">
                        LIKELY QUANTITY
                      </label>
                      <select
                        id="jersey-quantity"
                        name="quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'jersey' : 'jerseys'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div className="identity-form-error" role="alert">
                      <span className="identity-error-icon">!</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Consent Checkbox */}
                  <label className="identity-consent-row">
                    <input type="checkbox" name="contactConsent" required defaultChecked />
                    <span>
                      No order just yet. We’re still working out the details. Signing up lets us know you’re interested; it doesn’t reserve a jersey or commit you to buy.
                    </span>
                  </label>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    className="identity-submit-btn"
                    disabled={isPending || selectedCount === 0}
                  >
                    {isPending ? (
                      <span className="identity-btn-spinner-wrap">
                        <span className="identity-spinner" />
                        <span>RECORDING INTEREST...</span>
                      </span>
                    ) : (
                      <span>SUBMIT PRE-ORDER INTEREST &rarr;</span>
                    )}
                  </button>

                  <p className="identity-privacy-note">
                    Official Nagaland United Sports Club communication &bull; Society Reg. No. HOME/SRC-7926 &bull; Rise Together
                  </p>
                </form>
                </div>

              <aside className="identity-size-guide" aria-labelledby="size-chart-heading">
                <div className="identity-size-guide-header">
                  <div>
                    <span className="identity-size-guide-kicker">SIZE GUIDE</span>
                    <h2 id="size-chart-heading" className="identity-size-guide-title">Find your size</h2>
                  </div>
                  <p id="size-chart-note" className="identity-size-guide-note">
                    Measurements are in inches. Choose a kit to update, then tap its size in the table.
                  </p>
                </div>

                <div className="identity-size-guide-target">
                  <label htmlFor="identity-size-guide-target">Apply sizes to</label>
                  <select
                    id="identity-size-guide-target"
                    value={sizeChartKit}
                    onChange={(event) => {
                      const selectedKit = KITS.find((kit) => kit.id === event.currentTarget.value)
                      if (selectedKit) setSizeChartTarget(selectedKit.id)
                    }}
                  >
                    {KITS.map((kit) => (
                      <option key={kit.id} value={kit.id}>{kit.name}</option>
                    ))}
                  </select>
                </div>

                <JerseySizeTable
                  kitName={sizeChartKitName}
                  selectedSize={kitSizes[sizeChartKit]}
                  onSelectSize={applyChartSize}
                />
                <p className="identity-size-guide-footnote" role="status" aria-live="polite">
                  {sizeChartSelectionMessage || 'Selecting a size updates this kit. Use its card button to add it to your interest list.'}
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>

      <dialog
        ref={sizeChartDialogRef}
        id="jersey-size-chart-dialog"
        className="identity-size-dialog"
        aria-labelledby="jersey-size-chart-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
      >
        <div className="identity-size-dialog-inner">
          <div className="identity-size-dialog-header">
            <div>
              <span className="identity-size-guide-kicker">SIZE GUIDE</span>
              <h2 id="jersey-size-chart-dialog-title" className="identity-size-guide-title">
                Find your size
              </h2>
            </div>
            <button
              type="button"
              className="identity-size-dialog-close"
              aria-label="Close size chart"
              onClick={() => sizeChartDialogRef.current?.close()}
            >
              Close
            </button>
          </div>
          <p className="identity-size-guide-note">
            For {sizeChartKitName}. Tap a size label below to apply it to this jersey. Measurements are in inches.
          </p>
          <JerseySizeTable
            kitName={sizeChartKitName}
            selectedSize={kitSizes[sizeChartKit]}
            onSelectSize={(size) => {
              applyChartSize(size)
              sizeChartDialogRef.current?.close()
            }}
          />
          <p className="identity-size-guide-footnote">
            Use “Select this kit” on its card to add it to your interest list.
          </p>
        </div>
      </dialog>
    </div>
  )
}
