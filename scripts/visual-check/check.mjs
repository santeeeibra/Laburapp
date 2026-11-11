// Chequeo visual de LABURAPP con Playwright, contra el servidor local con datos en memoria.
// Uso: npm run check:visual            (capturas en .visual-check/)
//      npm run check:visual -- --out docs/capturas-verificacion/pantallas
//      npm run check:visual -- --url http://127.0.0.1:4321   (usar un servidor local ya levantado)
// Solo acepta URLs locales: nunca corre contra producción.
// Requiere las dependencias de desarrollo (npm install) y Chromium (npx playwright install chromium).
import {createRequire} from 'node:module';import {mkdirSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';
import {startServer} from './server.mjs';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('playwright'))}catch{console.error('Falta Playwright. Corré: npm install && npx playwright install chromium');process.exit(2)}
const arg=n=>{const i=process.argv.indexOf(n);return i>0?process.argv[i+1]:null};
const OUT=resolve(arg('--out')||'.visual-check');mkdirSync(OUT,{recursive:true});
let BASE=arg('--url'),server;
if(BASE){if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(BASE)){console.error('Solo se permiten URLs locales (127.0.0.1 o localhost).');process.exit(2)}BASE=BASE.replace(/\/$/,'')}
else ({server,url:BASE}=await startServer(0));

// Celulares y tablet se emulan como táctiles (pointer:coarse): mínimo 44 px. En computadora, mínimo 24 px (WCAG 2.5.8).
const VIEWPORTS=[{w:390,h:844,touch:true},{w:360,h:800,touch:true},{w:844,h:390,touch:true},{w:768,h:1024,touch:true},{w:1366,h:768,touch:false},{w:1920,h:1080,touch:false}];
const MIN_TEXT=11;

// Mide textos, controles y desborde dentro del diálogo abierto (o de la página si no hay diálogo).
function measure({minTarget,minText}){
 const root=document.querySelector('dialog[open]')||document.body,dialog=root.tagName==='DIALOG';
 const visible=e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return b.width>2&&b.height>2&&c.visibility!=='hidden'&&+c.opacity>0&&!e.closest('.hidden')&&(dialog||!e.closest('dialog:not([open])'))};
 const name=e=>(e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).join('.'):'')+' “'+(e.getAttribute('aria-label')||e.textContent||e.placeholder||e.value||'').trim().replace(/\s+/g,' ').slice(0,28)+'”');
 const text=[],targets=[];
 for(const e of root.querySelectorAll('*')){if(!visible(e))continue;
  if([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())){const fs=parseFloat(getComputedStyle(e).fontSize);if(fs<minText)text.push(name(e)+' '+fs+'px')}}
 for(const e of root.querySelectorAll('button,a[href],select,summary,[role=button],input:not([type=hidden]):not([type=checkbox]):not([type=radio]),label:has(>input[type=checkbox]),label:has(>input[type=radio])')){
  if(!visible(e))continue;const p=e.parentElement;
  if(e.tagName==='A'&&p&&['P','LI','SMALL'].includes(p.tagName)&&p.textContent.trim().length>e.textContent.trim().length+3)continue; // enlace dentro de un párrafo: excepción WCAG
  const h=Math.round(e.getBoundingClientRect().height*10)/10;if(h<minTarget)targets.push(name(e)+' '+h+'px')}
 const scroller=dialog?root:document.documentElement;
 return {text:[...new Set(text)],targets:[...new Set(targets)],overflowX:scroller.scrollWidth>scroller.clientWidth+1?scroller.scrollWidth-scroller.clientWidth:0};
}

