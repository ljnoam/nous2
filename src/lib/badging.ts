export function setAppBadge(count: number) {
  const nav = navigator as any;
  if (nav.setAppBadge && typeof nav.setAppBadge === 'function') {
    try { nav.setAppBadge(count); } catch {}
  }
}

export function clearAppBadge() {
  const nav = navigator as any;
  if (nav.clearAppBadge && typeof nav.clearAppBadge === 'function') {
    try { nav.clearAppBadge(); } catch {}
  }
}

