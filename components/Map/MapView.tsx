"use client";

import { useEffect } from "react";
import type { ElementoEstado } from "@/types";

type Props = {
  elementos: ElementoEstado[];
  elementoSeleccionadoId: string | null;
  onSeleccionarElemento: (el: ElementoEstado | null) => void;
  onClickMapa: (coords: { lat: number; lng: number }) => void;
};

export default function MapView({
  elementos,
  elementoSeleccionadoId,
  onSeleccionarElemento,
  onClickMapa,
}: Props) {
  useEffect(() => {
    // acá después podés inicializar Leaflet / Mapbox
  }, []);

  function handleClick() {
    // mock click mapa (después lo conectás al mapa real)
    onClickMapa({ lat: -40.8, lng: -63 });
  }

  return (
    <div className="w-full h-full bg-slate-900 relative">
      {/* SIMULACIÓN MAPA */}
      <div
        className="absolute inset-0 cursor-crosshair"
        onClick={handleClick}
      />

      {/* ELEMENTOS EN MAPA */}
      {elementos.map((el) => {
        const seleccionado = el.id === elementoSeleccionadoId;

        return (
          <div
            key={el.id}
            onClick={(e) => {
              e.stopPropagation();
              onSeleccionarElemento(el);
            }}
            className={`absolute px-2 py-1 text-xs rounded cursor-pointer ${
              seleccionado
                ? "bg-yellow-400 text-black"
                : "bg-blue-500 text-white"
            }`}
            style={{
              left: `${50 + Math.random() * 40}%`,
              top: `${50 + Math.random() * 40}%`,
            }}
          >
            {el.tipo}
          </div>
        );
      })}
    </div>
  );
}
