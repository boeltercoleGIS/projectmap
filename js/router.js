// js/router.js
// Fully config-driven router (no hardcoded pane IDs, table IDs, or field lists).
//
// Requirements:
// - You call setupSidebarRouting(sidebar, map, sidebarConfig) from main.js
// - sidebarConfig defines:
//    - panes with { id, kind: 'list'|'detail'|'home', where?, list?, detail? }
//    - one detail pane with detail: { tableId, fields, attachments?: { hostId } }
//
// Router responsibilities:
// - Hash -> open pane OR open detail route (project-{OBJECTID})
// - Apply points layer filter based on pane.where when on a pane route
// - For project routes: open the detail pane from config, render fields from config
// - Maintain lastOriginPaneId for the back button
//
// NOTE: This router assumes project routes are `#project-123`
// and list row clicks set hashes accordingly.

import { projectsLayer, markerLookup } from './layers.js';
import {
  showOnlyProject,
  highlightFeature,
  flyToFeature,
  showRelatedFeatures,
  resetTableHighlights,
  resetRelatedFeatures,
  resetProjectFilter,
  renderProjectAttachments
} from './utils.js';

import { escapeHtml, formatCellValue } from './ui/format.js';
import { fetchProjectById } from './services/projectsService.js';

/* -----------------------------
   Routing state
----------------------------- */
let lastOriginPaneId = 'home';
let lastPaneId = 'home';

// cancel stale async project work
let projectRouteToken = 0;

/* -----------------------------
   Config helpers
----------------------------- */

function getHashId() {
  return window.location.hash.replace('#', '');
}

function isProjectHash(h) {
  return typeof h === 'string' && /^project-\d+$/.test(h);
}

function isPaneHash(h, cfg) {
  if (!h) return false;
  return cfg.some((p) => p?.id === h);
}

function isOriginPaneId(id, cfg) {
  // "origin" panes are anything except the detail pane (so back button goes there)
  const pane = cfg.find((p) => p.id === id);
  return !!pane && pane.kind !== 'detail';
}

function getDetailPane(cfg) {
  return cfg.find((p) => p.kind === 'detail') || null;
}

function getPaneById(cfg, id) {
  return cfg.find((p) => p.id === id) || null;
}

/**
 * Robust extraction of OBJECTID from Esri Leaflet / Cluster click events.
 */
function getObjectIdFromEsriClick(e) {
  const id1 = e?.feature?.properties?.OBJECTID;
  if (id1 != null) return Number(id1);

  const id2 = e?.layer?.feature?.properties?.OBJECTID;
  if (id2 != null) return Number(id2);

  const id3 = e?.target?.feature?.properties?.OBJECTID;
  if (id3 != null) return Number(id3);

  return null;
}

/**
 * Wait for a marker to exist in markerLookup (deep links can load before markers are created)
 */
function waitForMarker(objectId, timeoutMs = 3500) {
  return new Promise((resolve) => {
    const existing = markerLookup[objectId];
    if (existing) return resolve(existing);

    const start = Date.now();

    const onCreate = () => {
      const lyr = markerLookup[objectId];
      if (lyr) cleanup(lyr);
    };

    const onLoad = () => {
      const lyr = markerLookup[objectId];
      if (lyr) cleanup(lyr);
    };

    const tick = () => {
      const lyr = markerLookup[objectId];
      if (lyr) return cleanup(lyr);
      if (Date.now() - start > timeoutMs) return cleanup(null);
      setTimeout(tick, 90);
    };

    const cleanup = (result) => {
      try {
        projectsLayer?.off?.('createfeature', onCreate);
        projectsLayer?.off?.('load', onLoad);
      } catch {}
      resolve(result);
    };

    try {
      projectsLayer?.on?.('createfeature', onCreate);
      projectsLayer?.on?.('load', onLoad);
    } catch {}

    tick();
  });
}

/* -----------------------------
   Detail rendering (config-driven)
----------------------------- */

