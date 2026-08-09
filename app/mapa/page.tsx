"use client";

import { useMemo, useState, useEffect } from "react";

// 🔥 FIX ACA (SIN {})
import MapView from "@/components/Map/MapView";

import { FilterBar } from "@/components/Panel/FilterBar";
import { EventPanel } from "@/components/Panel/EventPanel";
import { SyncStatus } from "@/components/UI/SyncStatus";
import { IdentificacionOperario } from "@/components/UI/IdentificacionOperario";
import { ElementoForm } from "@/components/Transformadores/ElementoForm";
import { useElementosEstado } from "@/hooks/useElementosEstado";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useUsuarioLocal } from "@/hooks/useUsuarioLocal";
import { obtenerAlimentadores } from "@/services/elementosService";

import type { Alimentador, ElementoEstado, TipoElemento } from "@/types";

const TODOS_LOS_TIPOS: TipoElemento[] = [
  "reconectador",
  "seccionador",
  "cuchilla",
  "omnirouter",
  "transformador",
  "capacitor",
  "central_termica",
  "barra",
  "generador",
];

export default function MapaPage() {
  const { usuario, setUsuario, cargado } = useUsuarioLocal();
  const { elementos, cargando, error, recargar } = useElementosEstado();
  const { online, pendientes, sincronizando } = useOfflineSync();

  const [alimentadores, setAlimentadores] = useState<Alimentador[]>([]);
  const [tiposActivos, setTiposActivos] = useState<Set<TipoElemento>>(
    new Set(TODOS_LOS_TIPOS)
  );
  const [alimentadorId, setAlimentadorId] = useState<string | "todos">("todos");
  const [elementoSeleccionado, setElementoSeleccionado] =
    useState<ElementoEstado | null>(null);

  const [modoAltaElemento, setModoAltaElemento] = useState(false);
  const [ubicacionNuevoElemento, setUbicacionNuevoElemento] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mostrarFormElemento, setMostrarFormElemento] = useState(false);

  useEffect(() => {
    obtenerAlimentadores()
      .then((data) => setAlimentadores(data as Alimentador[]))
      .catch(() => {
        // modo offline, ignoramos error
      });
  }, []);

  const elementosFiltrados = useMemo(() => {
    return elementos.filter((el) => {
      if (!tiposActivos.has(el.tipo)) return false;
      if (alimentadorId !== "todos" && el.alimentador_id !== alimentadorId)
        return false;
      return true;
    });
  }, [elementos, tiposActivos, alimentadorId]);

  function toggleTipo(tipo: TipoElemento) {
    setTiposActivos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }

  function handleClickMapa(coords: { lat: number; lng: number }) {
    if (!modoAltaElemento) return;
    setUbicacionNuevoElemento(coords);
    setMostrarFormElemento(true);
    setModoAltaElemento(false);
  }

  if (!cargado) return null;

  if (!usuario) {
    return <IdentificacionOperario onIdentificado={setUsuario} />;
  }

  return (
    <main className="h-dvh w-full relative overflow-hidden">
      <MapView
        elementos={elementosFiltrados}
        elementoSeleccionadoId={elementoSeleccionado?.id ?? null}
        onSeleccionarElemento={setElementoSeleccionado}
        onClickMapa={handleClickMapa}
      />

      <FilterBar
        tiposActivos={tiposActivos}
        onToggleTipo={toggleTipo}
        alimentadores={alimentadores}
        alimentadorId={alimentadorId}
        onCambiarAlimentador={setAlimentadorId}
      />

      {(cargando || error) && (
        <div className="fixed top-24 inset-x-4 z-20 bg-panel-raised border border-panel-border rounded-lg p-3 text-sm text-slate-300">
          {cargando ? "Cargando red…" : error}
        </div>
      )}

      <button
        onClick={() => setModoAltaElemento((v) => !v)}
        className={`fixed bottom-4 left-4 z-20 h-touch px-4 rounded-full font-semibold shadow-lg transition ${
          modoAltaElemento
            ? "bg-acento text-panel"
            : "bg-panel-raised border border-panel-border text-slate-200"
        }`}
      >
        {modoAltaElemento ? "Tocá el mapa…" : "+ Elemento"}
      </button>

      <SyncStatus
        online={online}
        pendientes={pendientes}
        sincronizando={sincronizando}
      />

      {elementoSeleccionado && (
        <EventPanel
          elemento={elementoSeleccionado}
          usuario={usuario}
          alimentadores={alimentadores}
          onCerrarPanel={() => setElementoSeleccionado(null)}
          onEventoRegistrado={() => recargar()}
        />
      )}

      {mostrarFormElemento && (
        <ElementoForm
          alimentadores={alimentadores}
          ubicacionPreseleccionada={ubicacionNuevoElemento}
          onCerrar={() => {
            setMostrarFormElemento(false);
            setUbicacionNuevoElemento(null);
          }}
          onCreado={() => recargar()}
        />
      )}
    </main>
  );
}
