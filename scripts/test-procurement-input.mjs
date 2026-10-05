import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {effectiveLength, validateInput, runDirectory} from './procurement-input.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const desc='黑色防水連帽外套適合戶外工作需要可調整袖口';
test('missing and insufficient input show actionable prompt',()=>{
  assert.equal(validateInput().ready,false);
  assert.match(validateInput().prompt,/20/);
  assert.equal(validateInput({description:'背包'}).ready,false);
  assert.equal(validateInput({description:' !😀\n'.repeat(30)}).descriptionChars,0);
});
test('counts letters and digits, handles exact boundary and configurable minimum',()=>{
  assert.equal(effectiveLength('中 文， A-1 😀'),4);
  assert.equal(validateInput({description:'甲'.repeat(19)}).ready,false);
  assert.equal(validateInput({description:'甲'.repeat(20)}).ready,true);
  assert.equal(validateInput({description:'甲'.repeat(20),minChars:21}).ready,false);
  assert.equal(validateInput({description:'Black waterproof hooded jacket'}).mode,'text_only');
  assert.throws(()=>validateInput({minChars:0}));
});
test('image-only, mixed input, unreadable references and file-only review',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'procurement-input-'));
  try{
    const image=path.join(dir,'reference.png'), file=path.join(dir,'spec.txt'),fake=path.join(dir,'fake.png');
    fs.writeFileSync(image,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
    fs.writeFileSync(file,desc);fs.writeFileSync(fake,'not an image');
    assert.equal(validateInput({images:[image]}).mode,'image_only');
    assert.equal(validateInput({images:[image],description:desc}).mode,'image_and_text');
    assert.equal(validateInput({images:[fake]}).ready,false);
    assert.equal(validateInput({files:[file]}).status,'needs_attachment_review');
    assert.equal(validateInput({files:[file],attachmentSummary:desc}).mode,'attachment');
    assert.equal(validateInput({images:[path.join(dir,'missing.png')]}).ready,false);
    fs.writeFileSync(file,'');assert.equal(validateInput({files:[file]}).ready,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('run traversal is rejected',()=>{
  assert.throws(()=>runDirectory(root,'../escape'));
  assert.throws(()=>runDirectory(root,'../data'));
});
test('browser search is blocked before any broker access when intake is missing',()=>{
  const r=spawnSync(process.execPath,['scripts/procurement-browser.mjs','test-missing-input','extract','taobao.extract.js','https://www.taobao.com/'],{cwd:root,encoding:'utf8',env:{...process.env,BRS_BROKER_URL:'http://127.0.0.1:1'}});
  assert.equal(r.status,2);
  assert.equal(JSON.parse(r.stdout).status,'needs_input');
  assert.equal(fs.existsSync(path.join(root,'data','test-missing-input')),false);
});
