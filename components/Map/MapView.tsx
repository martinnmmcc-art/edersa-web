"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "@/hooks/useMap";
import { crearMarcadorEl } from "./crearMarcadorEl";
import { SelectorEstiloMapa } from "./SelectorEstiloMapa";
import { dibujarTramos, dibujarPreviewTrazado, CAPA_MT, CAPA_BT } from "@/lib/tramosLayer";
import type { TramoSeleccionado } from "./TramoInfoPanel";
import type { ElementoEstado, TramoLinea } from "@/types";

interface MapViewProps {
  elementos: ElementoEstado[];
  elementoSeleccionadoId: string | null;
  onSeleccionarElemento: (elemento: ElementoEstado) => void;
  onClickMapa?: (coords: { lat: number; lng: number }) => void;
  tramos?: TramoLinea[];
  puntosTrazado?: [number, number][];
  onSeleccionarTramo?: (tramo: TramoSeleccionado) => void;
}

const CONTAINER_ID = "edersa-map-container";
const CAPAS_HITBOX = [`${CAPA_MT}-hitbox`, `${CAPA_BT}-hitbox`];

export function MapView({
  elementos,
  elementoSeleccionadoId,
  onSeleccionarElemento,
  onClickMapa,
  tramos = [],
  puntosTrazado = [],
  onSeleccionarTramo,
}: MapViewProps) {
  const { map, mapListo, errorMapa, modoMapa, cambiarModoMapa } = useMap({
    containerId: CONTAINER_ID,
  });
  const marcadoresRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const tramosRef = useRef<TramoLinea[]>([]);
  const puntosTrazadoRef = useRef<[number, number][]>([]);
  const onSeleccionarTramoRef = useRef(onSeleccionarTramo);
  const onClickMapaRef = useRef(onClickMapa);

  // Refs para los callbacks: así el listener de click se registra UNA
  // sola vez (no cada vez que el padre re-renderiza y pasa una función
  // nueva) y siempre usa la versión más reciente igual.
  useEffect(() => {
    onSeleccionarTramoRef.current = onSeleccionarTramo;
    onClickMapaRef.current = onClickMapa;
  }, [onSeleccionarTramo, onClickMapa]);

  // Un único listener de click para todo el mapa: primero pregunta si el
  // toque cayó sobre un tramo (solo si esas capas ya existen — pedirle a
  // MapLibre features de una capa que no existe todavía tira una
  // excepción real, no un error controlado, y eso es lo que rompía la
  // app) y si no, lo trata como un click genérico sobre el mapa.
  useEffect(() => {
    if (!map || !mapListo) return;

    const handler = (e: maplibregl.MapMouseEvent) => {
      const capasListas = CAPAS_HITBOX.filter((c) => map.getLayer(c));

      if (capasListas.length > 0 && onSeleccionarTramoRef.current) {
        let features: maplibregl.MapGeoJSONFeature[] = [];
        try {
          features = map.queryRenderedFeatures(e.point, { layers: capasListas });
        } catch {
          features = [];
        }
        const feature = features[0];
        if (feature) {
          onSeleccionarTramoRef.current({
            id: String(feature.properties?.id ?? ""),
            nombre: String(feature.properties?.nombre ?? ""),
            tension: String(feature.properties?.tension ?? "MT"),
            alimentador_id: String(feature.properties?.alimentador_id ?? ""),
            alimentador_id_b: String(feature.properties?.alimentador_id_b ?? ""),
            elemento_frontera_id: String(feature.properties?.elemento_frontera_id ?? ""),
          });
          return;
        }
      }

      onClickMapaRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };

    const moverMouse = (e: maplibregl.MapMouseEvent) => {
      const capasListas = CAPAS_HITBOX.filter((c) => map.getLayer(c));
      if (capasListas.length === 0) {
        map.getCanvas().style.cursor = "";
        return;
      }
      let hay = false;
      try {
        hay = map.queryRenderedFeatures(e.point, { layers: capasListas }).length > 0;
      } catch {
        hay = false;
      }
      map.getCanvas().style.cursor = hay ? "pointer" : "";
    };

    map.on("click", handler);
    map.on("mousemove", moverMouse);
    return () => {
      map.off("click", handler);
      map.off("mousemove", moverMouse);
    };
  }, [map, mapListo]);

  // Sincroniza los marcadores con la lista de elementos.
  useEffect(() => {
    if (!map || !mapListo) return;

    const idsActuales = new Set(elementos.map((e) => e.id));

    for (const [id, marker] of marcadoresRef.current) {
      if (!idsActuales.has(id)) {
        marker.remove();
        marcadoresRef.current.delete(id);
      }
    }

    for (const elemento of elementos) {
      const seleccionado = elemento.id === elementoSeleccionadoId;
      const existente = marcadoresRef.current.get(elemento.id);

      if (existente) {
        existente.remove();
        marcadoresRef.current.delete(elemento.id);
      }

      const el = crearMarcadorEl(elemento, seleccionado);
      el.onclick = (ev) => {
        // Evita que el toque sobre el marcador también le llegue al mapa
        // (que en modo trazado/alta interpretaría el mismo toque como un
        // click sobre el mapa vacío).
        ev.stopPropagation();
        onSeleccionarElemento(elemento);
      };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([elemento.lng, elemento.lat])
        .addTo(map);

      marcadoresRef.current.set(elemento.id, marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapListo, elementos, elementoSeleccionadoId]);

  useEffect(() => {
    tramosRef.current = tramos;
    if (!map || !mapListo) return;
    dibujarTramos(map, tramos);
  }, [map, mapListo, tramos]);

  useEffect(() => {
    puntosTrazadoRef.current = puntosTrazado;
    if (!map || !mapListo) return;
    dibujarPreviewTrazado(map, puntosTrazado);
  }, [map, mapListo, puntosTrazado]);

  useEffect(() => {
    if (!map) return;
    const reagregar = () => {
      dibujarTramos(map, tramosRef.current);
      dibujarPreviewTrazado(map, puntosTrazadoRef.current);
    };
    map.on("style.load", reagregar);
    return () => {
      map.off("style.load", reagregar);
    };
  }, [map]);

  useEffect(() => {
    return () => {
      marcadoresRef.current.forEach((m) => m.remove());
      marcadoresRef.current.clear();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div id={CONTAINER_ID} className="w-full h-full" />

      {mapListo && (
        <SelectorEstiloMapa modoActual={modoMapa} onCambiar={cambiarModoMapa} />
      )}

      {errorMapa && (
        <div className="absolute inset-x-4 top-4 bg-red-900/90 border border-red-500 text-red-100 rounded-lg p-3 text-sm">
          {errorMapa}
        </div>
      )}
      {!mapListo && !errorMapa && (
        <div className="absolute inset-0 flex items-center justify-center bg-panel">
          <p className="text-slate-400 font-display text-xl tracking-wide">
            Cargando mapa…
          </p>
        </div>
      )}
    </div>
  );
}
