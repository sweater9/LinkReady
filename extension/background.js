const TRACKING_EXACT = new Set([
  'fbclid','gclid','dclid','msclkid','igshid','mc_cid','mc_eid','mkt_tok',
  'vero_conv','vero_id','_hsenc','_hsmi','s_cid','yclid','twclid','ttclid'
]);
const TRACKING_PREFIXES = ['utm_','ga_','pk_'];

function cleanUrl(raw) {
  try {
    const u = new URL(raw);
    [...u.searchParams.keys()].forEach((key) => {
      const lower = key.toLowerCase();
      if (TRACKING_EXACT.has(lower) || TRACKING_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
        u.searchParams.delete(key);
      }
    });
    return u.toString();
  } catch {
    return raw;
  }
}

function formatLink(kind, url, title) {
  const clean = cleanUrl(url);
  const safeTitle = (title || '').trim();
  const host = new URL(clean).hostname.replace(/^www\./, '');

  if (kind === 'whatsapp') return safeTitle ? `${safeTitle}\n${clean}` : clean;
  if (kind === 'email') return safeTitle ? `${safeTitle} — ${clean}` : clean;
  if (kind === 'linkedin') return safeTitle ? `${safeTitle}\n${clean}` : clean;
  if (kind === 'markdown') return `[${safeTitle || host}](${clean})`;
  return clean;
}

async function copyInPage(tabId, text) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: async (value) => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
    },
    args: [text]
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'clean', title: 'Copy clean link', contexts: ['page', 'link'] });
    chrome.contextMenus.create({ id: 'whatsapp', title: 'Copy for WhatsApp', contexts: ['page', 'link'] });
    chrome.contextMenus.create({ id: 'email', title: 'Copy for Email', contexts: ['page', 'link'] });
    chrome.contextMenus.create({ id: 'linkedin', title: 'Copy for LinkedIn', contexts: ['page', 'link'] });
    chrome.contextMenus.create({ id: 'markdown', title: 'Copy as Markdown', contexts: ['page', 'link'] });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const sourceUrl = info.linkUrl || tab.url;
  if (!sourceUrl) return;

  try {
    await copyInPage(tab.id, formatLink(info.menuItemId, sourceUrl, tab.title));
  } catch (error) {
    console.warn('LinkReady could not copy this link.', error);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !tab.url) return;
  try {
    await copyInPage(tab.id, cleanUrl(tab.url));
  } catch (error) {
    console.warn('LinkReady could not copy this link.', error);
  }
});
