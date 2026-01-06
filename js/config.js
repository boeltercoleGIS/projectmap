// js/config.js
// Central app configuration: services, map defaults, basemaps, theme, and layer symbology.

export const SERVICES = Object.freeze({
  // Clustered points layer (FeatureServer layer 1)
  projectsPoints:
    'https://services3.arcgis.com/eUyz58xtA1naNJoX/ArcGIS/rest/services/Current_Projects_Data_(Public)/FeatureServer/1',

  // Related geometry layers
  projectsLines:
    'https://services3.arcgis.com/eUyz58xtA1naNJoX/ArcGIS/rest/services/Current_Projects_Data_(Public)/FeatureServer/2',
  projectsPolygons:
    'https://services3.arcgis.com/eUyz58xtA1naNJoX/ArcGIS/rest/services/Current_Projects_Data_(Public)/FeatureServer/3'
});

export const MAP_CONFIG = Object.freeze({
  center: [45.0566, -92.8085],
  zoom: 12,
  scrollWheelZoom: true
});

export const BASEMAPS = Object.freeze({
  carto: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: { maxZoom: 19, attribution: '&copy; Carto' },
    label: 'Vector'
  },
  satellite: {
    // keep {r} for retina support (plugin/tooling may request it)
    url: 'https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg',
    options: {
      maxZoom: 20,
      attribution:
        '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    label: 'Satellite'
  }
});

export const THEME = Object.freeze({
  accent: '#CC4529',
  boundary: '#111'
});

// Centralized geometry symbology (lines + polygons)
export const GEOMETRY_STYLES = Object.freeze({
  lines: Object.freeze({
    color: '#CC4529',
    weight: 6,
    opacity: 0.75
  }),

  polygons: Object.freeze({
    color: '#CC4529',
    weight: 3,
    opacity: 0.9,
    fillColor: '#CC4529',
    fillOpacity: 0.35
  })
});

// Only these fields appear in Project Info.
export const PROJECT_INFO_FIELDS = Object.freeze([
  { key: 'project_name', label: 'Project Name' },
  { key: 'project_type', label: 'Project Type' },
  { key: 'more_information', label: 'More Information' }
]);

export const BOUNDARY = Object.freeze({
  url: 'data/jurisdiction_boundary.geojson',
  style: Object.freeze({
    color: THEME.boundary,
    weight: 3,
    opacity: 1,
    fillOpacity: 0
  })
});