function fillDetailTableFromFeature(detailPane, feature) {
  const tableId = detailPane?.detail?.tableId;
  const fields = detailPane?.detail?.fields;

  if (!tableId || !Array.isArray(fields)) return;

  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;

  const props = feature?.properties || {};
  const objectId = props.OBJECTID;

  const table = tbody.closest('table');
  if (table?.dataset?.objectid && String(table.dataset.objectid) === String(objectId)) return;
  if (table) table.dataset.objectid = String(objectId ?? '');

  tbody.innerHTML = '';

  for (const { key, label } of fields) {
    const val = props?.[key];
    if (val == null || String(val).trim() === '') continue;

    const row = document.createElement('tr');
    row.innerHTML = `<td>${escapeHtml(label ?? key)}</td><td>${formatCellValue(val)}</td>`;
    tbody.appendChild(row);
  }

  if (!tbody.children.length) {
    tbody.innerHTML = `<tr><td colspan="2">No details available.</td></tr>`;
  }
}

function clearDetailAttachments(detailPane) {
  const hostId = detailPane?.detail?.attachments?.hostId;
  if (!hostId) return;

  const host = document.getElementById(hostId);
  if (host) host.innerHTML = '';
}

function startDetailAttachments(detailPane, objectId) {
  const hostId = detailPane?.detail?.attachments?.hostId;
  if (!hostId) return;

  // renderProjectAttachments writes into #project-attachments in your current utils.js.
  // If you later make that hostId-configurable, update utils.js accordingly.
  // For now: enforce hostId === 'project-attachments' to avoid mismatches.
  if (hostId !== 'project-attachments') {
    // Best-effort: clear & do nothing to avoid writing to wrong element.
    const host = document.getElementById(hostId);
    if (host) host.innerHTML = '';
    return;
  }

  renderProjectAttachments(objectId);
}

/* -----------------------------
   Back button (config-driven)
----------------------------- */

function setBackButtonTarget(detailPane) {
  // We still use the shared class name created by sidebarBuilder: .sidebar-back-button
  const backButton = document.querySelector(`#${detailPane.id} .sidebar-back-button`);
  if (!backButton) return;

  backButton.href = `#${lastOriginPaneId}`;
  backButton.onclick = (e) => {
    e.preventDefault();
    resetTableHighlights();
    window.location.hash = `#${lastOriginPaneId}`;
  };
}

/* -----------------------------
   Route handlers
----------------------------- */

