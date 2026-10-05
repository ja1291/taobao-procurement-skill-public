import test from 'node:test';
import assert from 'node:assert/strict';
import { extract } from '../../extractors/product-detail.extract.js';

test('product verification is a human handoff, never a product description', async () => {
  const result = await extract({params:{waitMs:0},ui:{html:async()=>({tab:{title:'CAPTCHA Verification',url:'https://item.taobao.com/item.htm?id=123'},html:'<p>Please drag the slider to verify</p>'})}});
  assert.equal(result.status,'needs_verification');
  assert.equal(result.requiresHuman,true);
  assert.equal(result.text,'');
});

test('completed product detail ignores captcha words in script source', async () => {
  const result=await extract({params:{waitMs:0},ui:{html:async()=>({tab:{title:'外套',status:'complete',url:'https://detail.tmall.com/item.htm?id=123'},html:'<script>CAPTCHA Verification</script><p>'+ '商品實際規格 '.repeat(100)+'</p>'})}});
  assert.equal(result.status,'detail');
  assert.equal(result.requiresHuman,false);
  assert.ok(result.text.includes('商品實際規格'));
});

test('product login page remains incomplete and requires the user', async () => {
  const result=await extract({params:{waitMs:0},ui:{html:async()=>({tab:{title:'登录',url:'https://login.taobao.com/member/login.jhtml'},html:'<p>登录</p>'})}});
  assert.equal(result.status,'needs_login');
  assert.equal(result.requiresHuman,true);
});
