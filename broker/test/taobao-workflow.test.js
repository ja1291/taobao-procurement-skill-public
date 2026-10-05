import test from 'node:test';
import assert from 'node:assert/strict';
import { extract, assessTaobaoPage } from '../../extractors/taobao.extract.js';
const searchUrl = 'https://s.taobao.com/search?localImgKey=fixture';
const card = (id, title, price) => `<a href="https://item.taobao.com/item.htm?id=${id}" title="${title}"><img src="https://img.alicdn.com/${id}.jpg">${title} ¥${price} 10人付款</a>`;
const params = { mode: 'collect', maxScrolls: 0, pageLoadWaitMs: 0, requireSales: false, filter: '黑色 冲锋衣 连帽' };

test('virtualized cards retain only their own observed images across scrolls', async () => {
  let reads=0;
  const visible=card('123456789','黑色外套',100);
  const unloaded=visible.replace(/<img[^>]+>/,'')+card('987654321','其他商品',200);
  const result=await extract({url:searchUrl,params:{...params,maxScrolls:1,scrollPauseMs:0},ui:{
    html:async()=>({html:++reads<=2?visible:unloaded,tab:{url:searchUrl}}),
    waitFor:async()=>({found:true}),scroll:async()=>{},
  }});
  assert.equal(result.products[0].image_url,'https://img.alicdn.com/123456789.jpg');
  assert.equal(result.products[1].image_url,'https://img.alicdn.com/987654321.jpg');
});

test('image cache never crosses a changed search URL', async () => {
  let reads=0;
  const result=await extract({url:searchUrl,params:{...params,maxScrolls:1,scrollPauseMs:0},ui:{
    html:async()=>++reads<=2?{html:card('123456789','原搜尋',100),tab:{url:searchUrl}}:{html:card('123456789','新搜尋',200).replace(/<img[^>]+>/,''),tab:{url:searchUrl+'&q=new'}},
    waitFor:async()=>({found:true}),scroll:async()=>{},
  }});
  assert.equal(result.products[0].image_url,'');
});

test('homepage recommendations are never reported as search matches', async () => {
  const result = await extract({ url: 'https://www.taobao.com/', pageHtml: card('123456789', '黑色冲锋衣', 100), params });
  assert.equal(result.status, 'search_not_submitted');
  assert.deepEqual(result.products, []);
});

test('login links/scripts are harmless but a login iframe stops collection', async () => {
  assert.equal(assessTaobaoPage('<a href="https://login.taobao.com/">登录</a><script>captcha baxia login</script>', searchUrl), 'search_page');
  const result = await extract({ url: searchUrl, pageHtml: `<iframe id="baxia-dialog-content" src="https://login.taobao.com/member/login.jhtml"></iframe>${card('123456789', '外套', 100)}`, params });
  assert.equal(result.status, 'needs_login');
  assert.equal(result.total, 0);
});

test('neighbouring cards retain their own titles and prices; filter text does not grant points', async () => {
  const result = await extract({ url: searchUrl, pageHtml: card('123456789', '黑色连帽冲锋衣', 248) + card('987654321', '天然饮用水', 15), params });
  assert.deepEqual(result.products.map(p => [p.product_id,p.title,p.price,p.precision_score]), [['123456789','黑色连帽冲锋衣','¥248',3],['987654321','天然饮用水','¥15',0]]);
  assert.equal(result.products[0].visual_similarity, null);
  assert.equal(result.products[0].match_status, 'unverified');
});

test('zero scrolls reads the current page and never falls back to stale homepage HTML', async () => {
  let scrolls = 0;
  const result = await extract({ url: 'https://www.taobao.com/', pageHtml: card('987654321','旧资料',1), params, ui: {
    html: async () => ({ html: card('123456789','黑色外套',200), tab: { url: searchUrl } }),
    waitFor: async () => ({ found: true }), scroll: async () => scrolls++,
  } });
  assert.equal(scrolls, 0);
  assert.equal(result.products[0].product_id, '123456789');
  assert.equal(result.url, searchUrl);
});

test('image upload must submit and follow the newly opened tab; login produces no fake matches', async () => {
  const events = []; let submitted = false;
  const result = await extract({ url: 'https://www.taobao.com/', params: { ...params, mode: 'imageSearch', uploadWaitMs: 0, actionDelayMs: 0, uploadFile: { base64: 'AA==' } }, ui: {
    html: async () => submitted ? { html: '<iframe src="https://login.taobao.com/member/login.jhtml"></iframe>', tab: { url: searchUrl } } : { html: '<body>Homepage</body>', tab: { url: 'https://www.taobao.com/' } },
    waitFor: async () => ({ found: true }), move: async () => {},
    click: async p => { events.push(p.selector); if(p.selector === '#image-search-upload-button') submitted = true; },
    uploadFile: async () => events.push('upload'), tabIds: async () => [1,2],
    followPopup: async p => { assert.deepEqual(p.beforeTabIds,[1,2]); events.push('follow'); },
  } });
  assert.deepEqual(events, ['.image-icon-text','upload','#image-search-upload-button','follow']);
  assert.equal(result.status, 'needs_login'); assert.deepEqual(result.products, []);
});

test('verification and browser errors are distinct from empty results', () => {
  assert.equal(assessTaobaoPage('<iframe id="baxia-dialog-content" src="/challenge"></iframe>', searchUrl),'needs_verification');
  assert.equal(assessTaobaoPage('<div id="main-frame-error">ERR_CONNECTION_RESET</div>', searchUrl),'page_error');
});

test('split decimal prices retain cents, discount conditions and the correct shop', async () => {
  const html = '<a href="https://detail.tmall.com/item.htm?id=123456789" title="黑色冲锋衣"><span>¥</span><div class="priceInt--fixture">145</div><div class="priceFloat--fixture">.8</div><span class="priceDesc--fixture">首单价</span><span class="shopNameText--fixture">测试服装店</span></a>';
  const result = await extract({ url: searchUrl, pageHtml: html, params });
  assert.equal(result.products[0].price, '¥145.8');
  assert.equal(result.products[0].price_note, '首单价');
  assert.equal(result.products[0].shop_name, '测试服装店');
});
