// Servidor de prueba visual de LABURAPP.
// Usa EXCLUSIVAMENTE una base SQLite en memoria con datos ilustrativos; nunca se conecta a producción.
// Sirve public/ y responde /api/* con lib/api.mjs. Solo escucha en 127.0.0.1.
//   Sesión simulada: cookie dev_user=<id> (owner, worker, worker2, worker3).
//   API caída simulada: cookie down=1 (responde 503).
// Uso directo: node scripts/visual-check/server.mjs [puerto]
import http from 'node:http';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync,existsSync} from 'node:fs';import {join,extname,dirname,resolve,sep} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const {handleApi,mutate,feed}=await import(pathToFileURL(join(ROOT,'lib/api.mjs')).href);
const Q=(await import(pathToFileURL(join(ROOT,'lib/domain/quality.mjs')).href)).default;

function database(){
 const sql=new DatabaseSync(':memory:');
 for(const f of readdirSync(join(ROOT,'drizzle')).filter(x=>x.endsWith('.sql')).sort())sql.exec(readFileSync(join(ROOT,'drizzle',f),'utf8'));
 return {prepare(text){return {args:[],bind(...a){this.args=a;return this},async all(){return {results:sql.prepare(text).all(...this.args)}},async run(){return {meta:{changes:Number(sql.prepare(text).run(...this.args).changes)}}},text}},
  async batch(st){sql.exec('BEGIN');try{const r=[];for(const p of st){const s=sql.prepare(p.text);if(/^\s*SELECT/.test(p.text))r.push({results:s.all(...p.args),meta:{changes:0}});else r.push({results:[],meta:{changes:Number(s.run(...p.args).changes)}})}sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
}

// Datos ilustrativos: solo existen en memoria mientras corre este proceso.
async function seed(db){
 const cat=name=>Q.categories.includes(name)?name:Q.categories[1];
 const jobs=[
  ['Pintar una pared interior','Necesito pintar una pared interior de mi casa de unos 4 metros. Yo pongo los materiales y la escalera.','Pintor','Construcción y oficios','Centro','task',30000,'por tarea'],
  ['Ayudante para mudanza el sábado','Busco una persona para ayudar a cargar cajas y muebles livianos en una mudanza corta dentro de la ciudad.','Ayudante','Mudanzas y fletes','Villa Mitre','hours',8000,'por hora'],
  ['Cuidar el jardín una vez por semana','Cortar el pasto, regar y mantener los canteros del patio delantero de una casa en Palihue durante el mes.','Jardinero','Jardinería','Palihue','day',25000,'por día']];
 await mutate(db,'owner',{type:'profile',name:'Ana',bio:'Vecina del centro que publica changas para su casa y su negocio.',experience:'Publico tareas puntuales y coordino por la tarde.',skills:[]});
 for(const [title,desc,trade,category,zone,duration,pay,unit] of jobs)await mutate(db,'owner',{type:'publish',job:{title,desc,trade,category:cat(category),zone,duration,time:'Viernes de 9 a 13',pay,unit,publisher:'Particular · Ana',phone:'5492915550000',sample:true}});
 const all=(await feed(db,'owner',new URL('http://local/api/state'))).jobs,skills=[...new Set(all.map(j=>j.category))].slice(0,3);
 const people=[['worker','Luis','Preparo superficies y pinto interiores con prolijidad y limpieza desde hace años.'],['worker2','Carla','Hago mudanzas chicas, armado de muebles y tareas de jardín los fines de semana.'],['worker3','Martín','Trabajo en mantenimiento general de casas: pintura, jardín y arreglos simples.']];
 for(const [id,name,bio] of people)await mutate(db,id,{type:'profile',name,bio,experience:'Disponible por la mañana, con herramientas propias.',skills});
 const job=all.find(j=>j.title.startsWith('Pintar'));
 const msg=['Primero limpiaría y lijaría la superficie, después aplicaría la base y dos manos de pintura látex.','Protejo pisos y muebles con nylon, reparo fisuras con enduido y pinto con rodillo para que quede parejo.','Tengo rodillos, pinceles y cinta. Calculo media jornada para dejar la pared lista y el lugar limpio.'];
 for(const [i,id] of ['worker2','worker3','worker'].entries())await mutate(db,id,{type:'apply',jobId:job.id,message:msg[i],availability:'El viernes de 9 a 13',readConditions:true});
 const apps=(await feed(db,'owner',new URL('http://local/api/state'))).applications,app=id=>apps.find(a=>a.applicantId===id);
 await mutate(db,'owner',{type:'shortlist',applicationId:app('worker3').id,value:true});
 await mutate(db,'owner',{type:'message',applicationId:app('worker').id,message:'Hola Luis, ¿podrías pasar el viernes a las 9?'});
 await mutate(db,'worker',{type:'message',applicationId:app('worker').id,message:'Sí, perfecto. Llevo mis rodillos y la cinta de papel.'});
 await mutate(db,'owner',{type:'propose',applicationId:app('worker').id,terms:{task:'Pintar la pared del living',when:'Viernes de 9 a 13',pay:30000,unit:'total'}});
}

export async function startServer(port=0){
 const db=database();await seed(db);
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'},pub=join(ROOT,'public');
 const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');const cookie=req.headers.cookie||'';
  if(u.pathname.startsWith('/api/')){
   if(/(^|;\s*)down=1/.test(cookie)){res.writeHead(503,{'Content-Type':'application/json'});return res.end('{"error":"El servicio está temporalmente fuera de línea."}')}
   const user=cookie.match(/(?:^|;\s*)dev_user=(\w+)/)?.[1];const chunks=[];for await(const c of req)chunks.push(c);
   const headers=new Headers(Object.entries(req.headers).filter(([,v])=>typeof v==='string'));const origin='http://'+req.headers.host;
   const r=await handleApi(new Request(origin+u.pathname+u.search,{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined}),{DB:db},user?{userId:user}:null);
   res.writeHead(r.status,Object.fromEntries(r.headers));return res.end(Buffer.from(await r.arrayBuffer()))}
  const f=resolve(pub,u.pathname==='/'?'index.html':'.'+decodeURIComponent(u.pathname));
  if(!f.startsWith(pub+sep)||!existsSync(f)){res.writeHead(404);return res.end()}
  res.writeHead(200,{'Content-Type':types[extname(f)]||'application/octet-stream'});res.end(readFileSync(f))}catch(e){res.writeHead(500);res.end(String(e))}});
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 return {server,url:'http://127.0.0.1:'+server.address().port};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {url}=await startServer(+process.argv[2]||4321);console.log('LABURAPP local (datos de ejemplo en memoria):',url)}
