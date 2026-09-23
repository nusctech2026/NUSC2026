import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
const client = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    const timestamp = Date.now();
    const userEmail = `test.user${timestamp}@nusc.com`;
    await adminSupabase.auth.admin.createUser({ email: userEmail, password: 'password123', email_confirm: true });

    // 1. Get user token
    const { data: { user } } = await client.auth.signInWithPassword({ email: userEmail, password: 'password123' });
    
    const { data: match } = await adminSupabase.from('matches').select('*').limit(1).single();
    const { data: ben } = await adminSupabase.from('match_benefits').select('*').eq('match_id', match.id).limit(1).single();

    // reserve via admin to ensure it exists
    const { data: newRedemption } = await adminSupabase.from('ticket_redemptions').insert([{
        user_id: user.id,
        match_id: match.id,
        benefit_id: ben.id,
        points_cost: 10,
        status: 'reserved'
    }]).select().single();
    
    const targetId = newRedemption.id;
    const oldStatus = newRedemption.status;
    console.log(`Found redemption ${targetId}, status: ${oldStatus}`);

    // 3. Try to update it using client
    console.log("Attempting client UPDATE...");
    const { data, error, count } = await client.from('ticket_redemptions').update({ status: 'redeemed' }).eq('id', targetId).select();
    console.log("Update result - error:", error);
    console.log("Update result - data:", data);

    // 4. Verify with admin if it actually changed
    const { data: verifyAdmin } = await adminSupabase.from('ticket_redemptions').select('status').eq('id', targetId).single();
    console.log(`Admin verification - current status: ${verifyAdmin.status}`);
    
    // Try DELETE
    console.log("Attempting client DELETE...");
    const { error: delErr } = await client.from('ticket_redemptions').delete().eq('id', targetId);
    console.log("Delete result - error:", delErr);
    
    const { data: verifyAdminDel } = await adminSupabase.from('ticket_redemptions').select('status').eq('id', targetId).maybeSingle();
    console.log(`Admin verification after delete - exists: ${verifyAdminDel !== null}`);
}
run();
