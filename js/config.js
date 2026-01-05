// js/config.js


export const SERVICES = {
  // Clustered points layer (FeatureServer layer 1)
  projectsPoints:
    'https://services3.arcgis.com/eUyz58xtA1naNJoX/ArcGIS/rest/services/Current_Projects_Data_(Public)/FeatureServer/1',

  // Related geometry layers
  projectsLines:
    'https://services3.arcgis.com/eUyz58xtA1naNJoX/ArcGIS/rest/services/Current_Projects_Data_(Public)/FeatureServer/2',
  projectsPolygons:
    'https://services3.arcgis.com/eUyz58xtA1naNJoX/ArcGIS/rest/services/Current_Projects_Data_(Public)/FeatureServer/3'
};

export const MAP_CONFIG = {
  center: [45.0566, -92.8085],
  zoom: 14,
  scrollWheelZoom: true
};

export const BASEMAPS = {
  carto: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: { maxZoom: 19, attribution: '&copy; Carto' },
    label: 'Vector'
  },
  satellite: {
    url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 20, attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>' },
    label: 'Satellite'
  }
};

export const THEME = {
  accent: '#cc4529',
  boundary: '#111'
};

// Only these fields appear in Project Info.
export const PROJECT_INFO_FIELDS = [
  { key: 'project_name', label: 'Project Name' },
  { key: 'project_type', label: 'Project Type' },
  { key: 'more_information', label: 'More Information' }
];

export const BOUNDARY = {
  url: 'data/jurisdiction_boundary.geojson',
  style: {
    color: THEME.boundary,
    weight: 3,
    opacity: 1,
    fillOpacity: 0
  }
};

