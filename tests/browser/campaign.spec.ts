import { expect, test, type Page } from '@playwright/test';
import { campaignFixtureHtml } from '../fixtures/campaign-ui';

// Render production components with local synthetic actions. Block every other request.
async function mount(page: Page, screen: string, options: object = {}) {
  const {html,roles,qrSvg}=await campaignFixtureHtml();
  await page.route('**/*',route=>route.request().url()==='http://campaign.test/'
    ?route.fulfill({contentType:'text/html',body:html}):route.request().url()==='http://campaign.test/api/campaign/id/fixture-pass/qr'
      ?route.fulfill({contentType:'image/svg+xml',body:qrSvg}):route.abort());
  await page.goto('http://campaign.test/');
  await page.evaluate(`window.mountFixture(${JSON.stringify(screen)},${JSON.stringify({roles,...options})})`);
}

test('all requested Ahibi roles are selectable and Crew Others requires a specification',async({page})=>{
  await mount(page,'registration');
  await expect(page.locator('#preferredRoleId option')).toHaveCount(8);
  await page.selectOption('#preferredRoleId','ahibi_gate_3_scanning');
  await expect(page.locator('#preferredRoleId')).toHaveValue('ahibi_gate_3_scanning');
  await page.evaluate("window.mountFixture('registration',{roles:window.fixture.roles,category:'crew'})");
  await page.selectOption('#preferredRoleId','crew_others');
  await expect(page.getByLabel('Specify Role / Specialisation')).toBeVisible();
  await expect(page.getByLabel('Specify Role / Specialisation')).toHaveAttribute('required','');
});

