import { expect, test, type Page } from '@playwright/test';
import { campaignFixtureHtml } from '../fixtures/campaign-ui';

// Render production components with local synthetic actions. Block every other request.
async function mount(page: Page, screen: string, options: object = {}) {
  const {html,roles,qrSvg,qrPngBase64,nuscCrest}=await campaignFixtureHtml();
  await page.route('**/*',route=>route.request().url()==='http://campaign.test/'
    ?route.fulfill({contentType:'text/html',body:html}):route.request().url()==='http://campaign.test/api/campaign/id/fixture-pass/qr'
      ?route.fulfill({contentType:'image/svg+xml',body:qrSvg}):route.request().url()==='http://campaign.test/images/nusc-crest.png'
        ?route.fulfill({contentType:'image/png',body:nuscCrest}):route.abort());
  await page.goto('http://campaign.test/');
  await page.evaluate(`window.mountFixture(${JSON.stringify(screen)},${JSON.stringify({roles,qrPngBase64,...options})})`);
}

test('all requested Ahibi roles are selectable and Crew Others requires a specification',async({page})=>{
  await mount(page,'registration');
  await expect(page.locator('#preferredRoleId option[value]:not([value=""])')).toHaveCount(8);
  await page.selectOption('#preferredRoleId','ahibi_gate_3_scanning');
  await expect(page.locator('#preferredRoleId')).toHaveValue('ahibi_gate_3_scanning');
  await page.evaluate("window.mountFixture('registration',{roles:window.fixture.roles,category:'crew'})");
  await page.selectOption('#preferredRoleId','crew_others');
  await expect(page.getByLabel('Specify role')).toBeVisible();
  await expect(page.getByLabel('Specify role')).toHaveAttribute('required','');
  await page.evaluate("window.mountFixture('registration',{category:'management'})");
  await expect(page.locator('#organisation option[value="Others"]')).toHaveText('Other');
});

