import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { loadSource, publicActions, query, submittedForm } from './fixtures/campaign-actions.mjs';

const number = 'NUSC-CMP-2026-ABCDEF0123456789';
const roleId = '11111111-1111-4111-8111-111111111112';
const app = {id:'synthetic-app',application_number:number,email:'candidate@example.invalid',full_name:'Synthetic Candidate',
  category:'crew',application_status:'approved',preferred_role:{name:'Others',code:'crew_others'},other_role:'Camera operator'};
const verified = {id:'synthetic-user',email:'candidate@example.invalid',email_confirmed_at:'2026-01-01'};

test('status requires a verified server session; application number, email and partial phone alone grant no access', async () => {
  for (const user of [null,{...verified,email_confirmed_at:null}]) {
    const {api,calls}=publicActions({user,application:app});
    for (const contact of ['3210','candidate@example.invalid','9000000000']) {
      const result=await api.checkCampaignStatus(number,contact);
      assert.equal(result.success,false);assert.equal(result.requiresSignIn,true);
    }
    assert.equal(calls.some(call=>call[0]==='select'),false);
  }
});

test('verified users see only their own application and its issued pass; Others description remains visible', async () => {
  const foreign=publicActions({user:{...verified,email:'other@example.invalid'},application:app});
  assert.equal((await foreign.api.checkCampaignStatus(number)).success,false);
  const own=publicActions({user:verified,application:app,pass:{pass_slug:'synthetic-pass',valid_from:'2026-01-01',valid_until:'2099-01-01'}});
  const result=await own.api.checkCampaignStatus(number);
  assert.equal(result.success,true);assert.equal(result.data.passSlug,'synthetic-pass');
  assert.equal(result.data.preferredRoleName,'Others: Camera operator');
  assert.ok(own.calls.some(call=>call[0]==='eq'&&call[1]==='campaign_applications'&&call[2]==='email'&&call[3]===verified.email));
});

test('sign-in links target only the registered email and matching/nonmatching applications have the same response', async () => {
  const previous=process.env.NEXT_PUBLIC_SITE_URL;process.env.NEXT_PUBLIC_SITE_URL='https://campaign.example.invalid';
  try {
    const matching=publicActions({application:app}),missing=publicActions({application:null});
    const first=await matching.api.requestCampaignAccess(number,app.email);
    const second=await missing.api.requestCampaignAccess(number,'other@example.invalid');
    assert.deepEqual(first,second);
    const delivery=matching.calls.find(call=>call[0]==='email')[1];
    assert.equal(delivery.email,app.email);
    assert.equal(delivery.options.emailRedirectTo,`https://campaign.example.invalid/campaign/auth/callback?num=${number}`);
    assert.equal(missing.calls.some(call=>call[0]==='email'),false);
    const limited=publicActions({application:app,rateAllowed:false});
    assert.equal((await limited.api.requestCampaignAccess(number,app.email)).success,false);
    assert.equal(limited.calls.some(call=>call[0]==='email'),false);
  } finally { if(previous===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=previous; }
});

test('registration allowlists fields, preserves Other specification and consent, and never creates a credential', async () => {
  const {api,calls}=publicActions({role:{id:roleId,code:'crew_others',category:'crew'}});
  const result=await api.submitCampaignApplication(submittedForm());
  assert.equal(result.success,true);assert.equal(result.applicationNumber,'NUSC-CRW-123');
  const payload=calls.find(call=>call[0]==='insert'&&call[1]==='campaign_applications')[2];
  assert.equal(payload.application_status,'submitted');assert.equal(payload.other_role,'Camera operator');
  assert.equal(payload.email,'candidate@example.invalid');assert.equal(payload.idempotency_key,'11111111-1111-4111-8111-111111111111');
  assert.match(payload.idempotency_request_hash,/^[0-9a-f]{64}$/);assert.equal(payload.crew_work_arrangement,'independent');
  assert.ok(payload.terms_accepted_at);assert.equal(payload.assigned_role_id,undefined);assert.equal(payload.event_id,undefined);
  assert.equal(calls.some(call=>call[1]==='campaign_ids'),false);
});

test('management registration keeps Others as the organisation and stores the custom name separately', async () => {
  const role = {id:roleId,code:'management_role',category:'management',is_active:true};
  const {api,calls} = publicActions({role});
  const form = new FormData();
  for (const [key,value] of Object.entries({
    idempotencyKey:'22222222-2222-4222-8222-222222222222',
    fullName:'Synthetic Manager',phone:'9000000044',email:'manager@example.invalid',
    category:'management',preferredRoleId:'',organisation:'Others',
    organisationOther:'Nagaland United Example Organisation',designation:'Operations Director',
    availabilityMode:'all',termsAccepted:'true',
  })) form.set(key,value);
  form.set('photo',new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'synthetic.png',{type:'image/png'}));

  const result = await api.submitCampaignApplication(form);
  assert.equal(result.success,true);
  const payload = calls.find(call=>call[0]==='insert'&&call[1]==='campaign_applications')[2];
  assert.equal(payload.organisation,'Others');
  assert.equal(payload.organisation_other,'Nagaland United Example Organisation');
});

