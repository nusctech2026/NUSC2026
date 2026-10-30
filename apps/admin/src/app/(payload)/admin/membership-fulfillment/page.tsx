import { assertStaffRole } from '../../../../utils/supabaseServerClient'
import {
  listMembershipFulfillmentOrders,
  MEMBERSHIP_FULFILLMENT_PAGE_SIZES,
  type MembershipFulfillmentOrdersPage,
} from '../../../../utils/membershipFulfillmentDb'
import { recoverMissingPremiumTicketsAction, retryMembershipTicketIssuanceAction } from './actions'

const dateTime = (value: string | null) => value
  ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
  : '\u2014'

const money = (paise: string, currency: string) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(Number(paise) / 100)

const badgeColors: Record<string, { background: string; color: string }> = {
  issued: { background: '#dcfce7', color: '#166534' },
  needs_reconciliation: { background: '#fef3c7', color: '#92400e' },
  refund_required: { background: '#fee2e2', color: '#991b1b' },
  issuing: { background: '#dbeafe', color: '#1e40af' },
  held: { background: '#e0e7ff', color: '#3730a3' },
  failed: { background: '#fee2e2', color: '#991b1b' },
  released: { background: '#f1f5f9', color: '#475569' },
}

export default async function MembershipFulfillmentPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string; pageSize?: string }>
}) {
  try {
    await assertStaffRole(['store_manager', 'membership_manager'])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const needsLogin = message.includes('Authentication required')
    const roleDenied = message.includes('Access denied')
    return (
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>Membership ticket fulfillment</h1>
        <p style={{ color: 'var(--theme-elevation-600)', lineHeight: 1.6 }}>
          {needsLogin
            ? 'Sign in with an authorized NUSC staff account to view membership ticket fulfillment.'
            : roleDenied
              ? 'Your account needs the super_admin, store_manager, or membership_manager role to view this page.'
              : 'We could not verify your staff access. Please try again or contact an administrator.'}
        </p>
        {needsLogin && <a href="/membership-login">Sign in to Membership Operations</a>}
      </main>
    )
  }

  const query = await searchParams
  let fulfillmentPage: MembershipFulfillmentOrdersPage
  try {
    fulfillmentPage = await listMembershipFulfillmentOrders({
      page: Number(query.page),
      pageSize: Number(query.pageSize),
    })
  } catch {
    return <main style={{ padding: 32 }}>Unable to load membership fulfillment records. Check the Admin database connection and membership migrations.</main>
  }
  const { orders, page, pageSize, hasNextPage } = fulfillmentPage

  const actionMessages: Record<string, { text: string; tone: string }> = {
    issued: { text: 'AHIBI issuance is complete and the ticket records were saved.', tone: '#166534' },
    pending: { text: 'Issuance is still pending. The order remains available for another safe retry.', tone: '#92400e' },
    needs_reconciliation: { text: 'AHIBI reports an issuance mismatch. Review the reservation and ticket records before retrying.', tone: '#92400e' },
    refund_required: { text: 'This order requires refund review. Ticket retry is blocked for this status.', tone: '#991b1b' },
    not_required: { text: 'This order is not eligible for AHIBI season pass issuance.', tone: '#991b1b' },
    'already-issued': { text: 'This order is already marked issued.', tone: '#166534' },
    recovered: { text: 'AHIBI recovery completed. All ten Premium tickets are saved on this order.', tone: '#166534' },
    'recovery-conflict': { text: 'AHIBI could not safely recover these tickets because the reservation or check-in state needs review. No recovery tickets were issued.', tone: '#92400e' },
    'recovery-pending': { text: 'AHIBI recovery could not be confirmed. The existing tickets were left in place; review the reservation before retrying.', tone: '#92400e' },
    'not-eligible': { text: 'Only paid Rise General and Rise Premium orders with a payment reference can be retried.', tone: '#991b1b' },
    invalid: { text: 'Invalid membership order.', tone: '#991b1b' },
    unavailable: { text: 'Unable to load this order for retry.', tone: '#991b1b' },
  }
  const actionMessage = query.action ? actionMessages[query.action] : null
  const paginationHref = (targetPage: number) => `?page=${targetPage}&pageSize=${pageSize}`

  return (
    <main style={{ maxWidth: 1440, margin: '0 auto', padding: '36px 20px' }}>
      <h1 style={{ fontSize: 30, margin: '0 0 8px' }}>Membership ticket fulfillment</h1>
      <p style={{ color: 'var(--theme-elevation-600)', margin: '0 0 24px', lineHeight: 1.6 }}>
        Review Rise General and Rise Premium payment orders, AHIBI issuance status, and the ten match tickets attached to each order. Retrying uses the existing paid order and AHIBI reservation; it does not create another charge.
      </p>
      {actionMessage && <p role="status" style={{ padding: 12, background: '#f8fafc', color: actionMessage.tone, borderRadius: 8 }}>{actionMessage.text}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20, padding: 14, border: '1px solid var(--theme-elevation-200)', borderRadius: 8 }}>
        <form method="get" action="/admin/membership-fulfillment" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label htmlFor="membership-fulfillment-page-size">Orders per page</label>
          <select id="membership-fulfillment-page-size" name="pageSize" defaultValue={String(pageSize)} style={{ padding: '7px 9px', border: '1px solid var(--theme-elevation-300)', borderRadius: 6 }}>
            {MEMBERSHIP_FULFILLMENT_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <button type="submit" style={buttonStyle}>Apply</button>
        </form>

        <nav aria-label="Membership fulfillment pages" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {page > 1
            ? <a href={paginationHref(page - 1)} style={paginationLinkStyle}>Previous</a>
            : <span aria-disabled="true" style={paginationDisabledStyle}>Previous</span>}
          <span>Page {page}</span>
          {hasNextPage
            ? <a href={paginationHref(page + 1)} style={paginationLinkStyle}>Next</a>
            : <span aria-disabled="true" style={paginationDisabledStyle}>Next</span>}
        </nav>
      </div>

      {!orders.length ? (
        <section style={{ border: '1px solid var(--theme-elevation-200)', borderRadius: 10, padding: 24 }}>
          No Rise General or Rise Premium tier orders were found.
        </section>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {orders.map((order) => {
            const retryAllowed = order.paymentStatus === 'paid'
              && Boolean(order.razorpayOrderId && order.paymentId)
              && Boolean(order.reservationId)
              && ((order.planSlug === 'rise-general' && order.passId === 'general-season')
                || (order.planSlug === 'rise-premium' && order.passId === 'premium-season'))
              && order.issuanceStatus !== 'issued'
              && order.issuanceStatus !== 'refund_required'
            const recoveryCandidate = order.paymentStatus === 'paid' && order.planSlug === 'rise-premium'
              && order.passId === 'premium-season' && order.issuanceStatus === 'issued'
              && Boolean(order.razorpayOrderId && order.paymentId && order.reservationId)
              && order.tickets.length === 8
            const badge = badgeColors[order.issuanceStatus] || { background: '#f1f5f9', color: '#475569' }
            return (
              <details key={order.orderId} style={{ border: '1px solid var(--theme-elevation-200)', borderRadius: 10, background: 'var(--theme-elevation-0)' }}>
                <summary style={{ cursor: 'pointer', padding: 18, listStylePosition: 'inside' }}>
                  <strong>{order.memberName || 'Name unavailable'}</strong>
                  <span style={{ color: 'var(--theme-elevation-600)' }}> {'\u00b7'} {order.membershipNumber || order.memberId} {'\u00b7'} {order.planName}</span>
                  <span style={{ display: 'inline-block', marginLeft: 10, padding: '3px 9px', borderRadius: 999, background: badge.background, color: badge.color, fontSize: 12, fontWeight: 700 }}>
                    {order.issuanceStatus.replaceAll('_', ' ')}
                  </span>
                </summary>
                <div style={{ padding: '0 20px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
                    <Info label="Member" value={`${order.memberName || '\u2014'} \u00b7 ${order.email || '\u2014'} \u00b7 ${order.phone || '\u2014'}`} />
                    <Info label="Tier" value={`${order.planName} (${order.planSlug})${order.zone ? ` \u00b7 ${order.zone}` : ''}`} />
                    <Info label="Payment" value={`${order.paymentStatus} \u00b7 ${money(order.amount, order.currency)} \u00b7 ${dateTime(order.paidAt)}`} />
                    <Info label="Razorpay payment ID" value={order.paymentId || '\u2014'} />
                    <Info label="NUSC order ID" value={order.orderId} />
                    <Info label="AHIBI reservation" value={order.reservationId || '\u2014'} />
                    <Info label="Ticket records" value={`${order.tickets.length} of 10`} />
                  </div>

                  {order.tickets.length ? (
                    <div style={{ overflowX: 'auto', marginBottom: 18 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                        <thead><tr>{['Match date', 'Opponent', 'Ticket type', 'Zone', 'AHIBI booking ID', 'Status'].map(label => (
                          <th key={label} style={{ textAlign: 'left', padding: '9px 8px', borderBottom: '1px solid var(--theme-elevation-200)', fontSize: 12 }}>{label}</th>
                        ))}</tr></thead>
                        <tbody>{order.tickets.map(ticket => (
                          <tr key={ticket.bookingId}>
                            <td style={cellStyle}>{ticket.matchDate}</td>
                            <td style={cellStyle}>{ticket.opponent}</td>
                            <td style={cellStyle}>{ticket.ticketType}</td>
                            <td style={cellStyle}>{ticket.zone || '\u2014'}</td>
                            <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{ticket.bookingId}</td>
                            <td style={cellStyle}>{ticket.status}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <p style={{ color: '#92400e' }}>No AHIBI ticket records are saved on this NUSC order.</p>}

                  {retryAllowed ? (
                    <form action={retryMembershipTicketIssuanceAction}>
                      <input type="hidden" name="orderId" value={order.orderId} />
                      <button type="submit" style={buttonStyle}>Retry AHIBI issuance</button>
                    </form>
                  ) : order.issuanceStatus === 'refund_required' ? (
                    <p role="note" style={{ color: '#991b1b', marginBottom: 0 }}>Do not retry issuance for this order. Review AHIBI reservation status and process the payment outcome through the refund/reconciliation procedure.</p>
                  ) : order.issuanceStatus === 'issued' ? (
                    <p style={{ color: '#166534', marginBottom: 0 }}>All available tickets are marked issued in NUSC.</p>
                  ) : order.paymentStatus !== 'paid' ? (
                    <p style={{ color: '#92400e', marginBottom: 0 }}>Retry is disabled until payment is confirmed as paid in NUSC.</p>
                  ) : <p style={{ color: '#92400e', marginBottom: 0 }}>Retry is unavailable until the payment and AHIBI order references are complete.</p>}
                  {recoveryCandidate && (
                    <div style={{ marginTop: 16, padding: 14, border: '1px solid #fbbf24', borderRadius: 8, background: '#fffbeb' }}>
                      <p style={{ margin: '0 0 10px', color: '#78350f', lineHeight: 1.5 }}>
                        This paid Premium upgrade has eight saved tickets. AHIBI will verify the two missing fixtures have no valid check-in before issuing replacements. This does not create a payment.
                      </p>
                      <form action={recoverMissingPremiumTicketsAction}>
                        <input type="hidden" name="orderId" value={order.orderId} />
                        <button type="submit" style={buttonStyle}>Recover two missing Premium tickets</button>
                      </form>
                    </div>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </main>
  )
}

const cellStyle = { padding: '9px 8px', borderBottom: '1px solid var(--theme-elevation-100)', fontSize: 13, whiteSpace: 'nowrap' } as const
const buttonStyle = { border: 0, borderRadius: 6, background: 'var(--theme-elevation-800)', color: 'var(--theme-elevation-0)', fontWeight: 600, padding: '10px 16px', cursor: 'pointer' } as const
const paginationLinkStyle = { color: 'var(--theme-elevation-800)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 } as const
const paginationDisabledStyle = { color: 'var(--theme-elevation-400)' } as const

function Info({ label, value }: { label: string; value: string }) {
  return <div style={{ minWidth: 0 }}><div style={{ color: 'var(--theme-elevation-500)', fontSize: 12, marginBottom: 4 }}>{label}</div><div style={{ overflowWrap: 'anywhere', fontSize: 13 }}>{value}</div></div>
}
