const { Client } = require('pg');
const fs = require('fs');

async function main() {
    const client = new Client('postgresql://postgres:%25z.u9EWSfTP4q4%3F@db.ogsgayboeaewzsbcbojs.supabase.co:5432/postgres');
    await client.connect();

    const sql = fs.readFileSync('supabase/migrations/20261021120000_repair_registration_and_fees.sql', 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.startsWith('COMMIT') || statement.startsWith('BEGIN')) continue;
        console.log(`Executing block ${i}: ${statement.substring(0, 50)}...`);
        try {
            await client.query(statement);
            console.log('Success');
        } catch (e) {
            console.error(`Error on block ${i}:`, e.message);
            console.log('Statement was:', statement);
            process.exit(1);
        }
    }

    console.log('Done');
    process.exit(0);
}

main().catch(console.error);
