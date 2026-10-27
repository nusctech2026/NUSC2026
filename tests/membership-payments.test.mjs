import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { prepareMembershipDatabase, migrationSql, paymentPrerequisites } from "./fixtures/membership-database.mjs";

// Run the shipped SQL against an isolated PostgreSQL engine. No application
// credentials, network, or live Supabase database are used by this suite.
let db;
let migratedLegacyPayments;
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const staff = "33333333-3333-4333-8333-333333333333";
const scalar = async (sql, params = []) =>
  Object.values((await db.query(sql, params)).rows[0])[0];
const plan = (slug) =>
  scalar("select id from public.membership_plans where slug = $1", [slug]);
const member = async (userId = userA, paid = false) =>
  scalar(
    `insert into public.members (user_id, plan_id, status, registration_payment_status)
     values ($1, $2, $3, $4) returning id`,
    [
      userId,
      await plan("registration"),
      paid ? "active" : "pending_payment",
      paid ? "paid" : "pending",
    ],
  );
const begin = (userId = userA, planId = null) =>
  scalar("select public.begin_membership_payment($1::uuid, $2::uuid)", [
    userId,
    planId,
  ]);
const pending = async (
  order,
  razorpayId = `order_${order.id.replaceAll("-", "")}`,
) => {
  await db.query(
    "update public.membership_payment_orders set status = 'pending', razorpay_order_id = $1 where id = $2",
    [razorpayId, order.id],
  );
  return { ...order, razorpay_order_id: razorpayId };
};
const settle = (
  order,
  paymentId = `pay_${order.id.replaceAll("-", "")}`,
  amount = order.amount,
  currency = "INR",
) =>
  scalar("select public.settle_membership_payment($1, $2, $3::bigint, $4)", [
    order.razorpay_order_id,
    paymentId,
    amount,
    currency,
  ]);
const asRole = async (role, userId, operation) => {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId ?? "",
  ]);
  await db.exec(`set role ${role}`);
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
};
const denied = (operation) => assert.rejects(operation, { code: "42501" });
const cancel = (userId, orderId) =>
  scalar("select public.cancel_membership_payment($1::uuid,$2::uuid)", [
    userId,
    orderId,
  ]);

before(async () => {
  db = new PGlite();
  await prepareMembershipDatabase(db, {
    beforePayments: async () => {
      await db.query("insert into auth.users(id) values ($1), ($2)", [
        userA,
        userB,
      ]);
      await db.exec(`
        insert into membership_plans(name,slug,price) values('Historical General','legacy-general',300000);
        insert into members(user_id,plan_id,status,registration_payment_status,registration_order_id,registration_payment_id)
          select '${userA}', id, 'active', 'paid', 'order_legacyPaid', 'pay_legacyPaid' from membership_plans where slug='legacy-general';
        insert into members(user_id,plan_id,status,registration_payment_status,registration_order_id)
          select '${userB}', id, 'pending_payment', 'pending', 'order_legacyPending' from membership_plans where slug='legacy-general';
      `);
    },
  });
  const imported = (
    await db.query(
      "select * from membership_payment_orders order by razorpay_order_id",
    )
  ).rows;
  const pendingImport = imported.find(
    (order) => order.razorpay_order_id === "order_legacyPending",
  );
  const settledImport = await settle(pendingImport, "pay_legacyRecovered");
  migratedLegacyPayments = {
    imported,
    settledImport,
    recovered: await scalar(
      "select registration_payment_status from members where user_id=$1",
      [userB],
    ),
    preservedPlan: await scalar(
      "select p.slug from members m join membership_plans p on p.id=m.plan_id where m.user_id=$1",
      [userB],
    ),
  };
});

beforeEach(async () => {
  await db.exec(`
    truncate public.members, public.member_profiles, public.user_roles, auth.users cascade;
    update public.membership_plans set is_active = true,
      price = case slug when 'registration' then 1000 when 'rise-general' then 300000
        when 'rise-premium' then 1000000 when 'rise-vip-box' then 45000000 else price end;
  `);
  await db.query("insert into auth.users(id) values ($1), ($2), ($3)", [
    userA,
    userB,
    staff,
  ]);
});

