import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
export function loadSource(relativePath, mocks) {
  const source = readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop:true, jsx:ts.JsxEmit.ReactJSX,
  } });
  const loaded = { exports:{} };
  new Function('require','module','exports',outputText)(name => name in mocks ? mocks[name]
    : name === '@nusc/db/src/performance' ? loadSource('packages/db/src/performance.ts', {})
    : require(name),loaded,loaded.exports);
  return loaded.exports;
}

export function query(data, calls = [], table = '') {
  const filters = [];
  let listResult = false;
  const result = () => ({ data: listResult ? [] : !data || filters.some(([key,value]) => key in data && data[key] !== value) ? null : data, error:null });
  const chain = {
    select: fields => { calls.push(['select',table,fields]); return chain; },
    eq: (key,value) => { filters.push([key,value]); calls.push(['eq',table,key,value]); return chain; },
    is: () => chain, order: () => chain,
    in: (key,values) => { calls.push(['in',table,key,values]); listResult = true; return chain; },
    update: value => { calls.push(['update',table,value]); return chain; },
    insert: value => { calls.push(['insert',table,value]); return chain; },
    maybeSingle: async () => result(), single: async () => result(),
    then: (resolve,reject) => Promise.resolve(result()).then(resolve,reject),
  };
  return chain;
}

export function publicActions({ user = null, application = null, idempotencyApplication = null, identityClaims = null,
  role = null, pass = null, rateAllowed = true, rateError = null, insertError = null, registrationId = null } = {}) {
  const calls = [];
  const departmentCode = {ahibi:'AHB',volunteer:'VOL',media:'MED',crew:'CRW',management:'MGT',officials:'OFC',medical:'HLT'};
  const admin = {
    rpc: async (name, args) => {
      calls.push(['rpc',name,args]);
      const allocatedId = registrationId ?? `NUSC-${departmentCode[args?.p_department] || 'MGT'}-123`;
      return { data:name === 'next_workforce_registration_id' ? allocatedId : rateAllowed,error:rateError };
    },
    from: table => {
      const row = table === 'campaign_applications' ? idempotencyApplication ?? application
        : table === 'campaign_roles' ? role
          : table === 'workforce_registration_identity_claims' ? Array.isArray(identityClaims) ? identityClaims[0] ?? null : identityClaims
            : pass;
      const chain = query(row, calls, table);
      if (insertError && table === 'campaign_applications') chain.insert = value => { calls.push(['insert',table,value]); return Promise.resolve({error:insertError}); };
      return chain;
    },
    storage: { from: bucket => ({
      upload: async (path,bytes,options) => { calls.push(['upload',bucket,path,options]); return {error:null}; },
      remove: async paths => { calls.push(['remove',bucket,paths]); return {error:null}; },
      createSignedUrl: async () => ({data:{signedUrl:'https://photo.invalid/signed'}}),
      createSignedUploadUrl: async path => ({data:{path,token:'synthetic-upload-token'},error:null}),
    }) },
  };
  const db = { createAdminClient:()=>admin,createServerClient:async()=>({auth:{
    getUser:async()=>({data:{user},error:null}),
    signInWithOtp:async input=>{ calls.push(['email',input]); return {error:null}; },
  }}) };
  const server = loadSource('apps/web/src/app/campaign/server.ts', {'@nusc/db':db});
  const api = loadSource('apps/web/src/app/campaign/actions.ts', {
    '@nusc/db':db,
    './server':server,
    'next/headers':{headers:async()=>new Headers({'x-forwarded-for':'192.0.2.10'})},
  });
  return { api,calls,admin };
}

export const submittedForm = (overrides = {}) => {
  const data = new FormData();
  for (const [key,value] of Object.entries({
    idempotencyKey:'11111111-1111-4111-8111-111111111111',
    fullName:'Synthetic Candidate',phone:'9000000000',email:'candidate@example.invalid',
    category:'crew',preferredRoleId:'11111111-1111-4111-8111-111111111112',otherRole:'Camera operator',
    availabilityMode:'all',crewWorkArrangement:'independent',termsAccepted:'true',...overrides,
  })) data.set(key,value);
  data.set('photo',new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'synthetic.png',{type:'image/png'}));
  return data;
};
