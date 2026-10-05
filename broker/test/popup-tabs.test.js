import test from 'node:test';
import assert from 'node:assert/strict';
import { followPopup } from '../src/popup-tabs.js';
import { Store } from '../src/store.js';
function fixture(tabs, otherOwner) {
  const added=[]; const calls=[];
  return { added, calls, extension: { call: async (method,args) => { calls.push(method); return method==='tabs.list' ? {tabs} : {chromeGroupId:10,tab:tabs.find(t=>t.id===args.tabId)}; } },
    store: { getTab:id=> id===1?{id:1,leaseId:'a',status:'open'}:otherOwner, getLease:()=>({id:'a',status:'allocated',chromeGroupId:10}), addTab:t=>added.push(t), updateLeaseGroup:()=>{} } };
}
test('follows only a new direct child; ignores old popups and unrelated tabs', async () => {
  const f=fixture([{id:2,openerTabId:1},{id:3,openerTabId:99},{id:4,openerTabId:1,url:'https://s.taobao.com/search'}]);
  const tab=await followPopup({...f,openerTabId:1,beforeTabIds:[1,2],timeoutMs:0});
  assert.equal(tab.id,4); assert.equal(f.added[0].leaseId,'a');
});
test('will not take a tab already owned by another lease', async () => {
  const f=fixture([{id:4,openerTabId:1}],{leaseId:'b'});
  await assert.rejects(followPopup({...f,openerTabId:1,beforeTabIds:[1],timeoutMs:0}),/POPUP_LEASE_MISMATCH/);
  assert.equal(f.added.length,0);
});
test('same-tab navigation is allowed; ambiguous new tabs are rejected', async () => {
  const f=fixture([{id:1}]);
  assert.equal(await followPopup({...f,openerTabId:1,beforeTabIds:[1],timeoutMs:0}),null);
  const multiple=fixture([{id:4,openerTabId:1},{id:5,openerTabId:1}]);
  await assert.rejects(followPopup({...multiple,openerTabId:1,beforeTabIds:[1],timeoutMs:0}),/MULTIPLE_NEW_POPUPS/);
});

test('a popup absent from the real SQLite store can be registered and retrieved', async () => {
  const store = new Store(':memory:');
  try {
    assert.equal(store.getTab(4), null);
    store.createLease({ id:'a', agentId:'test', taskId:'popup', domain:'taobao.com', mode:'shared-context-tab-group', chromeGroupId:10, title:'test', color:'blue', status:'allocated', createdAt:new Date().toISOString(), expiresAt:new Date(Date.now()+60000).toISOString() });
    store.addTab({id:1,leaseId:'a',status:'open',createdAt:new Date().toISOString()});
    const f=fixture([{id:4,openerTabId:1,url:'https://s.taobao.com/search',title:'Search'}]);
    const tab=await followPopup({...f,store,openerTabId:1,beforeTabIds:[1],timeoutMs:0});
    assert.equal(tab.id,4); assert.equal(store.getTab(4).leaseId,'a');
  } finally { store.db.close(); }
});
