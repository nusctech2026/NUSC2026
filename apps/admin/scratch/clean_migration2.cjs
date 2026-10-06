const fs = require('fs');
let c = fs.readFileSync('src/migrations/20261003_092829_phase_2_website.ts', 'utf8');

c = c.replace(/ALTER TABLE "users_sessions" DISABLE ROW LEVEL SECURITY;\n/g, '');
c = c.replace(/ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;\n/g, '');
c = c.replace(/.*?ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_users_fk";\n/g, '');
c = c.replace(/.*?ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_users_fk";\n/g, '');
c = c.replace(/.*?DROP INDEX "payload_locked_documents_rels_users_id_idx";\n/g, '');
c = c.replace(/.*?DROP INDEX "payload_preferences_rels_users_id_idx";\n/g, '');
c = c.replace(/.*?ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "users_id";\n/g, '');
c = c.replace(/.*?ALTER TABLE "payload_preferences_rels" DROP COLUMN "users_id";\n/g, '');
c = c.replace(/.*?ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "admins_id" uuid;\n/g, '');
c = c.replace(/.*?ALTER TABLE "payload_preferences_rels" ADD COLUMN "admins_id" uuid;\n/g, '');
c = c.replace(/.*?ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY \("admins_id"\) REFERENCES "public"."admins"\("id"\) ON DELETE cascade ON UPDATE no action;\n/g, '');
c = c.replace(/.*?ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY \("admins_id"\) REFERENCES "public"."admins"\("id"\) ON DELETE cascade ON UPDATE no action;\n/g, '');
c = c.replace(/.*?CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload_locked_documents_rels" USING btree \("admins_id"\);\n/g, '');
c = c.replace(/.*?CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload_preferences_rels" USING btree \("admins_id"\);\n/g, '');

fs.writeFileSync('src/migrations/20261003_092829_phase_2_website.ts', c);
console.log('Done cleaning alters');