test('registration normalizes email and Indian phone numbers before persistence', async () => {
  const form=submittedForm({email:' Candidate@Example.Invalid ',phone:'+91 (900) 000-0000'});
  const {api,calls}=publicActions({role:{id:roleId,code:'crew_others',category:'crew'}});
  const result=await api.submitCampaignApplication(form);
  assert.equal(result.success,true);
  const payload=calls.find(call=>call[0]==='insert'&&call[1]==='campaign_applications')[2];
  assert.equal(payload.email,'candidate@example.invalid');
  assert.equal(payload.phone,'9000000000');
});

test('document upload rate limits use the same normalized phone and reject malformed numbers', async () => {
  const valid=publicActions();
  const uploaded=await valid.api.createMediaAuthorisationUploadUrl('authorisation.pdf',1024,'+91 (900) 000-0000');
  assert.equal(uploaded.success,true);
  const phoneBucket=`media-document-upload:${createHash('sha256').update('9000000000').digest('hex')}`;
  assert.ok(valid.calls.some(call=>call[0]==='rpc'&&call[2].p_bucket===phoneBucket));

  const invalid=publicActions();
  const rejected=await invalid.api.createMediaAuthorisationUploadUrl('authorisation.pdf',1024,'abc9000000000');
  assert.equal(rejected.success,false);
  assert.equal(invalid.calls.some(call=>call[0]==='rpc'),false);
});

test('registration rejects category substitution, missing Other detail and non-image uploads', async () => {
  for(const [role,form] of [
    [{id:roleId,code:'vol_security',category:'volunteer'},submittedForm()],
    [{id:roleId,code:'crew_others',category:'crew'},submittedForm({otherRole:''})],
  ]){
    const fixture=publicActions({role});assert.equal((await fixture.api.submitCampaignApplication(form)).success,false);
    assert.equal(fixture.calls.some(call=>call[0]==='upload'),false);
  }
  const form=submittedForm();form.set('photo',new File(['<script>attack</script>'],'photo.jpg',{type:'image/jpeg'}));
  const fixture=publicActions({role:{id:roleId,code:'crew_others',category:'crew'}});
  assert.equal((await fixture.api.submitCampaignApplication(form)).success,false);
  assert.equal(fixture.calls.some(call=>call[0]==='upload'),false);
});

test('registration validates required normalized contacts, rejects unsupported fields and duplicate identities before upload', async () => {
  for (const form of [
    submittedForm({email:''}),
    submittedForm({email:'not-an-email'}),
    submittedForm({fullName:'   '}),
  ]) {
    const fixture=publicActions({role:{id:roleId,code:'crew_others',category:'crew'}});
    assert.equal((await fixture.api.submitCampaignApplication(form)).success,false);
    assert.equal(fixture.calls.some(call=>['upload','insert'].includes(call[0])),false);
  }

  const unsupported=submittedForm();unsupported.set('application_status','approved');
  const invalid=publicActions({role:{id:roleId,code:'crew_others',category:'crew'}});
  assert.equal((await invalid.api.submitCampaignApplication(unsupported)).success,false);
  assert.equal(invalid.calls.some(call=>['upload','insert'].includes(call[0])),false);

  const duplicate=publicActions({role:{id:roleId,code:'crew_others',category:'crew'},identityClaims:[
    {identity_kind:'phone',normalized_value:'9000000000',application_id:'existing-application'},
  ]});
  const result=await duplicate.api.submitCampaignApplication(submittedForm());
  assert.equal(result.success,false);assert.match(result.error,/already been submitted/);
  assert.equal(duplicate.calls.some(call=>['upload','insert'].includes(call[0])),false);
});

