import fs from 'fs';
let c = fs.readFileSync('src/collections/Admins.ts', 'utf8');
c = c.replace(/\/\/ \{\n\s*\/\/   name: 'display_roles',\n\s*\/\/   type: 'join',\n\s*\/\/   collection: 'admins_display_roles',\n\s*\/\/   on: 'parent',\n\s*\/\/ \},/g, 
`    {
      name: 'display_roles',
      type: 'join',
      collection: 'admins_display_roles',
      on: 'parent',
    },`);
fs.writeFileSync('src/collections/Admins.ts', c);
console.log('Restored display_roles');
