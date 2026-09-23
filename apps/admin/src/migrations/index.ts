import * as migration_20260923_062020 from './20260923_062020';

export const migrations = [
  {
    up: migration_20260923_062020.up,
    down: migration_20260923_062020.down,
    name: '20260923_062020'
  },
];
