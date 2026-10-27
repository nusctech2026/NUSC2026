import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { migrationSql, prepareMembershipDatabase } from "./fixtures/membership-database.mjs";

// Synthetic isolated PostgreSQL only: no application credentials or network.
let db;
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
const plan = slug => scalar("select id from membership_plans where slug=$1", [slug]);
const member = async userId => scalar(
  `insert into members(user_id,plan_id,status,registration_payment_status)
   values($1,$2,'active','paid') returning id`, [userId, await plan("registration")],
);
const beginSmoke = (userId, planId) => scalar(
  "select public.begin_membership_smoke_test_payment($1::uuid,$2::uuid)", [userId, planId],
);
const beginSmokeUpgrade = (userId, planId) => scalar(
  "select public.begin_membership_smoke_test_upgrade_payment($1::uuid,$2::uuid)", [userId, planId],
);

before(async () => {
  db = new PGlite();
  await prepareMembershipDatabase(db);
  await db.exec(await migrationSql("20261026170000_update_rise_tier_pricing.sql"));
  await db.exec(await migrationSql("20261026180000_ahibi_membership_season_passes.sql"));
  await db.exec(await migrationSql("20261026190000_rise_live_smoke_test_gate.sql"));
  await db.exec(await migrationSql("20261027170000_membership_upgrade_credits.sql"));
  await db.exec(await migrationSql("20261027180000_ahibi_season_pass_replacement.sql"));
}, { timeout: 90000 });

beforeEach(async () => {
  await db.query("truncate members, user_roles, auth.users cascade");
  await db.query("insert into auth.users(id) values($1),($2)", [userA, userB]);
});

after(async () => { await db?.close(); });

test("smoke order stores exactly 100 paise without changing either shared tier price", async () => {
  const memberId = await member(userA);
  const generalId = await plan("rise-general");
  const premiumId = await plan("rise-premium");
  const reserved = await beginSmoke(userA, generalId);

  assert.equal(Number(reserved.amount), 100);
  assert.equal(reserved.purpose, "tier");
  assert.equal(reserved.is_smoke_test, true);
  assert.equal(reserved.member_id, memberId);
  assert.equal(reserved.newly_created, true);
  assert.equal(Number(await scalar("select price from membership_plans where id=$1", [generalId])), 389400);
  assert.equal(Number(await scalar("select price from membership_plans where id=$1", [premiumId])), 1298000);
  assert.equal(Number(await scalar("select amount from membership_payment_orders where id=$1", [reserved.id])), 100);
});

test("same user and tier retries reuse one pending smoke order; other identities and tiers cannot claim another", async () => {
  await member(userA);
  await member(userB);
  const generalId = await plan("rise-general");
  const premiumId = await plan("rise-premium");
  const first = await beginSmoke(userA, generalId);
  const retry = await beginSmoke(userA, generalId);

  assert.equal(retry.id, first.id);
  assert.equal(retry.newly_created, false);
  await assert.rejects(() => beginSmoke(userB, generalId), /already been used/);
  await assert.rejects(() => beginSmoke(userA, premiumId), /already been used/);
  assert.equal(Number(await scalar("select count(*) from membership_payment_orders where is_smoke_test")), 1);
});

test("a full-price pending order cannot be converted to a smoke order", async () => {
  await member(userA);
  const generalId = await plan("rise-general");
  const regular = await scalar("select public.begin_membership_payment($1::uuid,$2::uuid)", [userA, generalId]);
  await assert.rejects(() => beginSmoke(userA, generalId), /existing pending payment/);
  assert.equal(Number(await scalar("select amount from membership_payment_orders where id=$1", [regular.id])), 389400);
  assert.equal(await scalar("select is_smoke_test from membership_payment_orders where id=$1", [regular.id]), false);
});

test("ordinary checkout cannot reuse a pending ₹1 order after the smoke flag is switched off", async () => {
  await member(userA);
  const generalId = await plan("rise-general");
  const smoke = await beginSmoke(userA, generalId);
  await assert.rejects(
    () => db.query("select public.begin_membership_payment($1::uuid,$2::uuid)", [userA, generalId]),
    /existing pending payment/,
  );
  assert.equal(Number(await scalar("select count(*) from membership_payment_orders")), 1);
  assert.equal(Number(await scalar("select amount from membership_payment_orders where id=$1", [smoke.id])), 100);
});

test("settlement requires captured ₹1 to exactly match the smoke order and remains idempotent", async () => {
  const memberId = await member(userA);
  const generalId = await plan("rise-general");
  const smoke = await beginSmoke(userA, generalId);
  await db.query("update membership_payment_orders set status='pending',razorpay_order_id='order_smoke' where id=$1", [smoke.id]);

  const mismatch = await scalar("select public.settle_membership_payment('order_smoke','pay_wrong',99,'INR')");
  assert.equal(mismatch.status, "requires_manual_refund");
  assert.equal(await scalar("select status from membership_payment_orders where id=$1", [smoke.id]), "pending");
  assert.equal(await scalar("select plan_id from members where id=$1", [memberId]), await plan("registration"));

  const paid = await scalar("select public.settle_membership_payment('order_smoke','pay_smoke',100,'INR')");
  assert.equal(paid.status, "paid");
  const replay = await scalar("select public.settle_membership_payment('order_smoke','pay_smoke',100,'INR')");
  assert.equal(replay.status, "already_processed");
  assert.equal(await scalar("select plan_id from members where id=$1", [memberId]), generalId);
  assert.equal(await scalar("select amount from membership_payment_orders where id=$1", [smoke.id]), 100);

  const premiumPlanId = await plan("rise-premium");
  await assert.rejects(
    () => scalar("select public.begin_membership_payment($1::uuid,$2::uuid)", [userA, premiumPlanId]),
    /smoke test upgrade requires the restricted test checkout/i,
  );
});

