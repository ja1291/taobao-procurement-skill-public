import fs from 'node:fs';
import path from 'node:path';
const [run,lease,tab,pid,csv]=process.argv.slice(2);
if(!/^[a-z0-9-]+$/.test(run||'')||!lease||!tab||!pid||!csv)throw Error('Usage: RUN LEASE TAB PRODUCT SIZE-LABELS-CSV');
const root=process.cwd(),out=path.join(root,'data',run);fs.mkdirSync(out,{recursive:true});
async function capture(selector){
 const response=await fetch('http://127.0.0.1:17890/jobs/extract',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({extractor:'product-detail.extract.js',leaseId:lease,tabId:Number(tab),params:{selector,followPopup:false,waitMs:1800},keepOpen:true,active:true,saveHtml:true,screenshot:true,maxAttempts:1,humanize:'off'})});
 const data=await response.json();if(!response.ok||data.result?.status!=='detail')throw Error(JSON.stringify(data));
 const html=fs.readFileSync(path.join(root,data.artifacts.find(a=>a.kind==='html').path.slice(1)),'utf8');
 const selected=[...html.matchAll(/<div class="valueItem[^\"]*isSelected[^\"]*"[^>]*>[\s\S]*?<span title="([^"]+)"/g)].map(m=>m[1]);
 return {productId:pid,checkedAt:new Date().toISOString(),selected,quantity:html.match(/<input[^>]*class="countValue[^>]*value="([^"]+)"/)?.[1],stock:html.match(/<div class="quantityTip[^>]*>([\s\S]*?)<\/div>/)?.[1]?.replace(/<[^>]*>/g,''),skuId:new URL(data.result.url).searchParams.get('skuId'),result:data.result,artifacts:data.artifacts};
}
let record=await capture('');
for(const size of csv.split(',')){
 if(!record.selected.includes(size))record=await capture(`span[title=${JSON.stringify(size)}]`);
 if(!record.selected.includes(size)||record.quantity!=='1'||!record.skuId)throw Error('Selection not verified: '+JSON.stringify(record.selected));
 fs.writeFileSync(path.join(out,`size-check-${pid}-${size.split(' ')[0]}.json`),JSON.stringify({...record,size},null,2));
 console.log(JSON.stringify({size,selected:record.selected,quantity:record.quantity,stock:record.stock,sku:record.skuId,price:record.result.text.match(/￥\s*[\d.]+/)?.[0]}));
 await new Promise(r=>setTimeout(r,1200));
}
