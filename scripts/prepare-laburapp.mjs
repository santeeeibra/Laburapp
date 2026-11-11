import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('lib/domain',{recursive:true});
function esm(source){return source.split('(function(root){')[1].split("if(typeof module!=='undefined')module.exports=api;")[0]+'\nexport default api;\n'}
let q=await readFile('public/quality.js','utf8');
await writeFile('lib/domain/quality.mjs',esm(q));
let w=(await readFile('public/workflow.js','utf8')).replace("const Q=typeof module!=='undefined'?require('./quality.js'):root.LaburappQuality;",'const Q=quality;');
await writeFile('lib/domain/workflow.mjs',`import quality from './quality.mjs';\n${esm(w)}`);
let html=await readFile('public/index.html','utf8');
await writeFile('app/landing.ts','export default '+JSON.stringify(html)+';\n');
