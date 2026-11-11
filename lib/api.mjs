import W from './domain/workflow.mjs';
import Q from './domain/quality.mjs';
const blank=()=>({version:4,users:{},jobs:[],applications:[],reviews:[],reports:[],likes:[],submissionEvents:[]});
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'}});
const parsed=rows=>rows.map(r=>JSON.parse(r.data));
const rows=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const emptyProfile=id=>({id,name:'',bio:'',experience:'',skills:[],cv:''});
const profilePublic=p=>({id:p.id,name:p.name,bio:p.bio,experience:p.experience,skills:p.skills||[],cv:p.cv||'',hasCV:!!p.cvKey});
const cleanJob=j=>Object.fromEntries(['id','ownerId','title','desc','trade','category','zone','duration','time','pay','unit','publisher','urgent','status','createdAt','updatedAt','selectedApplicationId'].filter(k=>j[k]!==undefined).map(k=>[k,j[k]]));
const inValues=ids=>ids.map(()=>'?').join(',');
async function byIds(db,ids,query){let all=[];for(let i=0;i<ids.length;i+=80){const group=ids.slice(i,i+80);all.push(...await rows(db,query(inValues(group)),...group))}return all;}
const pickRecord=(kind,x)=>({kind,id:kind==='likes'?x.jobId+':'+x.userId:kind==='submissionEvents'?x.id||x.actorId+':'+x.jobId+':'+x.at:x.id,owner:x.ownerId||x.authorId||x.userId||x.actorId||(kind==='users'?x.id:null),job:x.jobId||null,applicant:x.applicantId||(kind==='reviews'?x.targetId:null),status:x.status||null,at:x.createdAt||x.at||null,search:kind==='jobs'?Q.norm([x.title,x.trade,x.desc,x.category].join(' ')):null,data:JSON.stringify(x)});
async function readLimited(request,maximum){
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();let chunks=[],size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();const error=new Error('El archivo o la solicitud excede el tamaño permitido.');error.status=413;throw error}chunks.push(value)}
 const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}return result;
}
async function getUser(db,id){const r=await rows(db,"SELECT data FROM records WHERE kind='users' AND id=?",id);return r[0]?JSON.parse(r[0].data):emptyProfile(id)}
async function feed(db,actor,url){
 const s=blank();s.activeUserId=actor||null;
 const requested=url.searchParams.get('job');let cursor={at:'9999',id:'~'};
 if(url.searchParams.get('before')){cursor=JSON.parse(url.searchParams.get('before'));if(typeof cursor.at!=='string'||typeof cursor.id!=='string')throw new Error('El cursor no es válido.')}
 const conditions=["kind='jobs'","status='open'",'(at<? OR (at=? AND id<?))'];const filters=[cursor.at,cursor.at,cursor.id];
 for(const [key,field] of [['category',"json_extract(data,'$.category')"],['zone',"json_extract(data,'$.zone')"],['duration',"json_extract(data,'$.duration')"]]){const value=url.searchParams.get(key);if(value&&value!=='Todos'){conditions.push(field+'=?');filters.push(value.slice(0,100))}}
 const query=Q.norm(url.searchParams.get('q')||'').slice(0,150);if(query){conditions.push("instr(search,?)>0");filters.push(query)}
 // Limit only the public feed; owned records and the user's history remain accessible.
 const queries=[db.prepare('SELECT data FROM records WHERE '+conditions.join(' AND ')+' ORDER BY at DESC,id DESC LIMIT 51').bind(...filters)];
 if(actor){queries.push(db.prepare("SELECT data FROM records WHERE kind='applications' AND (applicant=? OR job IN (SELECT id FROM records WHERE kind='jobs' AND owner=?))").bind(actor,actor));queries.push(db.prepare("SELECT data FROM records WHERE kind='jobs' AND (owner=? OR id IN (SELECT job FROM records WHERE kind='applications' AND applicant=?))").bind(actor,actor));}
 if(requested)queries.push(db.prepare("SELECT data FROM records WHERE kind='jobs' AND id=?").bind(requested));
 const result=await db.batch(queries);let publicJobs=parsed(result[0].results);s.hasMore=publicJobs.length>50;publicJobs=publicJobs.slice(0,50);s.nextCursor=s.hasMore?JSON.stringify({at:publicJobs.at(-1).createdAt,id:publicJobs.at(-1).id}):null;
 let jobs=[...publicJobs];if(actor){s.applications=parsed(result[1].results);jobs.push(...parsed(result[2].results));}if(requested)jobs.push(...parsed(result.at(-1).results));jobs=[...new Map(jobs.map(j=>[j.id,j])).values()];
 s.jobs=jobs.map(j=>({...cleanJob(j),...(actor&&(j.ownerId===actor||W.canContact(j,s.applications.find(a=>a.jobId===j.id&&a.applicantId===actor),actor))?{phone:j.phone||''}:{}),custom:true}));
 const ids=jobs.map(j=>j.id);if(ids.length){
  const counts=await byIds(db,ids,slots=>`SELECT job,COUNT(*) AS count FROM records WHERE kind='likes' AND job IN (${slots}) GROUP BY job`);s.jobs.forEach(j=>j.likeCount=Number(counts.find(x=>x.job===j.id)?.count||0));
  const candidates=await byIds(db,ids,slots=>`SELECT job,COUNT(*) AS count FROM records WHERE kind='applications' AND status IN ('submitted','proposed') AND job IN (${slots}) GROUP BY job`);s.jobs.forEach(j=>j.candidateCount=Number(candidates.find(x=>x.job===j.id)?.count||0));
 }
 if(actor){
  const people=[...new Set([actor,...jobs.map(j=>j.ownerId),...s.applications.map(a=>a.applicantId)])];
  const profiles=parsed(await byIds(db,people,slots=>`SELECT data FROM records WHERE kind='users' AND id IN (${slots})`));profiles.forEach(p=>s.users[p.id]=profilePublic(p));s.users[actor]??=emptyProfile(actor);
  const extra=await db.batch([
   db.prepare("SELECT data FROM records WHERE kind='likes' AND owner=?").bind(actor),
   db.prepare("SELECT data FROM records WHERE kind='reports' AND owner=?").bind(actor),
   db.prepare("SELECT data FROM records WHERE kind='reviews' AND (owner=? OR applicant=?)").bind(actor,actor),
   db.prepare("SELECT data FROM records WHERE kind='submissionEvents' AND owner=? AND at>?").bind(actor,new Date(Date.now()-86400000).toISOString())]);
  [s.likes,s.reports,s.reviews,s.submissionEvents]=extra.map(x=>parsed(x.results));
 }
 return s;
}
async function context(db,actor,action){
 // One snapshot prevents a candidate cap or agreement from being based on mixed revisions.
 const res=await db.batch([
 db.prepare("SELECT revision FROM revisions WHERE id='domain'"),
 db.prepare("SELECT data FROM records WHERE kind='users' AND id=?").bind(actor),
 db.prepare("SELECT data FROM records WHERE kind='jobs' AND (owner=? OR id=? OR id IN (SELECT job FROM records WHERE kind='applications' AND id=?))").bind(actor,action.jobId||'',action.applicationId||''),
 db.prepare("SELECT data FROM records WHERE kind='applications' AND (applicant=? OR job=? OR job IN (SELECT job FROM records WHERE kind='applications' AND id=?))").bind(actor,action.jobId||'',action.applicationId||''),
 db.prepare("SELECT data FROM records WHERE kind IN ('likes','reports','reviews','submissionEvents') AND (owner=? OR applicant=?)").bind(actor,actor)]);
 const s=blank();s.users[actor]=res[1].results[0]?JSON.parse(res[1].results[0].data):emptyProfile(actor);s.jobs=parsed(res[2].results);s.applications=parsed(res[3].results);
 for(const x of res[4].results){const p=JSON.parse(x.data);if(p.actorId)s.submissionEvents.push(p);else if(p.reason)s.reports.push(p);else if(p.score)s.reviews.push(p);else s.likes.push(p)}
 return {state:s,revision:res[0].results[0]?.revision??0};
}
function validateAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||typeof a.type!=='string')throw new Error('La acción no es válida.');
 if(a.type==='publish'){
 const j=a.job||{},fields=['title','desc','trade','category','zone','duration','time','pay','unit','publisher','phone','urgent'];a.job=Object.fromEntries(fields.filter(k=>j[k]!==undefined).map(k=>[k,j[k]]));
 const x=a.job; if(typeof x.title!=='string'||x.title.length>100||typeof x.desc!=='string'||x.desc.length>2800||!Q.categories.includes(x.category)||!['hours','day','task'].includes(x.duration)||typeof x.zone!=='string'||x.zone.length>80||typeof x.time!=='string'||x.time.length>150||typeof x.publisher!=='string'||x.publisher.length>90||typeof x.unit!=='string'||x.unit.length>60||typeof x.trade!=='string'||x.trade.length>100||typeof (x.phone||'')!=='string'||!/^\d{0,18}$/.test(x.phone||'')||(x.pay!==null&&(!Number.isFinite(x.pay)||x.pay<=0||x.pay>999999999)))throw new Error('Revisá los datos y el importe de la changa.');
 }
}
async function mutate(db,actor,action,cvUpload=null){
 validateAction(action);
 // The constant revision row is initialized on the first actual write, never on anonymous reads.
 await db.prepare("INSERT OR IGNORE INTO revisions (id,revision,token) VALUES ('domain',0,'')").run();
 for(let attempt=0;attempt<5;attempt++){
 const {state,revision}=await context(db,actor,action);
 if(action.type==='profile')action.cv=state.users[actor].cv||''; // CV names refer only to a real authenticated upload.
 let next;if(cvUpload){next=structuredClone(state);next.users[actor]={...state.users[actor],cv:cvUpload.name,cvKey:cvUpload.key}}else next=W.reduce(state,actor,action);const token=crypto.randomUUID();
 const changes=[db.prepare("UPDATE revisions SET revision=revision+1,token=? WHERE id='domain' AND revision=?").bind(token,revision)];
 // Every write is conditional on the same CAS token and runs in a single atomic D1 batch.
 for(const kind of ['users','jobs','applications','reviews','reports','likes','submissionEvents']){
 const before=kind==='users'?Object.values(state.users):state[kind];const after=kind==='users'?Object.values(next.users):next[kind];
 const old=new Map(before.map(x=>{const r=pickRecord(kind,x);return [r.id,r.data]}));const fresh=new Set();
 for(const x of after){const r=pickRecord(kind,x);fresh.add(r.id);if(old.get(r.id)===r.data)continue;
 changes.push(db.prepare("INSERT INTO records(kind,id,owner,job,applicant,status,at,search,data) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM revisions WHERE id='domain' AND token=?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner,job=excluded.job,applicant=excluded.applicant,status=excluded.status,at=excluded.at,search=excluded.search,data=excluded.data").bind(r.kind,r.id,r.owner,r.job,r.applicant,r.status,r.at,r.search,r.data,token));}
 for(const id of old.keys())if(!fresh.has(id))changes.push(db.prepare("DELETE FROM records WHERE kind=? AND id=? AND EXISTS(SELECT 1 FROM revisions WHERE id='domain' AND token=?)").bind(kind,id,token));
 }
 const result=await db.batch(changes);if(result[0].meta.changes===1)return next;
 }
 throw new Error('Hubo otra actualización al mismo tiempo. Volvé a intentarlo.');
}
export async function handleApi(request,env,identity){
 const url=new URL(request.url),path=url.pathname,actor=identity?.userId||null;
 if(!env.DB)return json({error:'El servicio está temporalmente fuera de línea. Intentá nuevamente en unos minutos.'},503);
 if(request.method==='POST'){
  if(!actor)return json({error:'Iniciá sesión para continuar.',code:'AUTH_REQUIRED'},401);
  if(request.headers.get('Origin')!==url.origin)return json({error:'La solicitud debe salir de LABURAPP.'},403);
  if(request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'La solicitud debe salir de LABURAPP.'},403);
 }
 if(path!=='/api/state'&&!actor)return json({error:'Iniciá sesión para continuar.',code:'AUTH_REQUIRED'},401);
 try{
 if(request.method==='GET'&&path==='/api/state')return json(await feed(env.DB,actor,url));
 if(request.method==='POST'&&path==='/api/actions'){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Formato de solicitud inválido.'},415);
  const raw=new TextDecoder().decode(await readLimited(request,18000));if(raw.length>18000)return json({error:'La solicitud es demasiado grande.'},413);
  const action=JSON.parse(raw);await mutate(env.DB,actor,action);const current=await feed(env.DB,actor,new URL('/api/state',url));return json(current);
 }
 const match=path.match(/^\/api\/profiles\/([^/]+)$/);
 if(request.method==='GET'&&match){
 const id=decodeURIComponent(match[1]);const p=await getUser(env.DB,id);if(!p.name&&id!==actor)return json({error:'Este perfil todavía no está disponible.'},404);
 const reviews=parsed(await rows(env.DB,"SELECT data FROM records WHERE kind='reviews' AND applicant=? ORDER BY at DESC LIMIT 50",id));
 const authors=[...new Set(reviews.map(r=>r.authorId))];let users={};if(authors.length)parsed(await rows(env.DB,`SELECT data FROM records WHERE kind='users' AND id IN (${inValues(authors)})`,...authors)).forEach(p=>users[p.id]={id:p.id,name:p.name});return json({profile:profilePublic(p),reviews,users});
 }
 if(path==='/api/cv'&&request.method==='POST'){
  if(!env.BUCKET)return json({error:'La carga de CV está temporalmente fuera de servicio.'},503);
  const length=Number(request.headers.get('Content-Length'));if(length>5*1024*1024)return json({error:'El CV debe pesar hasta 5 MB.'},413);
  const bytes=await readLimited(request,5*1024*1024);if(bytes.byteLength>5*1024*1024||bytes.byteLength<5||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({error:'Elegí un archivo PDF de hasta 5 MB.'},400);
  const name=decodeURIComponent(request.headers.get('X-Filename')||'CV.pdf').replace(/[\x00-\x1f"/\\]/g,'').slice(0,150);if(!name.toLowerCase().endsWith('.pdf'))return json({error:'Elegí un archivo PDF.'},400);
  const key='cv/'+encodeURIComponent(actor)+'/'+crypto.randomUUID()+'.pdf';await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});
  // Keep ownership server-side; a client can never attach another user's object key.
  const previous=await getUser(env.DB,actor);try{await mutate(env.DB,actor,{type:'profile'},{name,key})}catch(e){await env.BUCKET.delete(key);throw e}
  if(previous.cvKey)await env.BUCKET.delete(previous.cvKey);return json({cv:name});
 }
 const cv=path.match(/^\/api\/cv\/([^/]+)$/);
 if(request.method==='GET'&&cv){const p=await getUser(env.DB,decodeURIComponent(cv[1]));if(!p.cvKey)return json({error:'Este perfil no tiene CV.'},404);const file=await env.BUCKET?.get(p.cvKey);if(!file)return json({error:'El CV no está disponible.'},404);return new Response(file.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(p.cv),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
 return json({error:'No se encontró esta página.'},404);
 }catch(e){if(e instanceof SyntaxError)return json({error:'La solicitud no es válida.'},400);if(e?.message?.includes('D1_')||e?.message?.includes('SQLITE_')){console.error('LABURAPP database failure');return json({error:'No pudimos guardar el cambio. Intentá nuevamente.'},503)}return json({error:e.message||'No pudimos completar la acción.'},e.status===413?413:400)}
}
export {blank,cleanJob,profilePublic,context,mutate,feed,pickRecord};
