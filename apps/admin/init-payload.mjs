import { getPayload } from 'payload';
import config from './src/payload.config.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('./.env.local') });

async function run() {
  await getPayload({ config });
  console.log('Payload initialized and schema pushed.');
  process.exit(0);
}

run().catch(console.error);
