import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSource } from './fixtures/campaign-actions.mjs';

const roleId = '22222222-2222-4222-8222-222222222222';
const rows = [
  {
    id: 'scan-media', action: 'check_in', checkpoint_type: 'gate', gate: 'Gate 1', scanned_by: 'gate@example.invalid',
    scanned_at: '2026-11-03T10:00:00.000Z', notes: '=HYPERLINK("https://example.invalid")',
    event: { title: 'Match One' }, campaign_id_record: { id_number: 'NUSC-ID-2026-AAAAAAAAAAAAAAAA' },
    application: {
      application_number: 'NUSC-MED-001', full_name: 'Synthetic Media Candidate', category: 'media',
      other_role: 'Camera Operator', assigned_role_id: roleId,
      assigned_role: { name: 'Other', code: 'media_others' },
    },
  },
  {
    id: 'scan-crew', action: 'check_out', checkpoint_type: 'booth', gate: 'Media Booth', scanned_by: 'crew@example.invalid',
    scanned_at: '2026-11-03T11:00:00.000Z', notes: 'Completed',
    event: { title: 'Match One' }, campaign_id_record: { id_number: 'NUSC-ID-2026-BBBBBBBBBBBBBBBB' },
    application: {
      application_number: 'NUSC-CRW-001', full_name: 'Different Crew Candidate', category: 'crew',
      other_role: null, assigned_role_id: '33333333-3333-4333-8333-333333333333',
      assigned_role: { name: 'Sound', code: 'crew_sound' },
    },
  },
];

function nestedValue(row, path) {
  return path.split('.').reduce((value, part) => Array.isArray(value) ? value[0]?.[part] : value?.[part], row);
}