test('status uses verified email access and reveals a pass only in the signed-in flow',async({page})=>{
  await mount(page,'status');
  await page.getByRole('textbox',{name:'Application Number',exact:true}).fill('NUSC-CMP-2026-ABCDEF0123456789');
  await page.getByRole('textbox',{name:'Registered Email',exact:true}).fill('candidate@example.invalid');
  await page.getByRole('button',{name:'Send sign-in link',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('sign-in link');
  await expect(page.getByRole('link',{name:/View & Download/})).toHaveCount(0);
  await page.evaluate("window.mountFixture('status',{verifiedEmail:'candidate@example.invalid'})");
  await page.getByRole('textbox',{name:'Application Number',exact:true}).fill('NUSC-CMP-2026-ABCDEF0123456789');
  await page.getByRole('button',{name:'View application status',exact:true}).click();
  await expect(page.getByText('Others: Camera operator').first()).toBeVisible();
  await expect(page.getByRole('link',{name:/View & Download/})).toHaveAttribute('href','/campaign/id/fixture-pass');
});

test('manager sees custom role details and approval produces a credential without a second action',async({page})=>{
  await mount(page,'detail');
  await expect(page.getByText('Others: Camera operator').first()).toBeVisible();
  await page.getByRole('button',{name:'Approve, issue ID & email pass',exact:true}).click();
  await expect(page.getByText('NUSC-ID-2026-ABCDEF',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'View / print pass'})).toHaveAttribute('href','https://campaign.example.invalid/campaign/id/pass');
  expect(await page.evaluate("window.fixture.calls.filter(call=>call[0]==='issue').length")).toBe(0);
  expect(await page.evaluate("window.fixture.calls.filter(call=>call[0]==='email-pass').length")).toBe(1);
  await page.getByLabel('Assigned role',{exact:true}).selectOption('crew_sound');
  await page.getByLabel('Match access',{exact:true}).selectOption('match-two');
  await page.getByRole('button',{name:'Save Assignment',exact:true}).click();
  expect(await page.evaluate("window.fixture.calls.findLast(call=>call[0]==='assign')")).toEqual(['assign','app','crew_sound','','','match-two']);
});

test('applicant list respects the Manage search link and opens the selected candidate for review',async({page})=>{
  await mount(page,'applications',{search:'search=NUSC-CMP-2026-ABCDEF0123456789'});
  await expect(page.getByRole('cell',{name:'Others: Camera operator',exact:true})).toBeVisible();
  expect(await page.evaluate("window.fixture.calls.find(call=>call[0]==='applications')[1].search")).toBe('NUSC-CMP-2026-ABCDEF0123456789');
  await page.getByRole('button',{name:'Open application',exact:true}).last().click();
  await expect(page.getByRole('heading',{name:'Synthetic Candidate',exact:true}).last()).toBeVisible();
  await expect(page.getByRole('button',{name:'Approve, issue ID & email pass',exact:true})).toBeEnabled();
});

test('reviewers can review but approval and assignment controls are unavailable',async({page})=>{
  await mount(page,'detail',{staffRole:'reviewer'});
  await expect(page.getByRole('button',{name:'Approve, issue ID & email pass',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Save Assignment',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Mark Under Review'}).click();
  expect(await page.evaluate("window.fixture.calls[0][2]")).toBe('under_review');
});

test('match creation sends explicit India-time opening and closing times',async({page})=>{
  await mount(page,'matches');
  await page.getByLabel('Match name',{exact:true}).fill('NUSC vs Team C');
  await page.getByLabel('Venue',{exact:true}).fill('Synthetic stadium');
  await page.getByLabel('Check-in opens (India time)',{exact:true}).fill('2026-12-10T15:00');
  await page.getByLabel('Check-in closes (India time)',{exact:true}).fill('2026-12-10T22:00');
  await page.getByRole('button',{name:'Save match',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Match saved');
  const saved=await page.evaluate("window.fixture.calls.find(call=>call[0]==='match')[1]");
  expect(saved.startDate).toBe('2026-12-10T09:30:00.000Z');expect(saved.endDate).toBe('2026-12-10T16:30:00.000Z');
});

test('scanner requires a match, uses the latest gate and match, and offers manual entry after camera denial',async({page})=>{
  await mount(page,'scanner');
  await expect(page.getByRole('button',{name:'Verify and check in',exact:true})).toBeDisabled();
  await page.locator('#campaign-scan-match').selectOption('match-two');
  await page.locator('#campaign-scan-gate').selectOption('Gate 3');
  await page.evaluate("Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>Promise.reject(new Error('synthetic camera denial'))}})");
  await page.getByRole('button',{name:'Start camera scanner',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Camera unavailable');
  await page.getByLabel('QR value or printed pass ID').fill('NUSC-ID-2026-ABCDEF');
  await page.getByRole('button',{name:'Verify and check in',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('NUSC vs Team B');
  expect(await page.evaluate("window.fixture.calls.find(call=>call[0]==='scan')")).toEqual(['scan','NUSC-ID-2026-ABCDEF','Gate 3','match-two']);
});

test('attendance shows the match and specified Crew role and filters by match',async({page})=>{
  await mount(page,'attendance');
  await expect(page.getByRole('cell',{name:'NUSC vs Team A',exact:true})).toBeVisible();
  await expect(page.getByText('Others: Camera operator')).toBeVisible();
  await page.getByLabel('Match',{exact:true}).selectOption('match-two');
  await expect.poll(()=>page.evaluate("window.fixture.calls.filter(call=>call[0]==='attendance').at(-1).at(-1)")).toBe('match-two');
});

test('digital pass loads the QR and allows printing only after it is ready',async({page})=>{
  await mount(page,'pass');
  await expect(page.getByRole('img',{name:'Gate Verification QR Code'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Print \/ Save Pass/})).toBeEnabled();
  await page.getByRole('button',{name:/Print \/ Save Pass/}).click();
  expect(await page.evaluate("window.fixture.calls")).toEqual([['print']]);
});

test('success screen displays official application number and offers copy, download slip and print',async({page})=>{
  await mount(page,'success',{search:'num=NUSC-CMP-2026-1B2E0EC3504D9332&cat=ahibi&name=TEST'});
  await expect(page.getByText('NUSC-CMP-2026-1B2E0EC3504D9332')).toBeVisible();
  await expect(page.getByRole('button',{name:/Download Official Slip/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Copy Number/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Print \/ Save PDF/})).toBeVisible();
  await page.getByRole('button',{name:/Print \/ Save PDF/}).click();
  expect(await page.evaluate("window.fixture.calls")).toEqual([['print']]);
});

for(const width of [390,1366]) test(`campaign forms and scanner fit ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  for(const screen of ['status','matches','scanner','detail','pass','success']){
    await mount(page,screen,{search:'num=NUSC-CMP-2026-ABCDEF0123456789'});
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(screen+'-'+width+'.png'),fullPage:true});
  }
});
