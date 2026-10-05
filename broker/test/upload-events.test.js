import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('a file input upload emits input/change once without extra paste/drop uploads', async () => {
  const source = await readFile(new URL('../../extension/background.js', import.meta.url),'utf8');
  const implementation = source.slice(source.indexOf('async function uiUploadFile('),source.indexOf('function normalizeHumanizePolicy('));
  const events=[];
  class HTMLInputElement { type='file'; files=[]; focus(){} dispatchEvent(event){events.push(event.type);} }
  class DataTransfer { constructor(){this.files=[];this.items={add:file=>this.files.push(file)};} }
  const input=new HTMLInputElement();
  const context=vm.createContext({
    HTMLInputElement,DataTransfer,Blob,File,Event,Uint8Array,atob,
    document:{querySelector:()=>input},
    normalizeUploadFile: file=>file, attachDebugger:async()=>{},
    chrome:{scripting:{executeScript:async ({func,args})=>[{result:func(...args)}]}},
  });
  vm.runInContext(implementation,context);
  const result=await context.uiUploadFile({tabId:1,file:{base64:'aGVsbG8=',name:'coat.png',mimeType:'image/png'}});
  assert.equal(result.files,1);assert.equal(input.files[0].name,'coat.png');
  assert.deepEqual(events,['input','change']);
});