test('registration retries with the same idempotency key return the prior result without another upload or insert', async () => {
  const form=submittedForm();
  const role={id:roleId,code:'crew_others',category:'crew'};
  const first=publicActions({role});
  const created=await first.api.submitCampaignApplication(form);
  const payload=first.calls.find(call=>call[0]==='insert'&&call[1]==='campaign_applications')[2];
  const replay=publicActions({role,idempotencyApplication:{
    idempotency_key:'11111111-1111-4111-8111-111111111111',
    application_number:created.applicationNumber,full_name:created.fullName,category:created.category,
    phone:payload.phone,email:payload.email,idempotency_request_hash:payload.idempotency_request_hash,
  }});
  const result=await replay.api.submitCampaignApplication(form);
  assert.equal(result.success,true);assert.equal(result.applicationNumber,created.applicationNumber);
  assert.equal(replay.calls.some(call=>call[0]==='insert'||call[0]==='upload'),false);
});

test('registration does not misreport unrelated unique-key conflicts as duplicate contact details', async () => {
  const fixture=publicActions({
    role:{id:roleId,code:'crew_others',category:'crew'},
    insertError:{code:'23505',message:'duplicate key value violates unique constraint "campaign_applications_application_number_key"'},
  });
  const result=await fixture.api.submitCampaignApplication(submittedForm());
  assert.equal(result.success,false);
  assert.match(result.error,/could not be saved/i);
  assert.doesNotMatch(result.error,/contact details/i);
});

test('failed registration removes its uploaded photograph', async () => {
  const fixture=publicActions({role:{id:roleId,code:'crew_others',category:'crew'},insertError:{code:'synthetic-failure'}});
  assert.equal((await fixture.api.submitCampaignApplication(submittedForm())).success,false);
  assert.equal(fixture.calls.filter(call=>call[0]==='remove').length,1);
});

test('registration distinguishes real cooldowns from database setup failures and remains fail-closed', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const limited = publicActions({ rateAllowed:false });
    const cooldown = await limited.api.submitCampaignApplication(submittedForm());
    assert.equal(cooldown.success,false);
    assert.match(cooldown.error,/Too many attempts.*15 minutes/);
    for (const code of ['PGRST202','PGRST205','42883','42P01']) {
      const fixture = publicActions({ rateError:{ code } });
      const result = await fixture.api.submitCampaignApplication(submittedForm());
      assert.equal(result.success,false);
      assert.match(result.error,/database setup is incomplete/);
      assert.equal(result.error.includes('Too many attempts'),false);
      assert.equal(fixture.calls.some(call => call[0]==='upload' || call[0]==='insert'),false);
    }
    process.env.NODE_ENV = 'production';
    const unavailable = publicActions({ rateError:{ code:'PGRST202' } });
    const result = await unavailable.api.submitCampaignApplication(submittedForm());
    assert.match(result.error,/services are temporarily unavailable/);
    assert.equal(result.error.includes('migrations'),false);
    const malformed = publicActions({ rateAllowed:null });
    assert.match((await malformed.api.submitCampaignApplication(submittedForm())).error,/services are temporarily unavailable/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});

