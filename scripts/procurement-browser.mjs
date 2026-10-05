import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runDirectory,validateInput} from './procurement-input.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [run,...args]=process.argv.slice(2);
if(!run || !/^[a-z0-9-]+$/.test(run) || !args.length) throw new Error('Usage: node scripts/procurement-browser.mjs RUN-ID COMMAND [arguments]');
const dest=runDirectory(root,run);
// Status, evidence reads and cleanup remain available while a request is incomplete.
const nonSearch=new Set(['status','health','leases','jobs','job','tabs','tab-audit','browse-html','browse-screenshot','browse-end','release','close']);
if(!nonSearch.has(args[0])) {
  const intake=path.join(dest,'intake.json');
  const request=fs.existsSync(intake)?JSON.parse(fs.readFileSync(intake,'utf8')).request:{};
  const assessment=validateInput(request);
  if(!assessment.ready){console.log(JSON.stringify(assessment,null,2));process.exit(2);}
}
fs.mkdirSync(dest,{recursive:true});
const result=spawnSync(process.execPath,[path.join(root,'cli/brs.js'),...args],{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:24*1024*1024});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=path.join(dest,`${stamp}-${args[0]}.json`);
fs.writeFileSync(output,result.stdout||result.stderr);
if(result.status!==0){console.error(result.stderr);process.exit(result.status||1);}
const data=JSON.parse(result.stdout);fs.writeFileSync(path.join(dest,'latest.json'),JSON.stringify({record:output,...data},null,2));
console.log(JSON.stringify({record:output,lease:data.lease,tab:data.tab,job:data.job?.status,result:data.result,artifacts:data.artifacts},null,2));
