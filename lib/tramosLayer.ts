import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import type { TramoLinea } from "@/types";

const FUENTE_TRAMOS = "tramos";
const CAPA_MT = "tramos-mt";
const CAPA_BT = "tramos-bt";
const FUENTE_PREVIEW = "trazado-preview";
const CAPA_PREVIEW = "trazado-preview-linea";

// A partir de qué zoom empieza a aparecer la BT (antes de eso, oculta).
// El "interpolate" hace que aparezca de forma gradual entre estos dos
// niveles en vez de un corte abrupto.
const ZOOM_INICIO_BT = 15;
const ZOOM_BT_TOTALMENTE_VISIBLE = 16.5;

function tramosAGeoJSON(tramos: TramoLinea[]) {
  return {
    type: "FeatureCollection" as const,
    features: tramos.map((t) => ({
      type: "Feature" as const,
      properties: {
        tension: t.tension,
        color: t.color || (t.tension === "MT" ? "#facc15" : "#38bdf8"),
      },
      geometry: { type: "LineString" as const, coordinates: t.puntos },
    })),
  };
}

/** Agrega (o actualiza si ya existe) la capa de tramos guardados. */
export function dibujarTramos(map: MLMap, tramos: TramoLinea[]) {
  const data = tramosAGeoJSON(tramos);
  const fuente = map.getSource(FUENTE_TRAMOS) as GeoJSONSource | undefined;

  if (fuente) {
    fuente.setData(data as any);
    return;
  }

  map.addSource(FUENTE_TRAMOS, { type: "geojson", data: data as any });

  // MT: siempre visible, línea llena y gruesa (es la troncal).
  map.addLayer({
    id: CAPA_MT,
    type: "line",
    source: FUENTE_TRAMOS,
    filter: ["==", ["get", "tension"], "MT"],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 3,
    },
  });

  // BT: oculta hasta acercarse (ZOOM_INICIO_BT) y aparece gradualmente.
  // Es la red de detalle: mostrarla siempre satura el mapa en vista
  // general y no aporta nada hasta que se está mirando una cuadra.
  map.addLayer({
    id: CAPA_BT,
    type: "line",
    source: FUENTE_TRAMOS,
    filter: ["==", ["get", "tension"], "BT"],
    minzoom: ZOOM_INICIO_BT,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": 2,
      "line-dasharray": [2, 1.5],
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        ZOOM_INICIO_BT,
        0,
        ZOOM_BT_TOTALMENTE_VISIBLE,
        1,
      ],
    },
  });
}

/** Dibuja la línea "en construcción" mientras se está trazando (modo trazado). */
export function dibujarPreviewTrazado(map: MLMap, puntos: [number, number][]) {
  const data = {
    type: "FeatureCollection" as const,
    features:
      puntos.length >= 2
        ? [
            {
              type: "Feature" as const,
              properties: {},
              geometry: { type: "LineString" as const, coordinates: puntos },
            },
          ]
        : [],
  };

  const fuente = map.getSource(FUENTE_PREVIEW) as GeoJSONSource | undefined;
  if (fuente) {
    fuente.setData(data as any);
    return;
  }

  map.addSource(FUENTE_PREVIEW, { type: "geojson", data: data as any });
  map.addLayer({
    id: CAPA_PREVIEW,
    type: "line",
    source: FUENTE_PREVIEW,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#ffb100",
      "line-width": 3,
      "line-dasharray": [1, 1],
    },
  });
}