test('campaign roles use the campaign login portal, general staff use the staff portal, and customers remain excluded', async () => {
  const roles=loadSource('apps/admin/src/auth/staffRoles.ts',{});
  for(const role of ['campaign_manager','reviewer','gate_staff','super_admin','customer']){
    const user={id:'synthetic-staff',email:'staff@example.invalid'};
    const supabase={auth:{getClaims:async()=>({data:{claims:{sub:user.id}},error:null}),
      signInWithPassword:async()=>({data:{user},error:null}),getUser:async()=>({data:{user}}),signOut:async()=>{}},
    from:()=>query([{role}])};
    const payload={find:async()=>({docs:[{id:'payload-staff',...user}]}),update:async()=>({})};
    const strategy=loadSource('apps/admin/src/auth/supabaseStrategy.ts',{'@supabase/ssr':{createServerClient:()=>supabase},'./staffRoles':roles}).supabaseStrategy;
    const authenticated=await strategy.authenticate({headers:new Headers(),payload});
    assert.equal(Boolean(authenticated.user),role!=='customer');
    const login=loadSource('apps/admin/src/app/api/auth/login/route.ts',{
      'next/server':{NextResponse:{json:(body,options={})=>Response.json(body,options)}},
      '@supabase/ssr':{createServerClient:()=>supabase},'next/headers':{cookies:async()=>({getAll:()=>[],set:()=>{}})},
      '@payload-config':{},payload:{getPayload:async()=>payload},'../../../../auth/staffRoles':roles,
    });
    const campaignRole=['campaign_manager','reviewer','gate_staff'].includes(role);
    const portal=campaignRole?'campaign':'staff';
    const response=await login.POST(new Request('https://admin.example.invalid/api/auth/login',{method:'POST',body:JSON.stringify({email:user.email,password:'synthetic-only',portal})}));
    assert.equal(response.status,role==='customer'?403:200);
    if(campaignRole){
      const staffPortalResponse=await login.POST(new Request('https://admin.example.invalid/api/auth/login',{method:'POST',body:JSON.stringify({email:user.email,password:'synthetic-only',portal:'staff'})}));
      assert.equal(staffPortalResponse.status,403);
    }
  }
});

test('campaign-only accounts cannot use unrelated CMS collections or globals, while existing permissions are preserved', () => {
  const {restrictCampaignCollection,restrictCampaignGlobal}=loadSource('apps/admin/src/auth/staffRoles.ts',{});
  for(const role of ['gate_staff','reviewer','campaign_manager']){
    const user={id:'own-id',roles:[role]};
    const collection=restrictCampaignCollection({slug:'members',access:{read:()=>true,update:()=>true}});
    for(const operation of ['read','readVersions','create','update','delete','unlock'])assert.equal(collection.access[operation]({req:{user}}),false);
    const own=restrictCampaignCollection({slug:'admins'});
    assert.deepEqual(own.access.read({req:{user}}),{id:{equals:'own-id'}});
    const global=restrictCampaignGlobal({access:{read:()=>true,update:()=>true}});
    assert.equal(global.access.read({req:{user}}),false);assert.equal(global.access.readVersions({req:{user}}),false);assert.equal(global.access.update({req:{user}}),false);
    assert.equal(collection.access.read({req:{user:{roles:['store_manager']}}}),true);
  }
});

test('gate action derives scanner identity from the session, sends match selection and supports printed IDs', async () => {
  const calls=[];const token='a'.repeat(64),event='11111111-1111-4111-8111-111111111111';
  const api=loadSource('apps/admin/src/actions/campaignAdminActions.ts',{'../utils/supabaseServerClient':{
    assertStaffRole:async allowed=>{assert.ok(allowed.includes('gate_staff'));return {email:'verified-staff@example.invalid'};},
    getSupabaseAdminClient:()=>({from:()=>query({qr_token:token}),rpc:async(name,args)=>{calls.push([name,args]);return{data:{success:true},error:null};}}),
  }});
  assert.equal((await api.verifyAndCheckInGateScan('NUSC-ID-2026-ABCDEF','Gate 3',event)).success,true);
  assert.deepEqual(calls[0],['verify_and_check_in_campaign_id',{p_qr_token:token,p_gate:'Gate 3',p_event_id:event,p_scanned_by:'verified-staff@example.invalid'}]);
  assert.equal((await api.verifyAndCheckInGateScan(token,'Gate 1','')).success,false);
  assert.equal(calls.length,1);
});

test('reviewers cannot approve or issue IDs, and gate staff cannot review applications', async () => {
  for(const [role,operation]of [['reviewer','approve'],['reviewer','issue'],['gate_staff','review']]){
    const api=loadSource('apps/admin/src/actions/campaignAdminActions.ts',{'../utils/supabaseServerClient':{
      assertStaffRole:async allowed=>{if(!allowed.includes(role))throw new Error('Access denied');return {email:'synthetic'};},
      getSupabaseAdminClient:()=>{throw new Error('Unexpected privileged query');},
    }});
    const work=operation==='approve'?()=>api.updateApplicationStatus('app','approved'):operation==='issue'?()=>api.issueCampaignId('app'):()=>api.getCampaignApplicationDetail('app');
    await assert.rejects(work,/Access denied/);
  }
});

