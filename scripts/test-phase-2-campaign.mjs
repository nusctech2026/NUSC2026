// Legacy entry point: campaign tests now use an isolated local database.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result = spawnSync(process.execPath, ['--test', fileURLToPath(new URL('../tests/campaign-actions.test.mjs', import.meta.url)), fileURLToPath(new URL('../tests/campaign.test.mjs', import.meta.url)), fileURLToPath(new URL('../tests/campaign-security.test.mjs', import.meta.url))], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
