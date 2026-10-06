import * as migration_20260923_062020 from './20260923_062020';
import * as migration_20261003_092829_phase_2_website from './20261003_092829_phase_2_website';

export const migrations = [
  {
    up: migration_20260923_062020.up,
    down: migration_20260923_062020.down,
    name: '20260923_062020',
  },
  {
    up: migration_20261003_092829_phase_2_website.up,
    down: migration_20261003_092829_phase_2_website.down,
    name: '20261003_092829_phase_2_website'
  },
];
