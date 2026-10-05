// Follow only a newly opened direct child of this task's tab.
export async function followPopup({ extension, store, openerTabId, beforeTabIds, timeoutMs = 5000, pause = ms => new Promise(r => setTimeout(r, ms)) }) {
  const owner = store.getTab(openerTabId);
  const lease = owner && store.getLease(owner.leaseId);
  if (!owner || owner.status === 'closed' || lease?.status !== 'allocated') throw new Error('POPUP_LEASE_NOT_ACTIVE');
  const previous = new Set(beforeTabIds);
  const deadline = Date.now() + Math.min(15000, Math.max(0, timeoutMs));
  do {
    const { tabs } = await extension.call('tabs.list', {});
    const candidates = tabs.filter(t => t.openerTabId === openerTabId && !previous.has(t.id));
    if (candidates.length > 1) throw new Error('MULTIPLE_NEW_POPUPS');
    if (candidates.length === 1) {
      const candidate = candidates[0];
      const tracked = store.getTab(candidate.id);
      if (tracked && tracked.leaseId !== lease.id) throw new Error('POPUP_LEASE_MISMATCH');
      const adopted = await extension.call('tabs.adoptPopup', { tabId: candidate.id, openerTabId, groupId: lease.chromeGroupId });
      if (adopted.chromeGroupId !== lease.chromeGroupId) store.updateLeaseGroup(lease.id, adopted.chromeGroupId);
      store.addTab({ id: candidate.id, leaseId: lease.id, url: adopted.tab.url, title: adopted.tab.title, status: 'open', createdAt: new Date().toISOString() });
      return adopted.tab;
    }
    if (Date.now() >= deadline) break;
    await pause(250);
  } while (true);
  return null;
}
