import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import QRCode from 'qrcode';

let bundle: Promise<string> | undefined;
async function browserBundle() {
  bundle ??= build({
    stdin: { loader:'tsx',resolveDir:process.cwd(),contents:`
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import Status from './apps/web/src/app/campaign/status/StatusLookupClient';
      import Form from './apps/web/src/app/campaign/register/CampaignForm';
      import Pass from './apps/web/src/app/campaign/id/[token]/PassCardView';
      import Success from './apps/web/src/app/campaign/application-success/ApplicationSuccessClient';
      import {CampaignApplicationDetailView as Detail} from './apps/admin/src/components/views/campaign/CampaignApplicationDetailView';
      import {CampaignApplicationsView as Applications} from './apps/admin/src/components/views/campaign/CampaignApplicationsView';
      import {CampaignScannerView as Scanner} from './apps/admin/src/components/views/campaign/CampaignScannerView';
      import {CampaignMatchesView as Matches} from './apps/admin/src/components/views/campaign/CampaignMatchesView';
      import {CampaignAttendanceView as Attendance} from './apps/admin/src/components/views/campaign/CampaignAttendanceView';
      const root=createRoot(document.getElementById('root'));
      window.mountFixture=(screen,options={})=>{
        window.fixture={calls:[],roles:options.roles||[],staffRole:options.staffRole||'campaign_manager',
          matches:[{id:'match-one',title:'NUSC vs Team A',venue:'Stadium',start_date:new Date(Date.now()-3600000).toISOString(),end_date:new Date(Date.now()+86400000).toISOString(),is_active:true},
            {id:'match-two',title:'NUSC vs Team B',venue:'Stadium',start_date:new Date(Date.now()-3600000).toISOString(),end_date:new Date(Date.now()+86400000).toISOString(),is_active:true}],
          app:{id:'app',application_number:'NUSC-CMP-2026-ABCDEF0123456789',full_name:'Synthetic Candidate',category:'crew',
            preferred_role_id:'crew_others',assigned_role_id:'crew_others',preferred_role:{name:'Others',code:'crew_others'},
            other_role:'Camera operator',application_status:'submitted',email:'candidate@example.invalid',phone:'9000000000',
            gender:'Female',date_of_birth:'2000-01-01',availability:'Matchdays',address:'Synthetic address',
            emergency_contact_name:'Synthetic Contact',emergency_contact_phone:'9000000001',submitted_at:new Date().toISOString()},
          ...options};
        window.print=()=>window.fixture.calls.push(['print']);
        root.render(<React.Fragment key={screen+Math.random()}>{screen==='status'?<Status verifiedEmail={options.verifiedEmail||null}/>:
          screen==='success'?<Success/>:screen==='pass'?<Pass pass={{idNumber:'NUSC-ID-2026-ABCDEF0123456789',passSlug:'fixture-pass',fullName:'Synthetic Candidate',category:'crew',assignedRole:'Others: Camera operator',assignedZone:'Zone 1',assignedShift:'Evening',validFrom:'2026-01-01',validUntil:'2099-01-01',signedPhotoUrl:null,issuedAt:'2026-01-01',eventVenue:'Synthetic stadium'}}/>:
          screen==='registration'?<Form fixedCategory={options.category||'ahibi'}/>:screen==='applications'?<Applications/>:
          screen==='detail'?<Detail applicationId="app"/>:screen==='matches'?<Matches/>:screen==='attendance'?<Attendance/>:<Scanner/>}</React.Fragment>);
      };
    ` },
    bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',loader:{'.css':'empty'},
    define:{'process.env.NODE_ENV':'"test"','process.env.NEXT_PUBLIC_SITE_URL':'"https://campaign.example.invalid"'},
    plugins:[{name:'isolated-campaign-ui',setup(builder){
      builder.onResolve({filter:/^(next\/(navigation|link)|@payloadcms\/ui)$/},args=>({path:args.path,namespace:'fixture'}));
      builder.onResolve({filter:/(campaignAdminActions|^\.\.\/actions)$/},args=>({path:args.path.includes('campaignAdminActions')?'admin':'public',namespace:'fixture'}));
      builder.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'tsx',resolveDir:process.cwd(),contents:
        path==='next/link'?`import React from 'react';export default props=><a {...props}/>;`:
        path==='next/navigation'?`export const useSearchParams=()=>new URLSearchParams(window.fixture.search||'');export const usePathname=()=>window.location.pathname;export const useRouter=()=>({push:path=>window.fixture.calls.push(['navigate',path])});`:
        path==='@payloadcms/ui'?`export const useAuth=()=>({user:{roles:[window.fixture.staffRole]}});`:
        path==='public'?`
          export async function getCampaignRoles(category){return window.fixture.roles.filter(role=>role.category===category)}
          export async function submitCampaignApplication(form){window.fixture.calls.push(['submit',Object.fromEntries(form)]);return {success:true,applicationNumber:'NUSC-CMP-2026-ABCDEF0123456789'}}
          export async function requestCampaignAccess(number,email){window.fixture.calls.push(['email',number,email]);return {success:true,message:'If these details match an application, a sign-in link will arrive in the registered email.'}}
          export async function checkCampaignStatus(number){window.fixture.calls.push(['status',number]);return {success:true,data:{applicationNumber:number,fullName:'Synthetic Candidate',category:'crew',preferredRoleName:'Others: Camera operator',assignedRoleName:'Others: Camera operator',status:'approved',submittedAt:new Date().toISOString(),passSlug:'fixture-pass'}}}
        `:`
          export async function getCampaignMatches(){return window.fixture.matches}
          export async function getCampaignRoleOptions(category){return window.fixture.roles.filter(role=>role.category===category)}
          export async function getCampaignApplicationDetail(){return {...window.fixture.app,roleOptions:window.fixture.roles.filter(role=>role.category===window.fixture.app.category),matches:window.fixture.matches}}
          export async function getCampaignApplicationsList(filters){window.fixture.calls.push(['applications',filters]);return {applications:[window.fixture.app],totalCount:1,totalPages:1}}
          export async function updateApplicationStatus(id,status,notes){window.fixture.calls.push(['review',id,status,notes]);window.fixture.app={...window.fixture.app,application_status:status,...(status==='approved'?{issuedId:{id:'credential',id_number:'NUSC-ID-2026-ABCDEF',pass_slug:'pass',is_active:true,valid_until:'2099-01-01'}}:{})};return {success:true}}
          export async function issueCampaignId(...args){window.fixture.calls.push(['issue',...args]);return {success:true,idNumber:'NUSC-ID-2026-ABCDEF'}}
          export async function emailCampaignPass(...args){window.fixture.calls.push(['email-pass',...args]);return {success:true}}
          export async function assignRoleZoneShift(...args){window.fixture.calls.push(['assign',...args]);return {success:true}}
          export async function saveCampaignMatch(input){window.fixture.calls.push(['match',input]);return {success:true}}
          export async function getCampaignAttendanceHistory(...args){window.fixture.calls.push(['attendance',...args]);return {logs:[{id:'log',action:'check_in',event:{title:'NUSC vs Team A'},gate:'Gate 3',scanned_at:new Date().toISOString(),application:{full_name:'Synthetic Candidate',category:'crew',assigned_role:{name:'Others',code:'crew_others'},other_role:'Camera operator'},campaign_id_record:{id_number:'NUSC-ID-2026-ABCDEF'}}],totalCount:1,totalPages:1}}
          export async function verifyAndCheckInGateScan(...args){window.fixture.calls.push(['scan',...args]);return {success:true,code:'CHECK_IN_SUCCESS',message:'Attendance recorded',match_title:window.fixture.matches.find(match=>match.id===args[2]).title,candidate:{full_name:'Synthetic Candidate',id_number:'NUSC-ID-2026-ABCDEF',assigned_role:'Others: Camera operator'}}}
        `}));
    }}],
  }).then(result=>result.outputFiles[0].text);
  return bundle;
}

export async function campaignFixtureHtml() {
  const [js,css,original,hardening]=await Promise.all([
    browserBundle(),readFile('apps/web/src/app/campaign/campaign.css','utf8'),
    readFile('supabase/migrations/20261027100000_create_campaign_tables.sql','utf8'),
    readFile('supabase/migrations/20261027110000_campaign_workflow_hardening.sql','utf8'),
  ]);
  const roles=[...`${original}\n${hardening}`.matchAll(/\('(ahibi|volunteer|crew)', '([^']+)', '([^']+)', '/g)]
    .map(([,category,name,code])=>({category,name,code,id:code}));
  const qrSvg=await QRCode.toString('a'.repeat(64),{type:'svg'});
  return {html:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0;font-family:system-ui}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{cursor:default}</style></head><body><div id="root"></div><script>${js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`,roles,qrSvg};
}
