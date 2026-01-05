// js/layers.js
import { SERVICES, BASEMAPS, THEME } from './config.js';
import { safeSqlString } from './ui/format.js';

/* -----------------------------------
   Base Maps
----------------------------------- */
export const cartoLayer = L.tileLayer(BASEMAPS.carto.url, BASEMAPS.carto.options);

export const satelliteLayer = L.tileLayer(BASEMAPS.satellite.url, BASEMAPS.satellite.options);

/* -----------------------------------
   Marker Lookup for Cluster
----------------------------------- */
export const markerLookup = {};

/* -----------------------------------
   Clustered Projects Layer (Points)
----------------------------------- */
export const projectsLayer = L.esri.Cluster.featureLayer({
  url: SERVICES.projectsPoints,
  disableClusteringAtZoom: 17,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: true,
  polygonOptions: {
    color: THEME.accent,
    weight: 2,
    fillOpacity: 0.5
  },

  pointToLayer: (feature, latlng) => {
    if (!latlng) return L.marker([0, 0]);
    return L.marker(latlng, { riseOnHover: true });
  },

  onEachFeature: (feature, layer) => {
    if (!layer || !feature?.properties) return;

    const props = feature.properties;
    layer.projectProps = props;

    if (props.OBJECTID != null) markerLookup[props.OBJECTID] = layer;
  }
});

projectsLayer.on('createfeature', (e) => {
  const f = e?.feature;
  const layer = e?.layer;
  const id = f?.properties?.OBJECTID;
  if (id != null && layer) markerLookup[id] = layer;
});

/* -----------------------------------
   Lines & Polygons (Hidden initially)
----------------------------------- */
export const linesLayer = L.esri.featureLayer({
  url: SERVICES.projectsLines,
  style: { color: THEME.accent, weight: 6, opacity: 0.6 },
  useCors: true,
  where: '1=0',
  simplifyFactor: 0,
  precision: 5
});

export const polygonsLayer = L.esri.featureLayer({
  url: SERVICES.projectsPolygons,
  style: { color: THEME.accent, weight: 2, fillOpacity: 0.3 },
  useCors: true,
  where: '1=0',
  simplifyFactor: 0,
  precision: 5
});

/* -----------------------------------
   Jurisdiction Boundary (GeoJSON)
----------------------------------- */
export async function loadJurisdictionBoundary(
  url,
  { color = '#111', weight = 3, opacity = 1, fillOpacity = 0, dashArray = null } = {}
) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load boundary GeoJSON: ${res.status} ${res.statusText}`);
  const geojson = await res.json();

  return L.geoJSON(geojson, {
    style: () => ({
      color,
      weight,
      opacity,
      fillOpacity,
      ...(dashArray ? { dashArray } : {})
    }),
    interactive: false
  });
}

/* -----------------------------------
   Filtering Functions (optional helpers)
----------------------------------- */
export function filterProjectsByDepartment(projectType) {
  if (!projectType) return;
  const safe = safeSqlString(projectType);
  projectsLayer.setWhere(`project_type = '${safe}'`);
}

export function resetProjectFilter() {
  projectsLayer.setWhere('1=1');
}