after(async () => {
  await db?.close();
});

test("migration imports existing paid and pending registration orders and preserves historical plans", () => {
  assert.equal(migratedLegacyPayments.imported.length, 2);
  const paid = migratedLegacyPayments.imported.find(
    (order) => order.razorpay_order_id === "order_legacyPaid",
  );
  const pendingOrder = migratedLegacyPayments.imported.find(
    (order) => order.razorpay_order_id === "order_legacyPending",
  );
  assert.equal(paid.status, "paid");
  assert.equal(paid.payment_id, "pay_legacyPaid");
  assert.equal(pendingOrder.status, "pending");
  assert.equal(Number(pendingOrder.amount), 1000);
  assert.equal(pendingOrder.purpose, "registration");
  assert.equal(migratedLegacyPayments.settledImport.status, "paid");
  assert.equal(migratedLegacyPayments.recovered, "paid");
  assert.equal(migratedLegacyPayments.preservedPlan, "legacy-general");
});

test("Payload enum prerequisite commits before annual entitlements are inserted and is safe to retry", async () => {
  assert.equal(await scalar("select data_type from information_schema.columns where table_schema='public' and table_name='membership_benefits' and column_name='category'"), "USER-DEFINED");
  assert.equal(Number(await scalar("select count(*) from membership_benefits where category='annual_entitlements'")), 3);
  await db.exec(await migrationSql(paymentPrerequisites));
  assert.equal(Number(await scalar("select count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='enum_membership_benefits_category' and e.enumlabel='annual_entitlements'")), 1);
});

test("payment migrations also support the original text schema", async () => {
  const textDb = new PGlite();
  try {
    await prepareMembershipDatabase(textDb, { deployedSchema: false });
    assert.equal((await textDb.query("select count(*)::int as count from membership_benefits where category='annual_entitlements'")).rows[0].count, 3);
  } finally { await textDb.close(); }
});

test("migration corrects legacy plan slugs and prices while preserving their IDs and member references", async () => {
  const legacyDb = new PGlite();
  let original;
  try {
    await prepareMembershipDatabase(legacyDb, { beforePayments: async legacy => {
      original = (await legacy.query(`insert into membership_plans(name,slug,price,billing_cycle,is_purchasable_online)
        values('Base','Base-membership ',100,'annual',true),('General','Rise General',300000,'annual',true),
        ('Premium','Rise Premium',1000000,'annual',true),('VIP','Rise VIP Box ',450000000,'annual',false)
        returning id,slug`)).rows;
      await legacy.query("insert into auth.users(id) values($1)", [userA]);
      await legacy.query("insert into members(user_id,plan_id,registration_payment_status) values($1,$2,'paid')", [userA, original[0].id]);
    } });
    const canonical = (await legacyDb.query("select id,slug,price::int,is_purchasable_online from membership_plans order by price")).rows;
    assert.deepEqual(canonical.map(row => row.id), original.map(row => row.id));
    assert.deepEqual(canonical.map(row => row.slug), ['registration','rise-general','rise-premium','rise-vip-box']);
    assert.deepEqual(canonical.map(row => row.price), [1000,300000,1000000,45000000]);
    assert.deepEqual(canonical.map(row => row.is_purchasable_online), [false,true,true,false]);
    assert.equal((await legacyDb.query("select plan_id from members")).rows[0].plan_id, original[0].id);
  } finally { await legacyDb.close(); }
});

test("duplicate legacy memberships stop migration without discarding records or undoing RPC hardening", async () => {
  const invalidDb = new PGlite();
  try {
    await assert.rejects(() => prepareMembershipDatabase(invalidDb, { beforePayments: async (legacy) => {
      await legacy.query("insert into auth.users(id) values($1)", [userA]);
      await legacy.exec("insert into membership_plans(name,slug,price) values('Legacy registration','Base-membership ',100)");
      await legacy.query("insert into members(user_id,plan_id) select $1,id from membership_plans union all select $1,id from membership_plans", [userA]);
    } }), { code: "23505" });
    await invalidDb.exec("ROLLBACK");
    assert.equal((await invalidDb.query("select count(*)::int as count from members")).rows[0].count, 2);
    assert.equal((await invalidDb.query("select price::int from membership_plans where slug='Base-membership '")).rows[0].price, 100);
    for (const role of ["anon", "authenticated"]) {
      assert.equal((await invalidDb.query("select has_function_privilege($1,'public.create_member_profile_and_record(uuid,text,text,text,text,date,uuid,text)','EXECUTE') as allowed", [role])).rows[0].allowed, false);
    }
  } finally { await invalidDb.close(); }
});

