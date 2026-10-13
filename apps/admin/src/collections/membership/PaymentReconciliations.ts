import { CollectionConfig } from 'payload'

export const PaymentReconciliations: CollectionConfig = {
  slug: 'payment_reconciliations',
  admin: {
    useAsTitle: 'order_id',
    group: 'Membership',
    defaultColumns: ['order_id', 'duplicate_payment_id', 'amount', 'reason', 'status', 'refund_id', 'created_at'],
    description: 'Durable payment audit records for duplicate or orphaned charges requiring manual refund / review.',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'member_id',
      type: 'text',
      admin: {
        description: 'Associated Member UUID',
      },
    },
    {
      name: 'order_id',
      type: 'text',
      required: true,
    },
    {
      name: 'existing_payment_id',
      type: 'text',
      required: true,
    },
    {
      name: 'duplicate_payment_id',
      type: 'text',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'INR',
    },
    {
      name: 'reason',
      type: 'text',
      required: true,
      defaultValue: 'duplicate_financial_charge',
    },
    {
      name: 'status',
      type: 'text',
      required: true,
      defaultValue: 'requires_manual_refund',
    },
    {
      name: 'refund_id',
      type: 'text',
      admin: {
        description: 'Razorpay Refund ID (e.g. rfh_xxx) once processed',
      },
    },
    {
      name: 'refund_processed_at',
      type: 'date',
      admin: {
        description: 'Timestamp when refund was executed in Razorpay',
      },
    },
    {
      name: 'metadata',
      type: 'json',
    },
    {
      name: 'created_at',
      type: 'date',
    },
    {
      name: 'updated_at',
      type: 'date',
    },
  ],
}