test('status uses verified email access and reveals a pass only in the signed-in flow',async({page})=>{
  await mount(page,'status');
  await page.getByRole('textbox',{name:'Registration ID',exact:true}).fill('NUSC-CMP-2026-ABCDEF0123456789');
  await page.getByRole('textbox',{name:'Registered email',exact:true}).fill('candidate@example.invalid');
  await page.getByRole('button',{name:'Send sign-in link',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('sign-in link');
  await expect(page.getByRole('link',{name:/View & Download/})).toHaveCount(0);
  await page.evaluate("window.mountFixture('status',{verifiedEmail:'candidate@example.invalid'})");
  await page.getByRole('textbox',{name:'Registration ID',exact:true}).fill('NUSC-CMP-2026-ABCDEF0123456789');
  await page.getByRole('button',{name:'View application status',exact:true}).click();
  await expect(page.getByText('Other: Camera operator').first()).toBeVisible();
  await expect(page.getByRole('link',{name:/View & Download/})).toHaveAttribute('href','/campaign/id/fixture-pass');
});

test('approval issues a pass without sending it; manager can preview, download and choose delivery',async({page})=>{
  await mount(page,'detail');
  await expect(page.getByText('Other: Camera operator').first()).toBeVisible();
  await page.getByRole('button',{name:'Approve & issue ID',exact:true}).click();
  await expect(page.getByText('NUSC-ID-2026-ABCDEF',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Preview & download ID',exact:true})).toBeVisible();
  expect(await page.evaluate("window.fixture.calls.filter(call=>call[0]==='issue').length")).toBe(0);
  expect(await page.evaluate("window.fixture.calls.filter(call=>call[0]==='email-pass').length")).toBe(0);
  await page.getByRole('button',{name:'Preview & download ID',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Workforce ID preview'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('article',{name:'NUSC workforce identity card'})).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'Synthetic Candidate',exact:true})).toBeVisible();
  await expect(dialog.getByText('NUSC-CMP-2026-ABCDEF0123456789')).toBeVisible();
  await expect(dialog.getByRole('img',{name:'Entry and attendance QR for NUSC-ID-2026-ABCDEF'})).toBeVisible();
  await expect(dialog.getByRole('img',{name:'Nagaland United Sports Club crest'})).toHaveAttribute('src','/images/nusc-crest.png');
  expect(await dialog.getByRole('img',{name:'Nagaland United Sports Club crest'}).evaluate(element=>(element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const cardDimensions=await dialog.getByRole('article',{name:'NUSC workforce identity card'}).evaluate(element=>({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}));
  expect(cardDimensions.height).toBeGreaterThan(cardDimensions.width);
  await dialog.getByRole('button',{name:'Download complete ID with QR (PDF)'}).click();
  const printFrame=page.frameLocator('#campaign-workforce-id-print-frame');
  await expect(page.locator('#campaign-workforce-id-print-frame')).toHaveCount(1);
  await expect(printFrame.getByRole('article',{name:'NUSC workforce identity card'})).toBeVisible();
  expect(await printFrame.locator('body > article').count()).toBe(1);
  expect(await printFrame.locator('style').textContent()).toContain('@page { size: 86mm 144mm; margin: 0; }');
  await expect(printFrame.getByRole('img',{name:'Nagaland United Sports Club crest'})).toHaveAttribute('src','/images/nusc-crest.png');
  const printedDimensions=await printFrame.getByRole('article',{name:'NUSC workforce identity card'}).evaluate(element=>({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}));
  expect(printedDimensions.height).toBeGreaterThan(printedDimensions.width);
  await expect(dialog.getByRole('link',{name:'Open WhatsApp draft for 9000000000'})).toHaveAttribute('href',/wa\.me\/919000000000\?/);
  await expect(dialog.getByText(/WhatsApp has no automatic sender configured/)).toBeVisible();
  expect(await page.evaluate("window.fixture.calls.filter(call=>call[0]==='preview-pass').length")).toBe(1);
  await dialog.getByRole('button',{name:'Email pass link and QR to candidate@example.invalid'}).click();
  await expect(dialog.getByRole('status')).toContainText('accepted by the email provider');
  expect(await page.evaluate("window.fixture.calls.filter(call=>call[0]==='email-pass').length")).toBe(1);
  await dialog.getByRole('button',{name:'Close pass preview'}).click();
  await page.getByLabel('Assigned role',{exact:true}).selectOption('crew_sound');
  await page.getByLabel('Match access',{exact:true}).selectOption('match-two');
  await page.getByRole('button',{name:'Save Assignment',exact:true}).click();
  expect(await page.evaluate("window.fixture.calls.findLast(call=>call[0]==='assign')")).toEqual(['assign','app','crew_sound','','','match-two']);
});

test('email setup failures are shown clearly inside the pass preview',async({page})=>{
  await mount(page,'detail',{emailResult:{success:false,message:'Resend rejected the sender domain.'}});
  await page.getByRole('button',{name:'Approve & issue ID',exact:true}).click();
  await page.getByRole('button',{name:'Preview & download ID',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Workforce ID preview'});
  await dialog.getByRole('button',{name:'Email pass link and QR to candidate@example.invalid'}).click();
  await expect(dialog.getByRole('alert')).toContainText('Resend rejected the sender domain.');
});

test('approved expired IDs remain previewable and printable, but cannot be delivered',async({page})=>{
  await mount(page,'detail',{expiredPass:true});
  await page.getByRole('button',{name:'Approve & issue ID',exact:true}).click();
  await expect(page.getByText('Status: Expired')).toBeVisible();
  await expect(page.getByRole('button',{name:'Preview & download ID',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Preview & download ID',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Workforce ID preview'});
  await expect(dialog.getByRole('article',{name:'NUSC workforce identity card'})).toBeVisible();
  await expect(dialog.getByText(/This ID is expired/)).toBeVisible();
  await expect(dialog.getByRole('img',{name:'Entry and attendance QR for NUSC-ID-2026-ABCDEF'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Download complete ID with QR (PDF)'})).toBeEnabled();
  await expect(dialog.getByRole('button',{name:'Email pass link and QR to candidate@example.invalid'})).toBeDisabled();
  await expect(dialog.getByRole('link',{name:/Open WhatsApp draft/})).toHaveCount(0);
  await dialog.getByRole('button',{name:'Download complete ID with QR (PDF)'}).click();
  const printFrame=page.frameLocator('#campaign-workforce-id-print-frame');
  await expect(printFrame.getByRole('article',{name:'NUSC workforce identity card'})).toBeVisible();
  expect(await printFrame.locator('body > article').count()).toBe(1);
  expect(await printFrame.locator('style').textContent()).toContain('@page { size: 86mm 144mm; margin: 0; }');
});

test('applicant list respects the Manage search link and opens the selected candidate for review',async({page})=>{
  await mount(page,'applications',{search:'search=NUSC-CMP-2026-ABCDEF0123456789'});
  await expect(page.getByRole('cell',{name:'Other: Camera operator',exact:true})).toBeVisible();
  expect(await page.evaluate("window.fixture.calls.find(call=>call[0]==='applications')[1].search")).toBe('NUSC-CMP-2026-ABCDEF0123456789');
  await page.getByRole('button',{name:'Open application',exact:true}).last().click();
  await expect(page.getByRole('heading',{name:'Synthetic Candidate',exact:true}).last()).toBeVisible();
  await expect(page.getByRole('button',{name:'Approve & issue ID',exact:true})).toBeEnabled();
});

test('reviewers can review but approval and assignment controls are unavailable',async({page})=>{
  await mount(page,'detail',{staffRole:'reviewer'});
  await expect(page.getByRole('button',{name:'Approve & issue ID',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Save Assignment',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Mark Under Review'}).click();
  expect(await page.evaluate("window.fixture.calls[0][2]")).toBe('under_review');

  await mount(page,'detail',{staffRole:'reviewer',app:{
    id:'app',application_number:'NUSC-MED-001',full_name:'Approved Candidate',category:'crew',
    preferred_role_id:'crew_others',assigned_role_id:'crew_others',preferred_role:{name:'Others',code:'crew_others'},
    assigned_role:{name:'Others',code:'crew_others'},other_role:'Camera operator',application_status:'approved',
    email:'candidate@example.invalid',phone:'9000000000',gender:'Female',date_of_birth:'2000-01-01',
    availability:'Matchdays',address:'Synthetic address',emergency_contact_name:'Contact',emergency_contact_phone:'9000000001',
  }});
  await expect(page.getByRole('button',{name:'Mark Under Review'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Waitlist'})).toBeDisabled();
  await expect(page.getByRole('button',{name:/Reject/})).toBeDisabled();
  expect(await page.evaluate("window.fixture.calls.filter(call=>call[0]==='review').length")).toBe(0);
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
  await expect(page.getByRole('status')).toContainText('Attendance recorded successfully');
  expect(await page.evaluate("window.fixture.calls.find(call=>call[0]==='scan')")).toEqual(['scan','NUSC-ID-2026-ABCDEF','Gate 3','match-two']);
});

test('attendance shows the match and specified Crew role and filters by match',async({page})=>{
  await mount(page,'attendance');
  await expect(page.getByRole('cell',{name:'NUSC vs Team A',exact:true})).toBeVisible();
  await expect(page.getByText('Other: Camera operator')).toBeVisible();
  await page.getByLabel('Match',{exact:true}).selectOption('match-two');
  await expect.poll(()=>page.evaluate("window.fixture.calls.filter(call=>call[0]==='attendance').at(-1).at(5)")).toBe('match-two');
});

test('attendance filters by person, department, role and checkpoint, then exports the active filters',async({page})=>{
  const roleId='22222222-2222-4222-8222-222222222222';
  await mount(page,'attendance',{roles:[{id:roleId,category:'media',name:'Other',code:'media_others'}]});
  await page.getByLabel('Person',{exact:true}).fill('NUSC-MED-001');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.locator('#campaign-attendance-department').selectOption('media');
  await page.locator('#campaign-attendance-role').selectOption(roleId);
  await page.locator('#campaign-attendance-checkpoint').selectOption('booth');
  await expect.poll(()=>page.evaluate("window.fixture.calls.filter(call=>call[0]==='attendance').at(-1)"))
    .toEqual(['attendance',1,25,'all','all','all','booth','NUSC-MED-001','media',roleId]);
  await page.getByRole('button',{name:'Export CSV'}).click();
  await expect.poll(()=>page.evaluate("window.fixture.calls.findLast(call=>call[0]==='attendance-export')?.[1]"))
    .toEqual({gate:'all',action:'all',eventId:'all',checkpointType:'booth',person:'NUSC-MED-001',department:'media',roleId});
});

test('pass card displays management affiliation and Press and Media details',async({page})=>{
  await mount(page,'pass',{affiliation:'Nagaland United Example Organisation'});
  await expect(page.getByText('Management affiliation',{exact:true})).toBeVisible();
  await expect(page.getByText('Nagaland United Example Organisation',{exact:true})).toBeVisible();
  await page.evaluate("window.mountFixture('pass',{mediaOutlet:'The Naga Chronicle',mediaOrganisationType:'Broadcast / TV'})");
  await expect(page.getByText('Media outlet',{exact:true})).toBeVisible();
  await expect(page.getByText('The Naga Chronicle',{exact:true})).toBeVisible();
  await expect(page.getByText('Media organisation',{exact:true})).toBeVisible();
  await expect(page.getByText('Broadcast / TV',{exact:true})).toBeVisible();
});

test('digital pass loads the QR and allows printing only after it is ready',async({page})=>{
  await mount(page,'pass');
  await expect(page.getByRole('img',{name:'Entry and attendance QR for NUSC-ID-2026-ABCDEF0123456789'})).toBeVisible();
  await expect(page.getByRole('img',{name:'Nagaland United Sports Club crest'})).toHaveAttribute('src','/images/nusc-crest.png');
  expect(await page.getByRole('img',{name:'Nagaland United Sports Club crest'}).evaluate(element=>(element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText('NUSC-ID-2026-ABCDEF0123456789',{exact:true})).toBeVisible();
  const cardDimensions=await page.locator('.id-pass-card').evaluate(element=>({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}));
  expect(cardDimensions.height).toBeGreaterThan(cardDimensions.width);
  await expect(page.getByRole('button',{name:/Print \/ Save ID/})).toBeEnabled();
  await page.getByRole('button',{name:/Print \/ Save ID/}).click();
  expect(await page.evaluate("window.fixture.calls")).toEqual([['print']]);
  await page.emulateMedia({media:'print'});
  const printedDimensions=await page.locator('.id-pass-card').evaluate(element=>({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}));
  expect(printedDimensions.height).toBeGreaterThan(printedDimensions.width);
  expect(await page.locator('.id-pass-card').count()).toBe(1);
  await page.emulateMedia({media:'screen'});
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