test("an account cannot acquire two authoritative member records", async () => {
  await member();
  await assert.rejects(() => member(), { code: "23505" });
});

test("registration fee is authoritative, pending orders are reused, capture activates only the bound account", async () => {
  const a = await member();
  const b = await member(userB);
  const created = await asRole("service_role", null, () => begin());
  assert.equal(Number(created.amount), 1000);
  assert.equal(created.currency, "INR");
  assert.equal(created.member_id, a);
  assert.equal(created.user_id, userA);
  assert.equal(created.purpose, "registration");
  assert.equal(created.newly_created, true);
  const reused = await begin();
  assert.equal(reused.id, created.id);
  assert.equal(reused.newly_created, false);
  const order = await pending(created);
  assert.equal((await begin()).id, order.id);
  assert.equal(
    (await asRole("service_role", null, () => settle(order))).status,
    "paid",
  );
  assert.equal(
    await scalar(
      "select registration_payment_status from members where id = $1",
      [a],
    ),
    "paid",
  );
  assert.equal(
    await scalar(
      "select registration_payment_status from members where id = $1",
      [b],
    ),
    "pending",
  );
  assert.equal(
    await scalar(
      "select p.slug from members m join membership_plans p on p.id=m.plan_id where m.id=$1",
      [a],
    ),
    "registration",
  );
});

test("wrong amount and currency do not activate membership or consume the valid capture", async () => {
  const id = await member();
  const order = await pending(await begin());
  assert.equal(
    (await settle(order, "pay_wrongamount", 1)).status,
    "requires_manual_refund",
  );
  assert.equal(
    (await settle(order, "pay_wrongcurrency", order.amount, "USD")).status,
    "requires_manual_refund",
  );
  assert.equal(
    await scalar(
      "select registration_payment_status from members where id=$1",
      [id],
    ),
    "pending",
  );
  assert.equal((await settle(order, "pay_valid")).status, "paid");
});

test("same payment replay is idempotent and a second capture is durably queued for refund once", async () => {
  await member();
  const order = await pending(await begin());
  assert.equal((await settle(order, "pay_first")).status, "paid");
  assert.equal((await settle(order, "pay_first")).status, "already_processed");
  assert.equal(
    (await settle(order, "pay_second")).status,
    "requires_manual_refund",
  );
  assert.equal(
    (await settle(order, "pay_second")).status,
    "requires_manual_refund",
  );
  assert.equal(
    Number(
      await scalar(
        "select count(*) from payment_reconciliations where duplicate_payment_id='pay_second'",
      ),
    ),
    1,
  );
  assert.equal(
    await scalar(
      "select registration_payment_id from members where user_id=$1",
      [userA],
    ),
    "pay_first",
  );
});

test("one payment cannot be replayed onto another user's order", async () => {
  await member();
  await member(userB);
  const a = await pending(await begin());
  const b = await pending(await begin(userB));
  await settle(a, "pay_shared");
  assert.equal(
    (await settle(b, "pay_shared")).status,
    "requires_manual_refund",
  );
  assert.equal(
    await scalar(
      "select registration_payment_status from members where user_id=$1",
      [userB],
    ),
    "pending",
  );
  assert.equal(
    (await settle({ ...b, razorpay_order_id: "order_unknown" }, "pay_unknown"))
      .status,
    "requires_manual_refund",
  );
});

test("registration is mandatory before tier checkout and VIP Box cannot be bought online", async () => {
  await member();
  await assert.rejects(async () => begin(userA, await plan("rise-general")));
  await db.query(
    "update members set registration_payment_status='paid' where user_id=$1",
    [userA],
  );
  await assert.rejects(async () => begin(userA, await plan("rise-vip-box")));
  await assert.rejects(async () => begin(userA, await plan("registration")));
});