async function handleProjectHash(map, sidebar, cfg) {
  const detailPane = getDetailPane(cfg);
  if (!detailPane) return;

  const myToken = ++projectRouteToken;

  const match = window.location.hash.match(/^#project-(\d+)$/);
  if (!match) return;

  const objectId = Number(match[1]);
  if (!Number.isFinite(objectId)) return;

  // Open detail pane immediately
  sidebar.open(detailPane.id);
  setBackButtonTarget(detailPane);

  // Attachments (optional)
  startDetailAttachments(detailPane, objectId);

  // Isolate this project (points)
  showOnlyProject(objectId);

  // Populate ASAP from REST fetch (works before cluster marker exists)
  try {
    const fields = Array.isArray(detailPane?.detail?.fields)
      ? detailPane.detail.fields.map((f) => f.key).filter(Boolean)
      : [];
    const featNow = await fetchProjectById(objectId, fields);
    if (myToken !== projectRouteToken) return;

    if (featNow) {
      fillDetailTableFromFeature(detailPane, featNow);

      highlightFeature(featNow);
      flyToFeature(map, featNow);

      const pn = featNow?.properties?.project_name;
      if (pn) showRelatedFeatures(pn, map, { fit: true });
    }
  } catch (_) {}

  // Then sync to marker feature when it’s ready (authoritative for clusters)
  const marker = await waitForMarker(objectId);
  if (myToken !== projectRouteToken) return;

  const feature = marker?.feature;
  if (!feature) return;

  fillDetailTableFromFeature(detailPane, feature);

  highlightFeature(feature);
  flyToFeature(map, feature);

  const pn = feature?.properties?.project_name;
  if (pn) showRelatedFeatures(pn, map, { fit: true });
}

function handlePaneHash(sidebar, paneId, cfg) {
  // cancel in-flight project work when switching to a pane route
  projectRouteToken++;

  const targetId = paneId || 'home';
  const pane = getPaneById(cfg, targetId);

  // If unknown pane, fall back to home if present
  const home = getPaneById(cfg, 'home');
  const resolvedPane = pane || home;
  if (!resolvedPane) return;

  sidebar.open(resolvedPane.id);

  // Track origin + last pane (origin is anything except detail)
  if (isOriginPaneId(resolvedPane.id, cfg)) {
    lastOriginPaneId = resolvedPane.id;
    lastPaneId = resolvedPane.id;
  }

  // Apply filter if pane defines where; else show all
  if (resolvedPane.where && projectsLayer?.setWhere) {
    projectsLayer.setWhere(resolvedPane.where);
  } else if (projectsLayer?.setWhere) {
    projectsLayer.setWhere('1=1');
  }

  // Clear related geometry when leaving project route
  resetRelatedFeatures();

  // Clear attachments when leaving detail pane
  const detailPane = getDetailPane(cfg);
  if (detailPane && resolvedPane.id !== detailPane.id) {
    clearDetailAttachments(detailPane);
  }
}

/* -----------------------------
   Setup
----------------------------- */

export function setupSidebarRouting(sidebar, map, sidebarConfig) {
  const cfg = Array.isArray(sidebarConfig) ? sidebarConfig : [];

  // Sidebar link clicks -> set hash
  document.querySelectorAll('.sidebar-pane-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const paneId = link.getAttribute('href')?.slice(1);
      if (paneId) window.location.hash = paneId;
    });
  });

  // Map point clicks -> project route
  projectsLayer?.on?.('click', (e) => {
    const objectId = getObjectIdFromEsriClick(e);
    if (!Number.isFinite(objectId)) return;

    const current = getHashId();
    const next = `project-${objectId}`;

    // Preserve origin if currently on a pane route
    if (isPaneHash(current, cfg)) {
      const pane = getPaneById(cfg, current);
      if (pane && pane.kind !== 'detail') {
        lastOriginPaneId = current;
        lastPaneId = current;
      }
    }

    // If already on this project, hashchange won't fire — refresh manually
    if (current === next) {
      const detailPane = getDetailPane(cfg);
      if (!detailPane) return;

      sidebar.open(detailPane.id);
      setBackButtonTarget(detailPane);

      startDetailAttachments(detailPane, objectId);

      const fields = Array.isArray(detailPane?.detail?.fields)
        ? detailPane.detail.fields.map((f) => f.key).filter(Boolean)
        : [];

      fetchProjectById(objectId, fields)
        .then((feat) => feat && fillDetailTableFromFeature(detailPane, feat))
        .catch(() => {});
      return;
    }

    window.location.hash = next;
  });

  const route = () => {
    const h = getHashId();

    if (!h) {
      handlePaneHash(sidebar, 'home', cfg);
      return;
    }

    if (isProjectHash(h)) {
      handleProjectHash(map, sidebar, cfg);
      return;
    }

    // Pane navigation: ensure we aren't stuck on single-OBJECTID filter
    resetProjectFilter();
    handlePaneHash(sidebar, h, cfg);
  };

  // Initial load
  route();

  // Listen for hash changes
  window.addEventListener('hashchange', route);

  // Expose last pane if you want it elsewhere
  window.__getLastPaneId = () => lastPaneId || 'home';
}

/**
 * External setter (used by list clicks)
 */
export function setLastOriginPane(paneId) {
  // This is called by sidebarBuilder when a list row is clicked
  // to keep the back button correct.
  if (typeof paneId === 'string' && paneId) {
    lastOriginPaneId = paneId;
    lastPaneId = paneId;
  }
}
