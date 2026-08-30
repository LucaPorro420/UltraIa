/**
 * Dev-only DOM cleanup: removes nodes injected by Chrome extensions
 * (Plurality, DeepL, aiinhbfoop) that cause MIME errors and layout issues.
 * Only runs in development mode.
 */
export function initDevCleanup() {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof window === 'undefined') return;

  const BLOCKED_SELECTORS = [
    '#aiinhbfoop',
    '[class*="plurality"]',
    '[class*="deepl"]',
    'iframe[src*="chrome-extension"]',
    'script[src*="chrome-extension"]',
    'link[href*="chrome-extension"]',
  ];

  const removeBlocked = () => {
    for (const sel of BLOCKED_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }
  };

  // Initial cleanup
  removeBlocked();

  // Watch for new injections
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        // Remove extension-injected nodes not inside #__next
        if (!node.closest('#__next') && node.tagName !== 'HTML' && node.tagName !== 'HEAD') {
          const tag = node.tagName.toLowerCase();
          if (tag === 'script' || tag === 'link' || tag === 'style' || tag === 'iframe') {
            node.remove();
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}