test("paid General and Premium purchases use database prices and activate one year of membership", async () => {
  const id = await member(userA, true);
  const general = await pending(await begin(userA, await plan("rise-general")));
  assert.equal(Number(general.amount), 300000);
  assert.equal((await settle(general)).status, "paid");
  assert.equal(
    await scalar("select plan_id from members where id=$1", [id]),
    await plan("rise-general"),
  );
  const premium = await pending(await begin(userA, await plan("rise-premium")));
  assert.equal(Number(premium.amount), 1000000);
  assert.equal((await settle(premium)).status, "paid");
  const activated = (
    await db.query("select plan_id, end_date from members where id=$1", [id])
  ).rows[0];
  assert.equal(activated.plan_id, await plan("rise-premium"));
  const now = new Date();
  const nextYear = new Date(now);
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  assert.ok(
    Math.abs(new Date(activated.end_date).getTime() - nextYear.getTime()) <
      5000,
  );
  await assert.rejects(async () => begin(userA, await plan("rise-general")));
  await assert.rejects(async () => begin(userA, await plan("rise-premium")));
});

test("inactive tiers cannot create payable orders", async () => {
  await member(userA, true);
  const id = await plan("rise-general");
  await db.query("update membership_plans set is_active=false where id=$1", [
    id,
  ]);
  await assert.rejects(() => begin(userA, id));
});

test("misconfigured lower prices fail closed and cannot create cheap tier orders", async () => {
  await member(userA, true);
  const id = await plan("rise-general");
  await db.query("update membership_plans set price=2000 where id=$1", [id]);
  await assert.rejects(() => begin(userA, id), /pricing is not configured/i);
  assert.equal(
    Number(await scalar("select count(*) from membership_payment_orders")),
    0,
  );
});

test("expired membership can renew the same tier for a fresh year", async () => {
  const id = await member(userA, true);
  await db.query(
    "update members set plan_id=$1, status='expired', end_date=now()-interval '1 day' where id=$2",
    [await plan("rise-general"), id],
  );
  const order = await pending(await begin(userA, await plan("rise-general")));
  assert.equal((await settle(order)).status, "paid");
  assert.equal(
    await scalar("select status from members where id=$1", [id]),
    "active",
  );
  assert.ok(
    new Date(await scalar("select end_date from members where id=$1", [id])) >
      new Date(),
  );
});

test("a stale lower-tier capture never downgrades a newer Premium membership", async () => {
  const id = await member(userA, true);
  const order = await pending(await begin(userA, await plan("rise-general")));
  await db.query(
    "update members set plan_id=$1, status='active', end_date=now()+interval '1 year' where id=$2",
    [await plan("rise-premium"), id],
  );
  assert.equal((await settle(order)).status, "requires_manual_refund");
  assert.equal(
    await scalar("select plan_id from members where id=$1", [id]),
    await plan("rise-premium"),
  );
});

test("anonymous and member callers cannot create, settle, or mutate payment orders", async () => {
  await member();
  const order = await pending(await begin());
  for (const role of ["anon", "authenticated"]) {
    await asRole(role, userA, async () => {
      await denied(() => begin(userB));
      await denied(() => settle(order));
      await denied(() =>
        db.query("update membership_payment_orders set amount=1 where id=$1", [
          order.id,
        ]),
      );
      await denied(() =>
        db.query("insert into members(user_id,plan_id) values($1,$2)", [
          userB,
          order.plan_id,
        ]),
      );
    });
  }
});

test("registration RPC is unavailable to anonymous or authenticated direct callers", async () => {
  const registrationId = await plan("registration");
  for (const role of ["anon", "authenticated"]) {
    await asRole(role, userA, async () => {
      await denied(() =>
        db.query(
          "select public.create_member_profile_and_record($1::uuid,'A','B','123',null,null,$2::uuid,'adult')",
          [userB, registrationId],
        ),
      );
    });
  }
});

