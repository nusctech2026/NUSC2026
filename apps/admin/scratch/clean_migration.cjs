const fs = require('fs');
let c = fs.readFileSync('src/migrations/20261003_092829_phase_2_website.ts', 'utf8');

c = c.replace(/CREATE TABLE "admins" [\s\S]*?\);\n/g, '');
c = c.replace(/CREATE TABLE "admins_sessions" [\s\S]*?\);\n/g, '');
c = c.replace(/CREATE TABLE "admins_display_roles" [\s\S]*?\);\n/g, '');
c = c.replace(/DROP TABLE "users" CASCADE;\n/g, '');
c = c.replace(/DROP TABLE "users_sessions" CASCADE;\n/g, '');

c = c.replace(/CREATE UNIQUE INDEX "admins_email_idx" ON "admins" USING btree \("email"\);\n/g, '');
c = c.replace(/CREATE INDEX "admins_sessions_parent_id_idx" ON "admins_sessions" USING btree \("_parent_id"\);\n/g, '');
c = c.replace(/CREATE INDEX "admins_display_roles_order_idx" ON "admins_display_roles" USING btree \("_order"\);\n/g, '');
c = c.replace(/CREATE INDEX "admins_display_roles_parent_id_idx" ON "admins_display_roles" USING btree \("_parent_id"\);\n/g, '');

fs.writeFileSync('src/migrations/20261003_092829_phase_2_website.ts', c);
console.log('Done');
