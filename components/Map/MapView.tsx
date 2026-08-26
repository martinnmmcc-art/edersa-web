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

  useEffect(() => {
    if (!map || !mapListo || !onClickMapa) return;
    const handler = (e: maplibregl.MapMouseEvent) => {
      onClickMapa({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, mapListo, onClickMapa]);

  // Click sobre un tramo (línea MT/BT) -> avisa al padre cuál se tocó.
  // Se engancha sobre los "hitbox" (más anchos, invisibles) para que sea
  // fácil tocarlo con el dedo; el mapa de todas formas también dispara
  // el click genérico de arriba, así que en el padre hay que ignorar
  // ese click cuando cae sobre un tramo (se corta la propagación acá).
  useEffect(() => {
    if (!map || !mapListo || !onSeleccionarTramo) return;

    const capas = [`${CAPA_MT}-hitbox`, `${CAPA_BT}-hitbox`];

    const handler = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      e.preventDefault();
      onSeleccionarTramo({
        id: String(feature.properties?.id ?? ""),
        nombre: String(feature.properties?.nombre ?? ""),
        tension: String(feature.properties?.tension ?? "MT"),
        alimentador_id: String(feature.properties?.alimentador_id ?? ""),
        alimentador_id_b: String(feature.properties?.alimentador_id_b ?? ""),
        elemento_frontera_id: String(feature.properties?.elemento_frontera_id ?? ""),
      });
    };

    const entrar = () => (map.getCanvas().style.cursor = "pointer");
    const salir = () => (map.getCanvas().style.cursor = "");

    capas.forEach((c) => {
      map.on("click", c, handler);
      map.on("mouseenter", c, entrar);
      map.on("mouseleave", c, salir);
    });

    return () => {
      capas.forEach((c) => {
        map.off("click", c, handler);
        map.off("mouseenter", c, entrar);
        map.off("mouseleave", c, salir);
      });
    };
  }, [map, mapListo, onSeleccionarTramo]);

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
      el.onclick = () => onSeleccionarElemento(elemento);

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