test("RLS shows payment orders only to their owner and hides reconciliation and VIP audit rows", async () => {
  await member();
  await member(userB);
  const own = await pending(await begin());
  await pending(await begin(userB));
  await asRole("authenticated", userA, async () => {
    const rows = (
      await db.query("select id,user_id from membership_payment_orders")
    ).rows;
    assert.deepEqual(rows, [{ id: own.id, user_id: userA }]);
    await denied(() => db.query("select * from payment_reconciliations"));
    await denied(() =>
      db.query("select * from membership_offline_activations"),
    );
  });
  await asRole("anon", null, async () => {
    await denied(() => db.query("select * from membership_payment_orders"));
  });
});

test("pending orders prevent switching plans and repeated concurrent submissions reuse one order", async () => {
  await member(userA, true);
  const generalId = await plan("rise-general");
  const orders = await Promise.all(
    Array.from({ length: 5 }, () => begin(userA, generalId)),
  );
  assert.equal(new Set(orders.map((order) => order.id)).size, 1);
  assert.equal(
    Number(await scalar("select count(*) from membership_payment_orders")),
    1,
  );
  await assert.rejects(
    async () => begin(userA, await plan("rise-premium")),
    /pending payment/i,
  );
});

test("expired creation lease permits a fresh checkout and preserves the failed attempt", async () => {
  await member();
  const stale = await begin();
  await db.query(
    "update membership_payment_orders set created_at=now()-interval '6 minutes' where id=$1",
    [stale.id],
  );
  const replacement = await begin();
  assert.notEqual(replacement.id, stale.id);
  assert.equal(replacement.newly_created, true);
  assert.equal(
    await scalar("select status from membership_payment_orders where id=$1", [
      stale.id,
    ]),
    "creation_failed",
  );
  assert.equal(
    Number(
      await scalar(
        "select count(*) from membership_payment_orders where status in ('creating','pending')",
      ),
    ),
    1,
  );
});

test("tier captures after cancellation are audited and never reactivate membership", async () => {
  const id = await member(userA, true);
  const order = await pending(await begin(userA, await plan("rise-general")));
  await db.query("update members set status='cancelled' where id=$1", [id]);
  assert.equal((await settle(order)).status, "requires_manual_refund");
  assert.equal(
    await scalar("select status from members where id=$1", [id]),
    "cancelled",
  );
  assert.equal(
    await scalar("select plan_id from members where id=$1", [id]),
    await plan("registration"),
  );
});

test("VIP activation derives staff identity from auth, requires paid registration and records offline reference", async () => {
  const id = await member(userA, true);
  const activate = (reference = "BANK-TRANSFER-123") =>
    scalar("select public.activate_vip_membership($1::uuid,$2)", [
      id,
      reference,
    ]);
  await asRole("authenticated", userA, async () => {
    await assert.rejects(activate);
  });
  await db.query(
    "insert into user_roles(user_id,role) values($1,'content_editor')",
    [staff],
  );
  await asRole("authenticated", staff, async () => {
    await assert.rejects(activate);
  });
  await db.query(
    "update user_roles set role='store_manager' where user_id=$1",
    [staff],
  );
  await asRole("authenticated", staff, async () => {
    await assert.rejects(() => activate(""));
    await activate();
  });
  assert.equal(
    await scalar("select plan_id from members where id=$1", [id]),
    await plan("rise-vip-box"),
  );
  assert.equal(
    await scalar("select status from members where id=$1", [id]),
    "active",
  );
  const audit = (
    await db.query(
      "select * from membership_offline_activations where member_id=$1",
      [id],
    )
  ).rows[0];
  assert.equal(audit.actor_id, staff);
  assert.equal(audit.payment_reference, "BANK-TRANSFER-123");
  assert.equal(Number(audit.amount), 45000000);
  assert.ok(new Date(audit.expires_at) > new Date());
});

test("VIP staff cannot bypass registration or reactivate cancelled accounts", async () => {
  const id = await member();
  await db.query(
    "insert into user_roles(user_id,role) values($1,'super_admin')",
    [staff],
  );
  const activate = () =>
    scalar("select public.activate_vip_membership($1::uuid,'PAID-IN-PERSON')", [
      id,
    ]);
  await asRole("authenticated", staff, async () => {
    await assert.rejects(activate);
  });
  await db.query(
    "update members set registration_payment_status='paid', status='cancelled' where id=$1",
    [id],
  );
  await asRole("authenticated", staff, async () => {
    await assert.rejects(activate);
  });
});

