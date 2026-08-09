"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "@/hooks/useMap";
import { crearMarcadorEl } from "./crearMarcadorEl";
import { SelectorEstiloMapa } from "./SelectorEstiloMapa";
import type { ElementoEstado } from "@/types";

interface MapViewProps {
  elementos: ElementoEstado[];
  elementoSeleccionadoId: string | null;
  onSeleccionarElemento: (elemento: ElementoEstado) => void;
  onClickMapa?: (coords: { lat: number; lng: number }) => void;
}

const CONTAINER_ID = "edersa-map-container";

export function MapView({
  elementos,
  elementoSeleccionadoId,
  onSeleccionarElemento,
  onClickMapa,
}: MapViewProps) {
  const { map, mapListo, errorMapa, modoMapa, cambiarModoMapa } = useMap({
    containerId: CONTAINER_ID,
  });
  const marcadoresRef = useRef<Map<string, maplibregl.Marker>>(new Map());

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

  // Sincroniza los marcadores con la lista de elementos cada vez que cambia
  // (nuevo evento, filtro aplicado, reconexión, etc.). Reutiliza los
  // marcadores existentes en vez de recrearlos todos, para que el mapa
  // no "parpadee" en cada actualización realtime.
  useEffect(() => {
    if (!map || !mapListo) return;

    const idsActuales = new Set(elementos.map((e) => e.id));

    // eliminar marcadores de elementos que ya no están en la lista (filtrados)
    for (const [id, marker] of marcadoresRef.current) {
      if (!idsActuales.has(id)) {
        marker.remove();
        marcadoresRef.current.delete(id);
      }
    }

    for (const elemento of elementos) {
      const seleccionado = elemento.id === elementoSeleccionadoId;
      const existente = marcadoresRef.current.get(elemento.id);

      // maplibregl.Marker no permite reemplazar su elemento DOM en caliente
      // de forma confiable (guarda la referencia interna), así que ante
      // cualquier cambio de apariencia (estado, selección) se recrea el
      // marcador. Es barato: son decenas de elementos, no miles.
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

  // limpieza total al desmontar
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
