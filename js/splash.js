// js/splash.js
// Shows a splash screen once per browser (localStorage).
// Safe with hash routing: it does not modify the URL.

const KEY = 'stillwater_splash_v1';

function qs(sel) {
  return document.querySelector(sel);
}

export function showSplashIfNeeded() {
  const splash = qs('#splash');
  if (!splash) return;

  // show only once per browser (until storage cleared)
  const alreadySeen = localStorage.getItem(KEY) === '1';
  if (alreadySeen) return;

  openSplash();
}

function openSplash() {
  const splash = qs('#splash');
  if (!splash) return;

  splash.classList.remove('hidden');
  splash.setAttribute('aria-hidden', 'false');

  // close behaviors
  splash.addEventListener('click', onSplashClick);
  window.addEventListener('keydown', onSplashKeydown);

  // focus
  qs('#splash-continue')?.focus?.();
}

function closeSplash() {
  const splash = qs('#splash');
  if (!splash) return;

  splash.classList.add('hidden');
  splash.setAttribute('aria-hidden', 'true');

  localStorage.setItem(KEY, '1');

  splash.removeEventListener('click', onSplashClick);
  window.removeEventListener('keydown', onSplashKeydown);
}

function onSplashClick(e) {
  const t = e.target;
  if (!t) return;

  // close if clicked backdrop, X, or Continue
  if (t.id === 'splash-continue') return closeSplash();

  const closeAttr = t.getAttribute?.('data-splash-close');
  if (closeAttr === '1') return closeSplash();
}

function onSplashKeydown(e) {
  if (e.key === 'Escape') closeSplash();
}