test("VIP cannot activate over an online payment and offline references cannot activate two members", async () => {
  const a = await member(userA, true);
  const b = await member(userB, true);
  await db.query(
    "insert into user_roles(user_id,role) values($1,'super_admin')",
    [staff],
  );
  const online = await begin(userA, await plan("rise-general"));
  const activate = (id) =>
    scalar(
      "select public.activate_vip_membership($1::uuid,'BANK-UNIQUE-123')",
      [id],
    );
  await asRole("authenticated", staff, async () => {
    await assert.rejects(
      () => activate(a),
      /online membership payment is pending/i,
    );
  });
  await db.query(
    "update membership_payment_orders set status='creation_failed' where id=$1",
    [online.id],
  );
  await asRole("authenticated", staff, async () => {
    await activate(a);
    await assert.rejects(() => activate(b), /reference already used/i);
  });
  assert.equal(
    await scalar("select plan_id from members where id=$1", [b]),
    await plan("registration"),
  );
  assert.equal(
    Number(await scalar("select count(*) from membership_offline_activations")),
    1,
  );
});

test("cancelling an owned pending tier releases checkout and late capture is audited without activation", async () => {
  const id = await member(userA, true);
  const old = await pending(await begin(userA, await plan("rise-general")));
  assert.equal(
    (await asRole("service_role", null, () => cancel(userA, old.id))).status,
    "cancelled",
  );
  assert.equal(
    await scalar("select status from membership_payment_orders where id=$1", [
      old.id,
    ]),
    "cancelled",
  );
  const replacement = await begin(userA, await plan("rise-premium"));
  assert.notEqual(replacement.id, old.id);
  await cancel(userA, old.id);
  assert.equal(
    await scalar("select status from membership_payment_orders where id=$1", [
      replacement.id,
    ]),
    "creating",
  );
  assert.equal((await settle(old)).status, "requires_manual_refund");
  assert.equal(
    await scalar("select plan_id from members where id=$1", [id]),
    await plan("registration"),
  );
  assert.equal(
    Number(
      await scalar(
        "select count(*) from payment_reconciliations where order_id=$1",
        [old.razorpay_order_id],
      ),
    ),
    1,
  );
});

test("cancellation cannot target another member, registration, or settled payment and direct callers are denied", async () => {
  await member(userA, true);
  await member(userB);
  const order = await pending(await begin(userA, await plan("rise-general")));
  const registration = await pending(await begin(userB));
  await assert.rejects(
    () => cancel(userB, order.id),
    /not found for your account/i,
  );
  await assert.rejects(
    () => cancel(userB, registration.id),
    /not found for your account/i,
  );
  for (const role of ["anon", "authenticated"]) {
    await asRole(role, userA, async () => {
      await denied(() => cancel(userA, order.id));
    });
  }
  await settle(order);
  assert.equal((await cancel(userA, order.id)).status, "already_processed");
  assert.equal(
    await scalar("select status from membership_payment_orders where id=$1", [
      order.id,
    ]),
    "paid",
  );
});

test("cancelling online checkout permits audited offline VIP activation", async () => {
  const id = await member(userA, true);
  const order = await pending(await begin(userA, await plan("rise-general")));
  await cancel(userA, order.id);
  await db.query(
    "insert into user_roles(user_id,role) values($1,'super_admin')",
    [staff],
  );
  await asRole("authenticated", staff, () =>
    scalar(
      "select public.activate_vip_membership($1::uuid,'OFFLINE-AFTER-CANCEL')",
      [id],
    ),
  );
  assert.equal(
    await scalar("select plan_id from members where id=$1", [id]),
    await plan("rise-vip-box"),
  );
  assert.equal((await settle(order)).status, "requires_manual_refund");
  assert.equal(
    await scalar("select plan_id from members where id=$1", [id]),
    await plan("rise-vip-box"),
  );
});
