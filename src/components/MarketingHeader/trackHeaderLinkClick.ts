declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackHeaderLinkClick(anchor: HTMLAnchorElement): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: 'Header Link Click',
    click_text: (anchor.textContent ?? '').trim(),
    click_url: anchor.href,
    click_classes: anchor.className,
  });
}
