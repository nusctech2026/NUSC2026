import * as migration_20260923_062020 from './20260923_062020';
import * as migration_20261003_092829_phase_2_website from './20261003_092829_phase_2_website';
import * as migration_20261020_jersey_interest_registrations from './20261020_jersey_interest_registrations';
import * as migration_20261020_jersey_interest_locked_documents_rel from './20261020_jersey_interest_locked_documents_rel';
import * as migration_20261020_jersey_interest_z_locked_documents_fk from './20261020_jersey_interest_z_locked_documents_fk';
import * as migration_20261020_jersey_interest_unique_email from './20261020_jersey_interest_unique_email';
import * as migration_20261021_jersey_interest_kits from './20261021_jersey_interest_kits';
import * as migration_20261117120000_homepage_hero_image from './20261117120000_homepage_hero_image';
import * as migration_20261117150000_fixture_club_logos from './20261117150000_fixture_club_logos';
import * as migration_20261117170000_homepage_hero_slides from './20261117170000_homepage_hero_slides';
import * as migration_20261120100000_website_settings_instagram_content from './20261120100000_website_settings_instagram_content';
import * as migration_20261121100000_website_settings_instagram_post_format from './20261121100000_website_settings_instagram_post_format';
import * as migration_20261123100000_website_reel_video_uploads from './20261123100000_website_reel_video_uploads';
import * as migration_20261123110000_website_youtube_highlights from './20261123110000_website_youtube_highlights';
import * as migration_20261123120000_seed_nusc_home_fixtures from './20261123120000_seed_nusc_home_fixtures';

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
  {
    up: migration_20261020_jersey_interest_unique_email.up,
    down: migration_20261020_jersey_interest_unique_email.down,
    name: '20261020_jersey_interest_unique_email',
  },
  {
    up: migration_20261021_jersey_interest_kits.up,
    down: migration_20261021_jersey_interest_kits.down,
    name: '20261021_jersey_interest_kits',
  },
  {
    up: migration_20261117120000_homepage_hero_image.up,
    down: migration_20261117120000_homepage_hero_image.down,
    name: '20261117120000_homepage_hero_image',
  },
  {
    up: migration_20261117150000_fixture_club_logos.up,
    down: migration_20261117150000_fixture_club_logos.down,
    name: '20261117150000_fixture_club_logos',
  },
  {
    up: migration_20261117170000_homepage_hero_slides.up,
    down: migration_20261117170000_homepage_hero_slides.down,
    name: '20261117170000_homepage_hero_slides',
  },
  {
    up: migration_20261120100000_website_settings_instagram_content.up,
    down: migration_20261120100000_website_settings_instagram_content.down,
    name: '20261120100000_website_settings_instagram_content',
  },
  {
    up: migration_20261121100000_website_settings_instagram_post_format.up,
    down: migration_20261121100000_website_settings_instagram_post_format.down,
    name: '20261121100000_website_settings_instagram_post_format',
  },
  {
    up: migration_20261123100000_website_reel_video_uploads.up,
    down: migration_20261123100000_website_reel_video_uploads.down,
    name: '20261123100000_website_reel_video_uploads',
  },
  {
    up: migration_20261123110000_website_youtube_highlights.up,
    down: migration_20261123110000_website_youtube_highlights.down,
    name: '20261123110000_website_youtube_highlights',
  },
  {
    up: migration_20261123120000_seed_nusc_home_fixtures.up,
    down: migration_20261123120000_seed_nusc_home_fixtures.down,
    name: '20261123120000_seed_nusc_home_fixtures',
  },
];