// Cada pantalla: quién está en sesión y cómo abrirla. Todo con datos locales de ejemplo.
const firstJob=t=>`state.jobs.find(j=>j.title.startsWith('${t}')).id`,appOf=u=>`state.applications.find(a=>a.applicantId==='${u}').id`;
const SCREENS=[
 {id:'portada',user:null,open:null},
 {id:'detalle-sin-cuenta',user:null,open:`detail(${firstJob('Cuidar')})`},
 {id:'perfil-propio',user:'worker',open:`profileView()`},
 {id:'perfil-publico',user:'owner',open:`publicProfile('worker',()=>modal.close())`},
 {id:'publicar-idea',user:'owner',open:`publish('Necesito que alguien pinte la reja del frente el sábado a la mañana')`},
 {id:'publicar-zona',user:'owner',open:`publish('Necesito que alguien pinte la reja del frente');stage='zone';drawPublish()`},
 {id:'publicar-horario',user:'owner',open:`publish('Necesito que alguien pinte la reja del frente');stage='timing';drawPublish()`},
 {id:'publicar-pago',user:'owner',open:`publish('Necesito que alguien pinte la reja del frente');stage='pay';drawPublish()`},
 {id:'publicar-contacto',user:'owner',open:`publish('Necesito que alguien pinte la reja del frente');stage='contact';drawPublish()`},
 {id:'publicar-revision',user:'owner',open:`publish('Necesito que alguien pinte la reja del frente de mi casa en el centro, el sábado de 9 a 13. Pago 20000 por la tarea.');stage='review';drawPublish()`},
 {id:'mi-actividad-publicaciones',user:'owner',open:`activityView('owner')`},
 {id:'mi-actividad-postulaciones',user:'worker',open:`activityView('worker')`},
 {id:'candidatos',user:'owner',open:`manageJob(${firstJob('Pintar')})`,scrollTo:'.candidate-card'},
 {id:'candidatos-preseleccion',user:'owner',open:`manageJob(${firstJob('Pintar')},'shortlist')`,scrollTo:'.candidate-card',
  // Debe abrir la pestaña Preselección y mostrar solo candidatos preseleccionados (con su control para quitarlos).
  expect:()=>{const d=document.querySelector('dialog[open]'),cards=[...d.querySelectorAll('.candidate-card')],tab=d.querySelector('[data-inbox="shortlist"]'),out=[];
   if(!tab?.classList.contains('active'))out.push('la pestaña Preselección no está activa');if(!cards.length)out.push('no hay candidatos preseleccionados');
   for(const c of cards){if(!/Preseleccionado/.test(c.querySelector('.status-pill')?.textContent||''))out.push('aparece un candidato no preseleccionado');if(!c.querySelector('[data-shortlist]')?.textContent.includes('Quitar de preselección'))out.push('falta “Quitar de preselección”')}return out}},
 {id:'conversacion-quien-publica',user:'owner',open:`chat(${appOf('worker')})`},
 {id:'conversacion-postulante',user:'worker',open:`chat(${appOf('worker')})`},
 {id:'proponer-acuerdo',user:'owner',open:`proposeView(${appOf('worker2')})`},
];

const browser=await chromium.launch();const report={},failures=[];
const fail=(vp,what,detail)=>failures.push({vp,what,detail});
async function context(vp,cookies={}){const c=await browser.newContext({viewport:{width:vp.w,height:vp.h},isMobile:vp.touch,hasTouch:vp.touch});
 const list=Object.entries(cookies).filter(([,v])=>v).map(([name,value])=>({name,value,url:BASE}));if(list.length)await c.addCookies(list);return c}
async function load(c){const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(BASE+'/');await p.waitForFunction(()=>typeof state!=='undefined'&&state&&Array.isArray(state.jobs)&&state.jobs.length,null,{timeout:8000}).catch(()=>{});return {p,errors}}

