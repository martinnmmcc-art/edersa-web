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
  // El padre decide qué hacer con el toque a un elemento — puede ser
  // "abrir su panel" (modo normal), "agregar este punto al trazado"
  // (modo trazado) o "fijarlo como origen/destino" (modo conectar).
  onTocarElemento: (elemento: ElementoEstado) => void;
  onClickMapa?: (coords: { lat: number; lng: number; radioSnapMetros: number }) => void;
  tramos?: TramoLinea[];
  puntosTrazado?: [number, number][];
  puntosConectados?: boolean[];
  onSeleccionarTramo?: (tramo: TramoSeleccionado) => void;
  elementosEnergizadosIds?: Set<string>;
  // Cuando hay un modo especial activo (trazado, conectar, alta de
  // elemento), tocar una línea existente tiene que darle al padre la
  // coordenada real del toque (para poder empalmar ahí), no abrir la
  // ficha de esa línea.
  modoEspecialActivo?: boolean;
}

const CONTAINER_ID = "edersa-map-container";
const CAPAS_HITBOX = [`${CAPA_MT}-hitbox`, `${CAPA_BT}-hitbox`];

export function MapView({
  elementos,
  elementoSeleccionadoId,
  onTocarElemento,
  onClickMapa,
  tramos = [],
  puntosTrazado = [],
  puntosConectados = [],
  onSeleccionarTramo,
  elementosEnergizadosIds,
  modoEspecialActivo = false,
}: MapViewProps) {
  const { map, mapListo, errorMapa, modoMapa, cambiarModoMapa } = useMap({
    containerId: CONTAINER_ID,
  });
  const marcadoresRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const tramosRef = useRef<TramoLinea[]>([]);
  const puntosTrazadoRef = useRef<[number, number][]>([]);
  const puntosConectadosRef = useRef<boolean[]>([]);
  const onSeleccionarTramoRef = useRef(onSeleccionarTramo);
  const onClickMapaRef = useRef(onClickMapa);
  const modoEspecialActivoRef = useRef(modoEspecialActivo);

  // Refs para los callbacks: así el listener de click se registra UNA
  // sola vez (no cada vez que el padre re-renderiza y pasa una función
  // nueva) y siempre usa la versión más reciente igual.
  useEffect(() => {
    onSeleccionarTramoRef.current = onSeleccionarTramo;
    onClickMapaRef.current = onClickMapa;
    modoEspecialActivoRef.current = modoEspecialActivo;
  }, [onSeleccionarTramo, onClickMapa, modoEspecialActivo]);

  // Un único listener de click para todo el mapa. En modo normal,
  // tocar una línea abre su ficha. En un modo especial (trazado,
  // conectar, alta), el toque SIEMPRE se manda como coordenada cruda al
  // padre — incluso si cayó justo sobre una línea — porque ahí lo que
  // se quiere es arrancar/continuar un trazado desde ese punto, no ver
  // la info de la línea existente. Antes esto se comía el toque cuando
  // caía sobre una línea, y por eso dos trazados nunca se unían.
  useEffect(() => {
    if (!map || !mapListo) return;

    const handler = (e: maplibregl.MapMouseEvent) => {
      if (!modoEspecialActivoRef.current) {
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
      }

      onClickMapaRef.current?.({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
        // Radio de "pegado" pensado en píxeles de pantalla (~26px, el
        // ancho aproximado de un dedo), no en metros fijos — así el
        // margen de tacto es siempre parecido sin importar el zoom.
        // 18px había quedado demasiado ajustado (casi imposible de
        // tocar a propósito); para el caso de líneas paralelas muy
        // cerca, usá el interruptor "🧲 Pegado" para apagarlo en vez de
        // depender de un radio microscópico.
        radioSnapMetros:
          (156543.03392 * Math.cos((e.lngLat.lat * Math.PI) / 180)) /
          Math.pow(2, map.getZoom()) *
          26,
      });
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

      const el = crearMarcadorEl(
        elemento,
        seleccionado,
        elementosEnergizadosIds ? elementosEnergizadosIds.has(elemento.id) : true
      );
      el.onclick = (ev) => {
        // Evita que el toque sobre el marcador también le llegue al mapa
        // (que lo interpretaría además como un click sobre el mapa
        // vacío). El padre decide qué hacer con este toque según el
        // modo activo — puede ser justamente "agregar este punto al
        // trazado", así que YA NO se ignora en esos modos.
        ev.stopPropagation();
        onTocarElemento(elemento);
      };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([elemento.lng, elemento.lat])
        .addTo(map);

      marcadoresRef.current.set(elemento.id, marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mapListo, elementos, elementoSeleccionadoId, elementosEnergizadosIds]);

  useEffect(() => {
    tramosRef.current = tramos;
    if (!map || !mapListo) return;
    dibujarTramos(map, tramos);
  }, [map, mapListo, tramos]);

  useEffect(() => {
    puntosTrazadoRef.current = puntosTrazado;
    puntosConectadosRef.current = puntosConectados;
    if (!map || !mapListo) return;
    dibujarPreviewTrazado(map, puntosTrazado, puntosConectados);
  }, [map, mapListo, puntosTrazado, puntosConectados]);

  useEffect(() => {
    if (!map) return;
    const reagregar = () => {
      dibujarTramos(map, tramosRef.current);
      dibujarPreviewTrazado(map, puntosTrazadoRef.current, puntosConectadosRef.current);
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
