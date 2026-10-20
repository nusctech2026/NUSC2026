import * as migration_20260923_062020 from './20260923_062020';
import * as migration_20261003_092829_phase_2_website from './20261003_092829_phase_2_website';
import * as migration_20261020_jersey_interest_registrations from './20261020_jersey_interest_registrations';
import * as migration_20261020_jersey_interest_locked_documents_rel from './20261020_jersey_interest_locked_documents_rel';
import * as migration_20261020_jersey_interest_z_locked_documents_fk from './20261020_jersey_interest_z_locked_documents_fk';

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
  {
    up: migration_20261020_jersey_interest_registrations.up,
    down: migration_20261020_jersey_interest_registrations.down,
    name: '20261020_jersey_interest_registrations',
  },
  {
    up: migration_20261020_jersey_interest_locked_documents_rel.up,
    down: migration_20261020_jersey_interest_locked_documents_rel.down,
    name: '20261020_jersey_interest_locked_documents_rel',
  },
  {
    up: migration_20261020_jersey_interest_z_locked_documents_fk.up,
    down: migration_20261020_jersey_interest_z_locked_documents_fk.down,
    name: '20261020_jersey_interest_z_locked_documents_fk',
  },
];
