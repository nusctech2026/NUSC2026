import fs from 'fs'

let config = fs.readFileSync('src/payload.config.ts', 'utf8')

const views = [
  'Fulfilment', 'Payments', 'Returns', 'Inventory', 'Products', 
  'Categories', 'ProductVariants', 'ProductImages', 'Coupons', 
  'Collections', 'Roles', 'Staff', 'Integrations', 'AuditLogs', 'SystemHealth'
]

views.forEach(view => {
  const regex = new RegExp(`Custom${view}: \\{\\s*path: '.*?',\\s*Component: '\\./components/views/CustomAdminView#CustomAdminView',\\s*\\}`, 'g')
  
  let routePath = view.toLowerCase()
  if (view === 'ProductVariants') routePath = 'product-variants'
  if (view === 'ProductImages') routePath = 'product-images'
  if (view === 'AuditLogs') routePath = 'audit-logs'
  if (view === 'SystemHealth') routePath = 'system-health'

  const replacement = `Custom${view}: {
          path: '/${routePath}',
          Component: './components/views/${view}View#${view}View',
        }`
  
  config = config.replace(regex, replacement)
})

fs.writeFileSync('src/payload.config.ts', config)
console.log('payload.config.ts updated')
