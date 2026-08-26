"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "@/hooks/useMap";
import { crearMarcadorEl } from "./crearMarcadorEl";
import { SelectorEstiloMapa } from "./SelectorEstiloMapa";
import { dibujarTramos, dibujarPreviewTrazado } from "@/lib/tramosLayer";
import type { ElementoEstado, TramoLinea } from "@/types";

interface MapViewProps {
  elementos: ElementoEstado[];
  elementoSeleccionadoId: string | null;
  onSeleccionarElemento: (elemento: ElementoEstado) => void;
  onClickMapa?: (coords: { lat: number; lng: number }) => void;
  tramos?: TramoLinea[];
  puntosTrazado?: [number, number][];
}

const CONTAINER_ID = "edersa-map-container";

export function MapView({
  elementos,
  elementoSeleccionadoId,
  onSeleccionarElemento,
  onClickMapa,
  tramos = [],
  puntosTrazado = [],
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

  // Dibuja/actualiza los tramos guardados (MT siempre, BT según zoom).
  useEffect(() => {
    tramosRef.current = tramos;
    if (!map || !mapListo) return;
    dibujarTramos(map, tramos);
  }, [map, mapListo, tramos]);

  // Dibuja/actualiza la línea "en construcción" del modo trazado.
  useEffect(() => {
    puntosTrazadoRef.current = puntosTrazado;
    if (!map || !mapListo) return;
    dibujarPreviewTrazado(map, puntosTrazado);
  }, [map, mapListo, puntosTrazado]);

  // IMPORTANTE: cambiar de estilo (calles/satélite/etc) borra las fuentes
  // y capas custom que agregamos (a diferencia de los Marker, que son DOM
  // aparte y sobreviven solos). Por eso hay que re-agregar tramos y
  // preview cada vez que termina de cargar un estilo nuevo.
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