for(const vp of VIEWPORTS){const key=vp.w+'x'+vp.h,r=report[key]={screens:{}};const minTarget=vp.touch?44:24;
 // Pantallas
 for(const s of SCREENS){const c=await context(vp,{dev_user:s.user});const {p,errors}=await load(c);
  if(s.open){try{await p.evaluate(s.open)}catch(e){errors.push(e.message)}await p.waitForTimeout(350)}
  if(s.scrollTo)await p.evaluate(sel=>document.querySelector('dialog[open] '+sel)?.scrollIntoView({block:'center'}),s.scrollTo);
  await p.waitForTimeout(150);
  const m=await p.evaluate(measure,{minTarget,minText:MIN_TEXT});m.errors=errors;r.screens[s.id]=m;
  if(s.expect){m.expect=await p.evaluate(s.expect);if(m.expect.length)fail(key,s.id+': contenido inesperado',m.expect)}
  if(m.text.length)fail(key,s.id+': texto < '+MIN_TEXT+'px',m.text);if(m.targets.length)fail(key,s.id+': control < '+minTarget+'px',m.targets);
  if(m.overflowX)fail(key,s.id+': desborde horizontal',[m.overflowX+'px']);if(errors.length)fail(key,s.id+': error de JavaScript',errors);
  await p.screenshot({path:`${OUT}/${s.id}-${key}.png`});await c.close()}

 // Foco visible con Tab (portada y buscador)
 {const c=await context(vp);const {p}=await load(c);const missing=new Set();let search=false;
  for(let i=0;i<45;i++){await p.keyboard.press('Tab');const f=await p.evaluate(()=>{const e=document.activeElement;if(!e||e===document.body)return null;const c=getComputedStyle(e);const s=e.closest('.search');
   const ok=(c.outlineStyle!=='none'&&parseFloat(c.outlineWidth)>0)||c.boxShadow!=='none'||(s&&getComputedStyle(s).boxShadow!=='none');return {ok,search:!!s,d:e.tagName+' '+(e.getAttribute('aria-label')||e.textContent||e.placeholder||'').trim().slice(0,30)}});
   if(!f)continue;if(f.search)search=true;if(!f.ok)missing.add(f.d)}
  r.focus={missing:[...missing],search};if(missing.size)fail(key,'foco sin indicador',[...missing]);if(!search)fail(key,'el buscador no recibe foco',[]);await c.close()}

 // API caída
 {const c=await context(vp,{down:'1'});const {p}=await load(c);await p.waitForTimeout(800);
  const a=await p.evaluate(()=>{const v=e=>e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden';const labels=[...document.querySelectorAll('header [data-action],.mobile-nav [data-action]')].filter(v).map(e=>e.textContent.trim());const t=document.querySelector('.toast');return {labels,toast:!!t&&v(t)&&+getComputedStyle(t).opacity>0.1&&!!t.textContent.trim()}});
  r.apiDown=a;if(a.labels.includes('Ingresar')&&a.labels.some(l=>/Mi perfil/.test(l)))fail(key,'API caída: "Ingresar" y "Mi perfil" juntos',a.labels);if(a.toast)fail(key,'API caída: aviso tapando el contenido',[]);
  await p.screenshot({path:`${OUT}/api-caida-${key}.png`});await c.close()}

 // Barra inferior con sesión
 if(vp.w<=650){const c=await context(vp,{dev_user:'worker'});const {p}=await load(c);const nav=p.locator('.mobile-nav [data-action]').last();
  const label=(await nav.textContent()).trim();await nav.click();await p.waitForTimeout(300);const opened=await p.locator('#modalEyebrow').textContent();
  r.mobileNav={label,opened};if(label!=='Mi actividad'||!/ACTIVIDAD/.test(opened))fail(key,'barra inferior con sesión',[label,opened]);await c.close()}

 // Validación de la postulación
 {const c=await context(vp,{dev_user:'worker'});const {p}=await load(c);await p.evaluate(`apply(${firstJob('Cuidar')})`);await p.waitForSelector('#applyForm',{timeout:3000});
  await p.evaluate(()=>{window.__inv=[];document.addEventListener('invalid',e=>setTimeout(()=>__inv.push(e.defaultPrevented)),true)});
  await p.locator('#applyForm button.btn').click();await p.waitForTimeout(300);
  const v={messages:await p.locator('.field-error').allTextContents(),nativeBlocked:await p.evaluate(()=>__inv.length>0&&__inv.every(Boolean))};
  await p.screenshot({path:`${OUT}/postulacion-errores-${key}.png`});
  await p.fill('#applyForm textarea','corto');v.whileTyping=(await p.locator('.field-error').count())?await p.locator('.field-error').first().textContent():'';
  await p.fill('#applyForm textarea','Corto el pasto con mi propia máquina, riego y limpio los canteros dejando todo prolijo.');await p.fill('#applyForm input[name=availability]','Los sábados por la mañana');await p.check('#applyForm input[type=checkbox]');
  v.afterFix=await p.locator('.field-error').count();r.validation=v;
  if(v.messages.length!==3||!v.nativeBlocked||v.afterFix!==0||!/al menos/.test(v.whileTyping))fail(key,'validación de la postulación',[JSON.stringify(v)]);await c.close()}
}
await browser.close();server?.close();

writeFileSync(`${OUT}/reporte.json`,JSON.stringify({base:BASE,failures,report},null,1));
const lines=['| Tamaño | '+SCREENS.map(s=>s.id).join(' | ')+' |','|---|'+SCREENS.map(()=>'---').join('|')+'|'];
for(const k in report)lines.push('| '+k+' | '+SCREENS.map(s=>{const m=report[k].screens[s.id];return m.text.length||m.targets.length||m.overflowX||m.errors.length||m.expect?.length?'❌':'✅'}).join(' | ')+' |');
writeFileSync(`${OUT}/reporte.md`,lines.join('\n')+'\n\n'+(failures.length?failures.map(f=>`- **${f.vp}** ${f.what}: ${f.detail.join('; ')}`).join('\n'):'Sin fallas.')+'\n');
console.log(lines.join('\n'));console.log(failures.length?`\n${failures.length} fallas:\n`+failures.map(f=>`- ${f.vp} ${f.what}: ${f.detail.slice(0,6).join('; ')}${f.detail.length>6?' …':''}`).join('\n'):'\nSin fallas.');
console.log('\nCapturas y reporte en',OUT);process.exit(failures.length?1:0);
