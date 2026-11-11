import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleApi,mutate,feed,pickRecord} from '../lib/api.mjs';
function database(){
 const sql=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const db={prepare(text){return {args:[],bind(...args){this.args=args;return this},async all(){return {results:sql.prepare(text).all(...this.args)}},async run(){return {meta:{changes:Number(sql.prepare(text).run(...this.args).changes)}}},text}},async batch(statements){sql.exec('BEGIN');try{let results=[];for(const p of statements){const stmt=sql.prepare(p.text);if(/^\s*SELECT/.test(p.text))results.push({results:stmt.all(...p.args),meta:{changes:0}});else results.push({results:[],meta:{changes:Number(stmt.run(...p.args).changes)}})}sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};return {db,sql};
}
const url=new URL('https://laburapp.test/api/state');
const job={title:'Pintar una pared interior',desc:'Necesito pintar una pared interior de mi casa. Yo pongo los materiales.',trade:'Pintor',category:'Construcción y oficios',zone:'Centro',duration:'task',time:'Viernes de 9 a 13',pay:30000,unit:'por tarea',publisher:'Particular · Ana',phone:'5492915551234'};
const applicant={type:'profile',name:'Luis',bio:'Preparo superficies y pinto interiores con prolijidad y limpieza.',skills:['Construcción y oficios']};
const application=jobId=>({type:'apply',jobId,message:'Primero limpiaría y lijaría la superficie para después aplicar la base y dos manos de pintura.',availability:'El viernes de 9 a 13',readConditions:true});
const req=(path,body,headers={})=>new Request('https://laburapp.test'+path,body===undefined?{headers}:{method:'POST',headers:{Origin:'https://laburapp.test','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
async function setup(){const {db,sql}=database();await mutate(db,'owner',{type:'publish',job:{...job,ownerId:'attacker',sample:true}});const j=(await feed(db,'owner',url)).jobs[0];return {db,sql,j};}
test('anonymous visitors can read listings and detail, with no profile, email, phone, or conversation data',async()=>{
 const {db,j}=await setup();const response=await handleApi(req('/api/state?job='+j.id),{DB:db},null);assert.equal(response.status,200);const s=await response.json();assert.equal(s.jobs[0].title,job.title);assert.equal(s.jobs[0].ownerId,'owner');assert.equal(s.jobs[0].phone,undefined);assert.deepEqual(s.users,{});assert.deepEqual(s.applications,[]);assert.deepEqual(s.reports,[]);assert.equal(s.activeUserId,null);assert.equal(JSON.stringify(s).includes('549291'),false);
});
test('every write and protected profile/CV endpoint rejects anonymous requests',async()=>{
 const {db}=await setup();for(const action of ['profile','publish','apply','like','report','message','accept','complete'])assert.equal((await handleApi(req('/api/actions',{type:action}),{DB:db},null)).status,401);
 for(const path of ['/api/profiles/owner','/api/cv/owner'])assert.equal((await handleApi(req(path),{DB:db},null)).status,401);
});
test('cross-origin posts and forged client actor IDs cannot grant ownership',async()=>{
 const {db,j}=await setup();let r=await handleApi(req('/api/actions',{type:'pause',jobId:j.id,actorId:'owner'}),{DB:db},{userId:'intruder'});assert.equal(r.status,400);assert.match((await r.json()).error,/Solo quien publica/);
 r=await handleApi(req('/api/actions',{type:'like',jobId:j.id},{Origin:'https://attacker.test'}),{DB:db},{userId:'intruder'});assert.equal(r.status,403);
});
test('shared accounts preserve ownership, private messages, and shortlist-only WhatsApp',async()=>{
 const {db,j}=await setup();await mutate(db,'worker',applicant);await mutate(db,'worker',application(j.id));
 let worker=await feed(db,'worker',url),owner=await feed(db,'owner',url),stranger=await feed(db,'stranger',url);const a=worker.applications[0];assert.equal(owner.applications[0].id,a.id);assert.equal(stranger.applications.length,0);assert.equal(worker.jobs[0].phone,undefined);
 await mutate(db,'worker',{type:'message',applicationId:a.id,message:'Nos vemos el viernes.'});assert.equal((await feed(db,'owner',url)).applications[0].messages[0].text,'Nos vemos el viernes.');
 await assert.rejects(mutate(db,'stranger',{type:'message',applicationId:a.id,message:'Intrusión'}),/otras personas/);
 await mutate(db,'owner',{type:'shortlist',applicationId:a.id,value:true});assert.equal((await feed(db,'worker',url)).jobs[0].phone,job.phone);assert.equal((await feed(db,'stranger',url)).jobs[0].phone,undefined);
 const profile=await handleApi(req('/api/profiles/owner'),{DB:db},{userId:'worker',email:'private@example.com'});assert.equal(profile.status,200);assert.equal(JSON.stringify(await profile.json()).includes('private@example.com'),false);
});
test('agreement and review require both distinct authenticated accounts',async()=>{
 const {db,j}=await setup();await mutate(db,'worker',applicant);await mutate(db,'worker',application(j.id));let a=(await feed(db,'worker',url)).applications[0];
 await mutate(db,'owner',{type:'propose',applicationId:a.id,terms:{task:'Pintar pared',when:'Viernes 9 a 13',pay:30000,unit:'total'}});
 await assert.rejects(mutate(db,'owner',{type:'accept',applicationId:a.id}),/Solo el postulante/);
 await mutate(db,'worker',{type:'accept',applicationId:a.id});await mutate(db,'owner',{type:'complete',applicationId:a.id});await mutate(db,'worker',{type:'complete',applicationId:a.id});
 await mutate(db,'owner',{type:'review',applicationId:a.id,score:5,comment:'Trabajó prolijo y en horario.'});const r=await handleApi(req('/api/profiles/worker'),{DB:db},{userId:'owner'});const p=await r.json();assert.equal(p.reviews[0].score,5);
});
test('concurrent applications cannot exceed the ten-candidate cap',async()=>{
 const {db,j}=await setup();for(let i=0;i<11;i++)await mutate(db,'w'+i,{...applicant,name:'Persona '+i});
 for(let i=0;i<9;i++)await mutate(db,'w'+i,application(j.id));
 const results=await Promise.allSettled([mutate(db,'w9',application(j.id)),mutate(db,'w10',application(j.id))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await feed(db,'owner',url)).applications.length,10);
});
test('reports are shared and private; likes are counted without exposing other user IDs',async()=>{
 const {db,j}=await setup();await mutate(db,'worker',{type:'like',jobId:j.id});await mutate(db,'worker',{type:'report',jobId:j.id,reason:'misleading',comment:'La tarea está descripta de manera confusa.'});
 let anon=await feed(db,null,url);assert.equal(anon.jobs[0].likeCount,1);assert.equal(anon.likes.length,0);assert.equal(anon.reports.length,0);assert.equal((await feed(db,'owner',url)).reports.length,0);assert.equal((await feed(db,'worker',url)).reports[0].status,'pending');
});
test('invalid uploads are rejected and protected PDFs persist under server-owned keys',async()=>{
 const {db}=await setup();const objects=new Map();const BUCKET={async put(k,b){objects.set(k,b)},async delete(k){objects.delete(k)},async get(k){return objects.has(k)?{body:objects.get(k)}:null}};
 const upload=(body,name='Luis.pdf')=>new Request('https://laburapp.test/api/cv',{method:'POST',headers:{Origin:'https://laburapp.test','Content-Type':'application/pdf','X-Filename':encodeURIComponent(name)},body});
 assert.equal((await handleApi(upload('not a pdf'),{DB:db,BUCKET},{userId:'worker'})).status,400);
 await mutate(db,'worker',applicant);assert.equal((await handleApi(upload('%PDF-1.7\nSample test PDF'),{DB:db,BUCKET},{userId:'worker'})).status,200);
 const profile=await (await handleApi(req('/api/profiles/worker'),{DB:db,BUCKET},{userId:'owner'})).json();assert.equal(profile.profile.hasCV,true);assert.equal(profile.profile.cvKey,undefined);
 const download=await handleApi(req('/api/cv/worker'),{DB:db,BUCKET},{userId:'owner'});assert.equal(download.status,200);assert.match(download.headers.get('Content-Disposition'),/attachment/);
 await mutate(db,'worker',{...applicant,cv:'fake.pdf',cvKey:'another-user-key'});assert.equal((await (await handleApi(req('/api/profiles/worker'),{DB:db,BUCKET},{userId:'owner'})).json()).profile.cv,'Luis.pdf');
});

test('pagination preserves identical timestamps and search covers later pages',async()=>{
 const {db,sql}=database();for(let i=0;i<65;i++){const j={...job,id:'job-'+String(i).padStart(3,'0'),ownerId:'owner',status:'open',createdAt:'2026-11-11T15:00:00.000Z',title:i===0?'Necesito cortar césped':job.title};const r=pickRecord('jobs',j);sql.prepare('INSERT INTO records(kind,id,owner,status,at,search,data) VALUES (?,?,?,?,?,?,?)').run(r.kind,r.id,r.owner,r.status,r.at,r.search,r.data)}
 const first=await feed(db,null,url);assert.equal(first.jobs.length,50);assert.equal(first.hasMore,true);const second=await feed(db,null,new URL('https://laburapp.test/api/state?before='+encodeURIComponent(first.nextCursor)));assert.equal(second.jobs.length,15);assert.equal(new Set([...first.jobs,...second.jobs].map(x=>x.id)).size,65);
 const search=await feed(db,null,new URL('https://laburapp.test/api/state?q=cesped'));assert.equal(search.jobs.length,1);assert.equal(search.jobs[0].id,'job-000');
});
