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
  const result = () => ({ data: !data || filters.some(([key,value]) => key in data && data[key] !== value) ? null : data, error:null });
  const chain = {
    select: fields => { calls.push(['select',table,fields]); return chain; },
    eq: (key,value) => { filters.push([key,value]); calls.push(['eq',table,key,value]); return chain; },
    is: () => chain, order: () => chain,
    update: value => { calls.push(['update',table,value]); return chain; },
    insert: value => { calls.push(['insert',table,value]); return chain; },
    maybeSingle: async () => result(), single: async () => result(),
    then: (resolve,reject) => Promise.resolve(result()).then(resolve,reject),
  };
  return chain;
}

export function publicActions({ user = null, application = null, role = null, pass = null, rateAllowed = true, rateError = null, insertError = null } = {}) {
  const calls = [];
  const admin = {
    rpc: async (name, args) => { calls.push(['rpc',name,args]); return { data:rateAllowed,error:rateError }; },
    from: table => {
      const chain = query(table === 'campaign_applications' ? application : table === 'campaign_roles' ? role : pass, calls, table);
      if (insertError && table === 'campaign_applications') chain.insert = value => { calls.push(['insert',table,value]); return Promise.resolve({error:insertError}); };
      return chain;
    },
    storage: { from: bucket => ({
      upload: async (path,bytes,options) => { calls.push(['upload',bucket,path,options]); return {error:null}; },
      remove: async paths => { calls.push(['remove',bucket,paths]); return {error:null}; },
      createSignedUrl: async () => ({data:{signedUrl:'https://photo.invalid/signed'}}),
    }) },
  };
  const db = { createAdminClient:()=>admin,createServerClient:async()=>({auth:{
    getUser:async()=>({data:{user},error:null}),
    signInWithOtp:async input=>{ calls.push(['email',input]); return {error:null}; },
  }}) };
  const server = loadSource('apps/web/src/app/campaign/server.ts', {'@nusc/db':db});
  const api = loadSource('apps/web/src/app/campaign/actions.ts', {'@nusc/db':db,'./server':server});
  return { api,calls,admin };
}

export const submittedForm = (overrides = {}) => {
  const data = new FormData();
  for (const [key,value] of Object.entries({
    fullName:'Synthetic Candidate',dateOfBirth:'2000-01-01',gender:'Female',phone:'9000000000',
    email:'candidate@example.invalid',address:'Synthetic address',category:'crew',preferredRoleId:'synthetic-role',
    otherRole:'Camera operator',availability:'Matchdays',emergencyContactName:'Synthetic Contact',emergencyContactPhone:'9000000001',
    termsAccepted:'true',application_status:'approved',assigned_role_id:'attacker-role',event_id:'attacker-match',...overrides,
  })) data.set(key,value);
  data.set('photo',new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'synthetic.png',{type:'image/png'}));
  return data;
};