function attendanceApi(staffRoles = ['campaign_manager']) {
  const calls = [];
  const client = {
    from(table) {
      assert.equal(table, 'campaign_attendance');
      const filters = [];
      let from = 0, to = 999999;
      const chain = {
        select: () => chain,
        order: () => chain,
        range: (start, end) => { from = start; to = end; return chain; },
        eq: (field, value) => { filters.push(['eq', field, value]); calls.push(['eq', field, value]); return chain; },
        ilike: (field, value) => { filters.push(['ilike', field, value]); calls.push(['ilike', field, value]); return chain; },
        then(resolve, reject) {
          const matched = rows.filter(row => filters.every(([kind, field, expected]) => {
            const actual = nestedValue(row, field);
            if (kind === 'eq') return actual === expected;
            const expression = new RegExp(`^${expected.split('%').map(part => part.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('.*')}$`, 'i');
            return expression.test(String(actual ?? ''));
          }));
          return Promise.resolve({ data: matched.slice(from, to + 1), count: matched.length, error: null }).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  const api = loadSource('apps/admin/src/actions/campaignAdminActions.ts', {
    '../utils/supabaseServerClient': {
      getSupabaseAdminClient: () => client,
      assertStaffRole: async allowed => {
        if (!allowed.some(role => staffRoles.includes(role))) throw new Error('Access denied');
        return { userId: 'staff', email: 'manager@example.invalid', roles: staffRoles };
      },
    },
    '../utils/campaignRoleLabel': loadSource('apps/admin/src/utils/campaignRoleLabel.ts', {}),
    qrcode: {},
  });
  return { api, calls };
}

test('attendance history filters by person, department, role and checkpoint; CSV export is filtered and safe', async () => {
  const { api, calls } = attendanceApi();
  const filters = { person: 'Synthetic Media', department: 'media', roleId, gate: 'Gate 1', checkpointType: 'gate' };
  const page = await api.getCampaignAttendanceHistory(1, 25, filters.gate, 'all', 'all', filters.checkpointType,
    filters.person, filters.department, filters.roleId);
  assert.equal(page.totalCount, 1);
  assert.equal(page.logs[0].id, 'scan-media');

  const csv = await api.exportCampaignAttendanceCsv(filters);
  assert.match(csv, /Synthetic Media Candidate/);
  assert.match(csv, /NUSC-MED-001/);
  assert.match(csv, /Other: Camera Operator/);
  assert.match(csv, /'=HYPERLINK/);
  assert.doesNotMatch(csv, /Different Crew Candidate/);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'application.category' && call[2] === 'media'));
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'application.assigned_role_id' && call[2] === roleId));
  assert.ok(calls.some(call => call[0] === 'ilike' && call[1] === 'application.full_name'));
});

test('reviewers cannot export attendance or apply unsupported attendance filters', async () => {
  const { api } = attendanceApi(['reviewer']);
  await assert.rejects(api.exportCampaignAttendanceCsv(), /Access denied/);
  const { api: managerApi } = attendanceApi();
  await assert.rejects(managerApi.getCampaignAttendanceHistory(1, 25, undefined, undefined, undefined, 'invalid'), /Invalid checkpoint filter/);
  await assert.rejects(managerApi.exportCampaignAttendanceCsv({ department: 'invalid' }), /Invalid department filter/);
});

test('status action supplies the authenticated staff UUID and keeps approval manager-only', async () => {
  const calls = [];
  const api = loadSource('apps/admin/src/actions/campaignAdminActions.ts', {
    '../utils/supabaseServerClient': {
      getSupabaseAdminClient: () => ({ rpc: async (name, args) => { calls.push([name, args]); return { data: { success: true }, error: null }; } }),
      assertStaffRole: async allowed => {
        if (!allowed.includes('reviewer')) throw new Error('Access denied');
        return { userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'reviewer@example.invalid', roles: ['reviewer'] };
      },
    },
    qrcode: {},
  });
  await api.updateApplicationStatus('application-id', 'rejected', 'Review note');
  assert.equal(calls[0][0], 'review_campaign_application');
  assert.deepEqual(calls[0][1], {
    p_application_id: 'application-id', p_status: 'rejected',
    p_actor_user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', p_notes: 'Review note',
  });
  await assert.rejects(api.updateApplicationStatus('application-id', 'approved'), /Access denied/);
  assert.equal(calls.length, 1);
});

test('legacy Press accreditation is super-admin read-only and signs only record-owned documents', async () => {
  const signedPaths = [];
  const config = loadSource('apps/admin/src/collections/PressAccreditations.ts', {
    '@nusc/db': { createAdminClient: () => ({ storage: { from: bucket => ({
      createSignedUrl: async path => { signedPaths.push([bucket, path]); return { data: { signedUrl: `https://signed.invalid/${path}` }, error: null }; },
    }) } }) },
  }).PressAccreditations;
  const read = user => config.access.read({ req: { user } });

  assert.equal(read(null), false);
  assert.equal(read({ roles: ['reviewer'] }), false);
  assert.equal(read({ display_roles: [{ role: 'campaign_manager' }] }), false);
  assert.equal(read({ roles: ['super_admin'] }), true);
  assert.equal(config.access.create(), false);
  assert.equal(config.access.update(), false);
  assert.equal(config.access.delete(), false);
  assert.equal(config.access.readVersions(), false);
  assert.equal(config.access.unlock(), false);

  const beforeRead = config.hooks.beforeRead[0];
  const user = { roles: ['super_admin'] };
  const result = await beforeRead({
    doc: {
      accreditationId: 'NUSC-MEDIA-1',
      photoFilename: 'photo.png',
      photoUrl: 'https://db.invalid/storage/v1/object/public/press_documents/NUSC-MEDIA-1/photo.png',
      govtIdFilename: 'id.png',
      govtIdUrl: 'https://db.invalid/storage/v1/object/public/press_documents/ANOTHER-RECORD/id.png',
    },
    req: { user, routeParams: { id: 'record-id' } },
  });
  assert.equal(result.photoUrl, 'https://signed.invalid/NUSC-MEDIA-1/photo.png');
  assert.equal(result.govtIdUrl, null);
  assert.deepEqual(signedPaths, [['press_documents', 'NUSC-MEDIA-1/photo.png']]);

  let queried = false;
  const forbidden = await config.endpoints[0].handler({
    user: { roles: ['reviewer'] }, payload: { find: async () => { queried = true; return { docs: [] }; } },
  });
  assert.equal(forbidden.status, 403);
  assert.equal(queried, false);
});
