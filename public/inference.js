/* Local text assistance: explicit rules, no external AI or network requests. */
(function(root){
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const trades=[
{id:'pintura',name:'Pintor/a',label:'Pintura',category:'Construcción y oficios',terms:/\b(pint(?:ar|e|en|ura|or|ores|ora|ando|ado)|empapelar)\b/,title:'Trabajo de pintura',hint:'Podés sumar las medidas, el estado de la superficie y quién pone la pintura.'},
{id:'plomeria',name:'Plomero/a',label:'Plomería',category:'Construcción y oficios',terms:/\b(plomer\w*|canilla\w*|ca(?:n|ñ)eria\w*|perdida de agua|destap\w*|inodoro\w*|griferia)\b/,title:'Trabajo de plomería',hint:'Contá dónde está el problema y qué está pasando, sin compartir tu dirección exacta.'},
{id:'electricidad',name:'Electricista',label:'Electricidad',category:'Construcción y oficios',terms:/\b(electric\w*|enchufe\w*|cableado|tomacorriente\w*|disyuntor|termica|instalar (?:una |un )?(?:luz|lampara|ventilador))\b/,title:'Trabajo de electricidad',hint:'Indicá qué instalación o reparación necesitás y si ya tenés los materiales.'},
{id:'jardineria',name:'Jardinero/a',label:'Jardinería',category:'Jardinería',terms:/\b(jardin\w*|pasto|cesped|podar|poda|desmalez\w*|cortar (?:un |el )?arbol)\b/,title:'Trabajo de jardinería',hint:'Sumá el tamaño aproximado y si tenés herramientas disponibles.'},
{id:'limpieza',name:'Personal de limpieza',label:'Limpieza',category:'Hogar y limpieza',terms:/\b(limpi\w*|lavar|lavado|barrer|desinfect\w*|ordenar (?:la |una )?casa)\b/,title:'Ayuda con limpieza',hint:'Podés aclarar cuántos ambientes hay y quién pone los productos.'},
{id:'mudanza',name:'Ayudante de mudanza',label:'Mudanzas',category:'Mudanzas',terms:/\b(mudanza\w*|mudar\w*|flete\w*|mover (?:unos |un |los )?muebles|(?:cargar|descargar|bajar|subir) (?:unas |unos |las |los |un |una )?(?:cajas|muebles|mueble|heladera))\b/,title:'Ayuda para una mudanza',hint:'Contá qué hay que mover, si hay escaleras y si necesitás vehículo.'},
{id:'gastronomia',name:'Personal gastronómico',label:'Gastronomía',category:'Gastronomía',terms:/\b(moz[oa]s?|cociner\w*|cocinar|gastronom\w*|bachero\w*|catering|camarer\w*)\b/,title:'Ayuda en gastronomía',hint:'Aclarar el horario, las tareas y la cantidad de personas ayuda a coordinar.'},
{id:'comercio',name:'Personal de comercio',label:'Comercio',category:'Comercio',terms:/\b(mercaderia|repositor\w*|cajer\w*|atender (?:un |el )?(?:local|negocio|comercio)|vendedor\w*|etiquet\w*|inventario)\b/,title:'Refuerzo para un comercio',hint:'Contá qué tareas hay que hacer y en qué horario.'},
{id:'albanileria',name:'Albañil',label:'Albañilería',category:'Construcción y oficios',terms:/\b(albanil\w*|revoque|revocar|construir|colocar (?:ceramicos|pisos)|levantar (?:un |una )?(?:pared|muro))\b/,title:'Trabajo de albañilería',hint:'Indicá medidas aproximadas y qué materiales están disponibles.'},
{id:'carpinteria',name:'Carpintero/a',label:'Carpintería',category:'Construcción y oficios',terms:/\b(carpinter\w*|armar (?:un |una |el |la )?(?:mueble|placard|ropero)|reparar (?:un |una |el |la )?(?:mueble|puerta de madera))\b/,title:'Trabajo de carpintería',hint:'Sumá las medidas, el material o el modelo del mueble.'},
{id:'tecnologia',name:'Técnico/a informático/a',label:'Tecnología',category:'Tecnología',terms:/\b(computadora\w*|notebook\w*|formatear|impresora\w*|reparar (?:una |la |mi )?pc|instalar (?:windows|software|programas)|wifi|wi-fi)\b/,title:'Ayuda con tecnología',hint:'Contá qué equipo tenés y cuál es el problema.'},
{id:'mascotas',name:'Cuidador/a de mascotas',label:'Mascotas',category:'Mascotas',terms:/\b(perr[oa]s?|gat[oa]s?|mascota\w*|paseador\w*)\b/,title:'Ayuda con mascotas',hint:'Aclarar cuántos animales son, el horario y los cuidados necesarios ayuda a encontrar a alguien.'},
{id:'cuidados',name:'Cuidador/a',label:'Cuidado y acompañamiento',category:'Cuidado y acompañamiento',terms:/\b(niner\w*|cuidar (?:a |una |un )?(?:persona|adulto|abuelo|abuela|bebe|nino|nina)|acompanante|cuidador\w*)\b/,title:'Cuidado y acompañamiento',hint:'Describí las tareas y el horario. Evitá publicar datos personales o de salud.'},
{id:'creativos',name:'Profesional creativo/a',label:'Servicios creativos',category:'Servicios creativos',terms:/\b(diseno|disenador\w*|logo\w*|fotograf\w*|editar (?:un |unos |el |los )?(?:video|videos)|redes sociales)\b/,title:'Trabajo creativo',hint:'Contá qué necesitás recibir y para cuándo.'},
{id:'mecanica',name:'Mecánico/a',label:'Mecánica',category:'Construcción y oficios',terms:/\b(mecanic\w*|cambio de aceite|arreglar (?:un |el |mi )?auto|reparar (?:un |el |mi )?auto)\b/,title:'Ayuda con mecánica',hint:'Contá qué vehículo tenés y qué tarea necesitás.'},
{id:'otros',name:'Otra especialidad',label:'Otro rubro',category:'Otros',terms:/$^/,title:'Ayuda con una tarea',hint:'Agregá cualquier detalle que ayude a entender el trabajo.'}
];
const zones=['Centro','Universitario','Villa Mitre','Palihue','Ingeniero White','Bella Vista','Noroeste','Villa Rosas','Grünbein','General Daniel Cerri','Otra zona'];
function infer(text){
const n=norm(text);
// Ignore explicitly negated fragments, rather than classifying by an excluded task.
const positive=n.split(/[,;.!?]|\bpero\b/).filter(s=>!/^\s*(?:no\b|sin\b|no necesito\b|no busco\b)/.test(s)).join(' ');
let matches=trades.filter(t=>t.id!=='otros'&&t.terms.test(positive));
let trade=matches.length===1?matches[0]:null;
let zone=zones.find(z=>z!=='Otra zona'&&new RegExp('\\b'+norm(z)+'\\b').test(n))||'';
let pay=null,payMode='';
if(/\b(a (?:convenir|acordar)|recibir presupuestos|escucho presupuestos|sin presupuesto definido)\b/.test(n))payMode='quote';
else{let m=n.match(/(?:\$\s*|\b(?:pago|ofrezco|presupuesto(?: de)?)\s+(?:\$\s*)?)(\d[\d.]*(?:,\d{1,2})?)\s*(mil|k)?\b/);
if(!m)m=n.match(/\b(\d[\d.]*(?:,\d{1,2})?)\s*(mil|k|pesos|ars)\b/);
if(m&&!/^\s*(?:horas?|hs|metros?|m2|dias?|personas?|paredes?|ambientes?)\b/.test(n.slice(m.index+m[0].length))){let amount=Number(m[1].replace(/\./g,'').replace(',','.'))*((m[2]==='mil'||m[2]==='k')?1000:1);if(amount>0&&amount<=999999999){pay=amount;payMode='amount'}}}
let duration='',hours='';let hm=n.match(/\b(\d{1,2})\s*(?:horas?|hs)\b/);if(hm){duration='hours';hours=hm[1]+' horas'}else if(/\b(por hora|unas horas|un par de horas)\b/.test(n))duration='hours';else if(/\b(un dia|1 dia|una jornada|por dia|un turno)\b/.test(n))duration='day';else if(/\b(por tarea|por trabajo)\b/.test(n))duration='task';
let when='';const w=n.match(/\b(pasado manana|manana|hoy|esta semana|el fin de semana|este finde|(?:el |este |proximo )?(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)(?:\s+\d{1,2}(?:\/\d{1,2})?)?)\b/);if(w)when=w[0];let clock=n.match(/\b(?:de\s+\d{1,2}(?::\d{2})?\s+a\s+\d{1,2}(?::\d{2})?|a las\s+\d{1,2}(?::\d{2})?)\b/);if(clock)when+=(when?' · ':'')+clock[0];
let title=trade?.title||'';
if(trade?.id==='pintura'){if(/\bpared\b/.test(n))title='Pintar una pared';else if(/\bliving\b/.test(n))title='Pintar un living';else if(/\bhabitacion\b/.test(n))title='Pintar una habitación';else if(/\breja\b/.test(n))title='Pintar una reja'}
if(trade?.id==='jardineria'&&/\b(pasto|cesped)\b/.test(n))title='Cortar el pasto';
if(trade?.id==='gastronomia'&&/\bmozo|\bmoza/.test(n))title='Busco mozo/a';
if(trade?.id==='limpieza'&&/\bdepartamento\b/.test(n))title='Limpieza de un departamento';
const payUnit=/\bpor hora\b/.test(n)?'por hora':/\bpor (?:dia|jornada)\b/.test(n)?'por jornada':/\bpor persona\b/.test(n)?'por persona':'total estimado';
return {payUnit,matches:matches.map(t=>t.id),trade:trade?.id||'',category:trade?.category||'',title,zone,pay,payMode,duration,hours,when};
}
const api={norm,trades,zones,infer};if(typeof module!=='undefined')module.exports=api;else root.LaburappAssist=api;
})(typeof window!=='undefined'?window:this);
