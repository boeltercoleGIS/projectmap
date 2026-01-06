// js/splash.js


const STORAGE_KEY = 'stillwater_splash_v1';

function isHomeHash() {
  const h = window.location.hash || '';
  return h === '' || h === '#home';
}

export function showSplashIfNeeded() {
  const splash = document.getElementById('splash');
  if (!splash) return;

  // Do not show on deep links
  if (!isHomeHash()) return;


  if (localStorage.getItem(STORAGE_KEY) === '1') return;

  openSplash(splash);
}

function openSplash(splash) {
  splash.classList.remove('hidden');
  splash.setAttribute('aria-hidden', 'false');

  splash.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeydown);

  document.getElementById('splash-continue')?.focus?.();
}

function closeSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;

  splash.classList.add('hidden');
  splash.setAttribute('aria-hidden', 'true');

  localStorage.setItem(STORAGE_KEY, '1');

  splash.removeEventListener('click', onClick);
  window.removeEventListener('keydown', onKeydown);
}

function onClick(e) {
  const t = e.target;
  if (!t) return;

  if (t.id === 'splash-continue') return closeSplash();

  if (t.getAttribute?.('data-splash-close') === '1') {
    return closeSplash();
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') closeSplash();
}
