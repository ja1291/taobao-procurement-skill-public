// Open an observed product link through the page UI, then capture its text.
export const schema = { type: 'object', properties: {
  selector: { type: 'string', default: '' },
  waitMs: { type: 'integer', default: 3500 },
} };
export function assessProductPage(page, text) {
  if (/CAPTCHA Verification/i.test(page.tab?.title || '') || /Please (?:drag the slider|slide) to verify/i.test(text)) return 'needs_verification';
  if (/^https:\/\/login\.taobao\.com\//i.test(page.tab?.url || '')) return 'needs_login';
  return 'detail';
}
export async function extract({ ui, params = {} }) {
  if (params.selector) {
    const beforeTabIds = await ui.tabIds();
    await ui.move({ selector: params.selector });
    await new Promise(r => setTimeout(r, 200));
    await ui.click({ selector: params.selector, pauseAfterMs: 600 });
    if (params.followPopup !== false) await ui.followPopup({ beforeTabIds });
  }
  await new Promise(r => setTimeout(r, params.waitMs ?? 3500));
  let page, text;
  for (let attempt = 0; attempt < 12; attempt++) {
    page = await ui.html();
    text = String(page.html || '').replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (assessProductPage(page, text) !== 'detail') break;
    if (text.length > 500 && page.tab?.status === 'complete') break;
    await new Promise(r => setTimeout(r, 1500));
  }
  if (!text) throw new Error('PRODUCT_PAGE_NOT_LOADED');
  const status = assessProductPage(page, text);
  return { source: 'product_detail', status, requiresHuman: status !== 'detail', url: page.tab?.url, title: page.tab?.title, text: status === 'detail' ? text.slice(0, 24000) : '' };
}
