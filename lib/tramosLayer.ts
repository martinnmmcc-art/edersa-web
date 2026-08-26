import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import type { TramoLinea } from "@/types";

const FUENTE_TRAMOS = "tramos";
export const CAPA_MT = "tramos-mt";
export const CAPA_BT = "tramos-bt";

const FUENTE_PREVIEW_LINEA = "trazado-preview-linea-fuente";
const CAPA_PREVIEW_LINEA = "trazado-preview-linea";
const FUENTE_PREVIEW_PUNTOS = "trazado-preview-puntos-fuente";
const CAPA_PREVIEW_PUNTOS = "trazado-preview-puntos";
const CAPA_PREVIEW_PUNTOS_NUM = "trazado-preview-puntos-numero";

const ZOOM_INICIO_BT = 15;
const ZOOM_BT_TOTALMENTE_VISIBLE = 16.5;

function tramosAGeoJSON(tramos: TramoLinea[]) {
  return {
    type: "FeatureCollection" as const,
    features: tramos.map((t) => ({
      type: "Feature" as const,
      properties: {
        id: t.id,
        nombre: t.nombre ?? "",
        tension: t.tension,
        alimentador_id: t.alimentador_id ?? "",
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
      "line-width": 4,
    },
  });

  // Área invisible más ancha debajo de MT, solo para que sea más fácil
  // tocar la línea con el dedo (4px reales es muy angosto para eso).
  map.addLayer(
    {
      id: `${CAPA_MT}-hitbox`,
      type: "line",
      source: FUENTE_TRAMOS,
      filter: ["==", ["get", "tension"], "MT"],
      paint: { "line-color": "#000000", "line-width": 22, "line-opacity": 0 },
    },
    CAPA_MT
  );

  // BT: oculta hasta acercarse y aparece gradualmente.
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

  map.addLayer(
    {
      id: `${CAPA_BT}-hitbox`,
      type: "line",
      source: FUENTE_TRAMOS,
      filter: ["==", ["get", "tension"], "BT"],
      minzoom: ZOOM_INICIO_BT,
      paint: { "line-color": "#000000", "line-width": 18, "line-opacity": 0 },
    },
    CAPA_BT
  );
}

/**
 * Dibuja la línea "en construcción" mientras se está trazando, MÁS los
 * puntos ya tocados como círculos numerados — así se ve exactamente
 * dónde cayó cada tap, no solo la línea entre el 2do punto en adelante.
 */
export function dibujarPreviewTrazado(map: MLMap, puntos: [number, number][]) {
  const dataLinea = {
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

  const fuenteLinea = map.getSource(FUENTE_PREVIEW_LINEA) as GeoJSONSource | undefined;
  if (fuenteLinea) {
    fuenteLinea.setData(dataLinea as any);
  } else {
    map.addSource(FUENTE_PREVIEW_LINEA, { type: "geojson", data: dataLinea as any });
    map.addLayer({
      id: CAPA_PREVIEW_LINEA,
      type: "line",
      source: FUENTE_PREVIEW_LINEA,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffb100", "line-width": 3, "line-dasharray": [1, 1] },
    });
  }

  const dataPuntos = {
    type: "FeatureCollection" as const,
    features: puntos.map((p, i) => ({
      type: "Feature" as const,
      properties: { numero: String(i + 1) },
      geometry: { type: "Point" as const, coordinates: p },
    })),
  };

  const fuentePuntos = map.getSource(FUENTE_PREVIEW_PUNTOS) as GeoJSONSource | undefined;
  if (fuentePuntos) {
    fuentePuntos.setData(dataPuntos as any);
    return;
  }

  map.addSource(FUENTE_PREVIEW_PUNTOS, { type: "geojson", data: dataPuntos as any });
  map.addLayer({
    id: CAPA_PREVIEW_PUNTOS,
    type: "circle",
    source: FUENTE_PREVIEW_PUNTOS,
    paint: {
      "circle-radius": 9,
      "circle-color": "#ffb100",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#0b0f14",
    },
  });
  map.addLayer({
    id: CAPA_PREVIEW_PUNTOS_NUM,
    type: "symbol",
    source: FUENTE_PREVIEW_PUNTOS,
    layout: {
      "text-field": ["get", "numero"],
      "text-size": 11,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#0b0f14" },
  });
}
