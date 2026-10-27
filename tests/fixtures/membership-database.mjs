import { readFile } from "node:fs/promises";

export const paymentPrerequisites = "20261026110000_membership_payment_prerequisites.sql";
export const paymentMigration = "20261026120000_membership_payments.sql";

export const migrationSql = (name) => readFile(
  new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8",
);

// Synthetic schemas only. Deliberately model the Payload enum and varchar columns
// found by the read-only release preflight as well as the SQL-only installation.
export async function prepareMembershipDatabase(db, { deployedSchema = true, beforePayments = async () => {} } = {}) {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key, raw_user_meta_data jsonb default '{}',
      created_at timestamptz default now(), updated_at timestamptz default now()
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    create table public.payments (id uuid primary key);
    create table public.user_roles (user_id uuid unique references auth.users(id), role text not null);
    create function public.has_role(roles text[]) returns boolean
    language sql stable security definer set search_path = public as $$
      select exists(select 1 from user_roles where user_id = auth.uid() and role = any(roles))
    $$;
    create function public.set_current_timestamp_updated_at() returns trigger language plpgsql as $$
      begin new.updated_at = now(); return new; end
    $$;
  `);
  for (const name of [
    "20261006120000_create_membership_schema.sql",
    "20261021120000_repair_registration_and_fees.sql",
    "20261022140000_membership_hardening_and_payment_idempotency.sql",
    "20261023100000_harden_webhook_reconciliation.sql",
  ]) await db.exec(await migrationSql(name));

  if (deployedSchema) await db.exec(`
    create type public.enum_membership_benefits_category as enum
      ('tickets','discount','content','events','physical_goods','other');
    alter table public.membership_benefits alter column category type public.enum_membership_benefits_category
      using category::public.enum_membership_benefits_category;
    create type public.enum_members_status as enum ('active','expired','cancelled','pending_payment');
    alter table public.members drop constraint members_status_check;
    alter table public.members alter column status drop default;
    alter table public.members alter column status type public.enum_members_status using status::public.enum_members_status;
    alter table public.members alter column status set default 'active';
    drop policy "Users can view their own membership" on public.members;
    drop policy "Users can view their own redemptions" on public.benefit_redemptions;
    alter table public.members drop constraint members_user_id_fkey;
    alter table public.members alter column user_id type varchar using user_id::text;
    create policy "Users can view their own membership" on public.members for select
      using (auth.uid()::text = user_id::text);
    create policy "Users can view their own redemptions" on public.benefit_redemptions for select
      using (exists(select 1 from public.members where id=benefit_redemptions.member_id and auth.uid()::text=user_id::text));
  `);
  await beforePayments(db);
  // Separate exec calls are intentional: PostgreSQL requires the enum change to commit.
  await db.exec(await migrationSql(paymentPrerequisites));
  await db.exec(await migrationSql(paymentMigration));
}
