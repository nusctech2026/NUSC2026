import fs from 'fs';
import path from 'path';

const collectionsDir = 'd:/projects/NUSC/apps/admin/src/collections';
const globalsDir = 'd:/projects/NUSC/apps/admin/src/globals';

if (!fs.existsSync(globalsDir)) {
    fs.mkdirSync(globalsDir);
}

const templates = {
    'StoreCollections.ts': import type { CollectionConfig } from 'payload'

export const StoreCollections: CollectionConfig = {
  slug: 'store-collections',
  admin: {
    useAsTitle: 'name',
    group: 'Store',
    labels: { singular: 'Collection', plural: 'Collections' },
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
  ],
}
,
    'Inventory.ts': import type { CollectionConfig } from 'payload'

export const Inventory: CollectionConfig = {
  slug: 'inventory',
  admin: {
    group: 'Store',
  },
  access: {
    create: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products' },
    { name: 'stock', type: 'number' },
  ],
}
,
    'Orders.ts': import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    group: 'Store',
  },
  access: {
    create: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'order_number', type: 'text' },
    { name: 'total', type: 'number' },
    { name: 'status', type: 'select', options: ['pending', 'paid', 'shipped', 'cancelled'] },
  ],
}
,
    'Fulfilment.ts': import type { CollectionConfig } from 'payload'

export const Fulfilment: CollectionConfig = {
  slug: 'fulfilment',
  admin: {
    group: 'Store',
  },
  access: {
    create: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders' },
    { name: 'status', type: 'select', options: ['packing', 'shipped', 'delivered'] },
    { name: 'tracking_number', type: 'text' },
  ],
}
,
    'Payments.ts': import type { CollectionConfig } from 'payload'

export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    group: 'Store',
  },
  access: {
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders' },
    { name: 'amount', type: 'number' },
    { name: 'status', type: 'select', options: ['success', 'failed', 'pending'] },
  ],
}
,
    'Returns.ts': import type { CollectionConfig } from 'payload'

export const Returns: CollectionConfig = {
  slug: 'returns',
  admin: {
    group: 'Store',
    labels: { singular: 'Return & Refund', plural: 'Returns & Refunds' },
  },
  access: {
    create: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders' },
    { name: 'status', type: 'select', options: ['requested', 'approved', 'refunded', 'rejected'] },
  ],
}
,
    'Roles.ts': import type { CollectionConfig } from 'payload'

export const Roles: CollectionConfig = {
  slug: 'roles',
  admin: {
    group: 'Administration',
    useAsTitle: 'name',
    labels: { singular: 'Role & Permission', plural: 'Roles & Permissions' },
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'permissions', type: 'json' },
  ],
}
,
    'AuditLogs.ts': import type { CollectionConfig } from 'payload'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    group: 'Administration',
  },
  access: {
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'action', type: 'text' },
    { name: 'entity', type: 'text' },
    { name: 'details', type: 'json' },
  ],
}

};

const globalTemplates = {
    'Integrations.ts': import type { GlobalConfig } from 'payload'

export const Integrations: GlobalConfig = {
  slug: 'integrations',
  admin: {
    group: 'Administration',
  },
  fields: [
    { name: 'razorpay_enabled', type: 'checkbox' },
    { name: 'ahibi_sync_enabled', type: 'checkbox' },
  ],
}
,
    'SystemHealth.ts': import type { GlobalConfig } from 'payload'

export const SystemHealth: GlobalConfig = {
  slug: 'system-health',
  admin: {
    group: 'Administration',
  },
  access: {
    update: () => false,
  },
  fields: [
    { name: 'status', type: 'text', defaultValue: 'All systems operational' },
    { name: 'last_sync', type: 'date' },
  ],
}

};

// Write collections
for (const [filename, content] of Object.entries(templates)) {
    fs.writeFileSync(path.join(collectionsDir, filename), content);
}

// Write globals
for (const [filename, content] of Object.entries(globalTemplates)) {
    fs.writeFileSync(path.join(globalsDir, filename), content);
}

console.log('Files created.');