test('campaign source scripts contain no embedded JWTs or database passwords', () => {
  for(const name of ['apply-campaign-migration.mjs','test-phase-1-campaign.mjs','test-phase-2-campaign.mjs','test-phase-6-e2e-campaign.mjs']){
    const source=readFileSync(new URL(`../scripts/${name}`,import.meta.url),'utf8');
    assert.equal(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(source),false);
    assert.equal(/postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/.test(source),false);
  }
});

test('QR endpoint serves only approved active credentials in their validity window and disables caching', async () => {
  const token='a'.repeat(64),now=Date.now();
  const valid={qr_token:token,is_active:true,revoked_at:null,valid_from:new Date(now-3600000).toISOString(),
    valid_until:new Date(now+3600000).toISOString(),application:{application_status:'approved'}};
  for(const change of [{},{is_active:false},{revoked_at:new Date().toISOString()},
    {application:{application_status:'rejected'}},{valid_until:new Date(now-1).toISOString()},{valid_from:new Date(now+3600000).toISOString()}]){
    const rendered=[];
    const api=loadSource('apps/web/src/app/api/campaign/id/[token]/qr/route.ts',{
      '@nusc/db':{createAdminClient:()=>({from:()=>query({...valid,...change})})},
      qrcode:{toString:async value=>{rendered.push(value);return '<svg>synthetic QR</svg>'; }},
    });
    const response=await api.GET(new Request('https://campaign.example.invalid/api/campaign/id/pass/qr'),{params:Promise.resolve({token:'synthetic-pass'})});
    assert.match(response.headers.get('cache-control'),/no-store/);
    assert.equal(rendered.length,Object.keys(change).length===0?1:0);
    if(rendered.length)assert.equal(rendered[0],token);
  }
});

test('camera decoder can read the actual QR library output for a campaign token', () => {
  const token='abc123'.repeat(10)+'abcd';
  const {modules}=QRCode.create(token);const scale=6,margin=4,width=(modules.size+margin*2)*scale;
  const pixels=new Uint8ClampedArray(width*width*4).fill(255);
  for(let row=0;row<modules.size;row++)for(let column=0;column<modules.size;column++){
    if(!modules.get(row,column))continue;
    for(let y=0;y<scale;y++)for(let x=0;x<scale;x++){
      const position=(((row+margin)*scale+y)*width+(column+margin)*scale+x)*4;
      pixels[position]=pixels[position+1]=pixels[position+2]=0;
    }
  }
  assert.equal(jsQR(pixels,width,width,{inversionAttempts:'dontInvert'})?.data,token);
});

test('email callback preserves SDK PKCE flow binding, ignores open redirects and rejects a reused code', async () => {
  const previous=process.env.NEXT_PUBLIC_SITE_URL;process.env.NEXT_PUBLIC_SITE_URL='https://campaign.example.invalid';
  try {
    let used=false;const calls=[];
    const server=loadSource('apps/web/src/app/campaign/server.ts',{'@nusc/db':{createAdminClient:()=>{throw new Error('Unexpected database access');}}});
    const api=loadSource('apps/web/src/app/campaign/auth/callback/route.ts',{
      '@nusc/db':{createServerClient:async()=>({auth:{exchangeCodeForSession:async(code,options)=>{
        calls.push([code,options]);if(used)return{error:{message:'Already consumed'}};used=true;return{error:null};
      }}})},
      '../../server':server,
      'next/server':{NextResponse:{redirect:(destination,options)=>new Response(null,{status:307,headers:{...options.headers,location:destination.toString()}})}},
    });
    const request=new Request(`https://campaign.example.invalid/campaign/auth/callback?code=synthetic-code&sb_flow_id=synthetic-flow&num=${number}&next=https://evil.invalid`);
    const first=await api.GET(request),second=await api.GET(request);
    assert.equal(first.headers.get('location'),`https://campaign.example.invalid/campaign/status?num=${number}`);
    assert.deepEqual(calls[0],['synthetic-code',{flowId:'synthetic-flow'}]);
    assert.match(second.headers.get('location'),/access=expired/);
    assert.equal(first.headers.get('cache-control'),'no-store');
    assert.equal(first.headers.get('location').includes('evil.invalid'),false);
  } finally { if(previous===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=previous; }
});
