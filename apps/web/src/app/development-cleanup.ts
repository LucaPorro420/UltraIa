/**
 * Development-only Chrome extension cleanup.
 * Removes DOM nodes injected by extensions like Plurality, DeepL, etc.
 * Only runs in development mode.
 */

export function setupDevCleanup(): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'development') return;

  const BLOCKED_SELECTORS = [
    '#aiinhbfoop',
    '[class*="plurality"]',
    '[class*="deepl"]',
    'iframe[src*="chrome-extension"]',
    'script[src*="chrome-extension"]',
    'link[href*="chrome-extension"]',
  ];

  const remove = () => {
    BLOCKED_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    });
  };

  // Initial cleanup
  remove();

  // Observe for new injected nodes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (
          node instanceof HTMLElement &&
          !node.closest('#__next') &&
          ['SCRIPT', 'LINK', 'STYLE', 'IFRAME'].includes(node.tagName)
        ) {
          node.remove();
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// Auto-run if in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setupDevCleanup();
}