test("regular General upgrade charges only the verified price difference and preserves membership dates", async () => {
  const memberId = await member(userA);
  const generalOrder = await scalar("select public.begin_membership_payment($1::uuid,$2::uuid)", [userA, await plan("rise-general")]);
  await db.query("update membership_payment_orders set status='pending',razorpay_order_id='order_generalPaid' where id=$1", [generalOrder.id]);
  assert.equal(Number(generalOrder.amount), 389400);
  assert.equal((await scalar("select public.settle_membership_payment('order_generalPaid','pay_generalPaid',389400,'INR')")).status, "paid");
  const priorDates = (await db.query("select start_date,end_date from members where id=$1", [memberId])).rows[0];

  const upgrade = await scalar("select public.begin_membership_payment($1::uuid,$2::uuid)", [userA, await plan("rise-premium")]);
  assert.equal(Number(upgrade.amount), 908600);
  assert.equal(Number(upgrade.upgrade_credit_amount), 389400);
  assert.equal(upgrade.upgrade_credit_source_order_id, generalOrder.id);
  await db.query("update membership_payment_orders set status='pending',razorpay_order_id='order_upgradePaid' where id=$1", [upgrade.id]);
  const mismatch = await scalar("select public.settle_membership_payment('order_upgradePaid','pay_upgradeWrong',908599,'INR')");
  assert.equal(mismatch.status, "requires_manual_refund");
  assert.equal(await scalar("select plan_id from members where id=$1", [memberId]), await plan("rise-general"));
  assert.equal((await scalar("select public.settle_membership_payment('order_upgradePaid','pay_upgradePaid',908600,'INR')")).status, "paid");
  const afterDates = (await db.query("select start_date,end_date,plan_id from members where id=$1", [memberId])).rows[0];
  assert.equal(afterDates.plan_id, await plan("rise-premium"));
  assert.equal(new Date(afterDates.start_date).getTime(), new Date(priorDates.start_date).getTime());
  assert.equal(new Date(afterDates.end_date).getTime(), new Date(priorDates.end_date).getTime());
});

test("smoke General upgrade is a single retry-safe ₹2 order and settlement keeps the original term", async () => {
  const memberId = await member(userA);
  const general = await beginSmoke(userA, await plan("rise-general"));
  await db.query("update membership_payment_orders set status='pending',razorpay_order_id='order_smokeGeneral' where id=$1", [general.id]);
  assert.equal((await scalar("select public.settle_membership_payment('order_smokeGeneral','pay_smokeGeneral',100,'INR')")).status, "paid");
  const priorDates = (await db.query("select start_date,end_date from members where id=$1", [memberId])).rows[0];

  const upgrade = await beginSmokeUpgrade(userA, await plan("rise-premium"));
  const retry = await beginSmokeUpgrade(userA, await plan("rise-premium"));
  assert.equal(Number(upgrade.amount), 200);
  assert.equal(upgrade.is_smoke_test_upgrade, true);
  assert.equal(upgrade.newly_created, true);
  assert.equal(retry.id, upgrade.id);
  assert.equal(retry.newly_created, false);
  await db.query("update membership_payment_orders set status='pending',razorpay_order_id='order_smokeUpgrade' where id=$1", [upgrade.id]);
  const mismatch = await scalar("select public.settle_membership_payment('order_smokeUpgrade','pay_smokeUpgradeWrong',100,'INR')");
  assert.equal(mismatch.status, "requires_manual_refund");
  assert.equal((await scalar("select public.settle_membership_payment('order_smokeUpgrade','pay_smokeUpgrade',200,'INR')")).status, "paid");
  assert.equal(Number(await scalar("select count(*) from membership_payment_orders where is_smoke_test_upgrade")), 1);
  assert.equal(Number(await scalar("select count(*) from membership_payment_orders where is_smoke_test_upgrade and status='paid'")), 1);
  const afterDates = (await db.query("select start_date,end_date,plan_id from members where id=$1", [memberId])).rows[0];
  assert.equal(afterDates.plan_id, await plan("rise-premium"));
  assert.equal(new Date(afterDates.start_date).getTime(), new Date(priorDates.start_date).getTime());
  assert.equal(new Date(afterDates.end_date).getTime(), new Date(priorDates.end_date).getTime());
});

test("smoke RPC is unavailable to anon and authenticated database roles", async () => {
  assert.equal(await scalar("select has_function_privilege('anon','public.begin_membership_smoke_test_payment(uuid,uuid)','EXECUTE')"), false);
  assert.equal(await scalar("select has_function_privilege('authenticated','public.begin_membership_smoke_test_payment(uuid,uuid)','EXECUTE')"), false);
  assert.equal(await scalar("select has_function_privilege('anon','public.begin_membership_smoke_test_upgrade_payment(uuid,uuid)','EXECUTE')"), false);
  assert.equal(await scalar("select has_function_privilege('authenticated','public.begin_membership_smoke_test_upgrade_payment(uuid,uuid)','EXECUTE')"), false);
});
