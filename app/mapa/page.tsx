"use client";

import { useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/Map/MapView";
import { FilterBar } from "@/components/Panel/FilterBar";
import { EventPanel } from "@/components/Panel/EventPanel";
import { SyncStatus } from "@/components/UI/SyncStatus";
import { IdentificacionOperario } from "@/components/UI/IdentificacionOperario";
import { ElementoForm } from "@/components/Transformadores/ElementoForm";
import { TramoForm } from "@/components/Map/TramoForm";
import { TramoInfoPanel, type TramoSeleccionado } from "@/components/Map/TramoInfoPanel";
import { AlertasPanel } from "@/components/Panel/AlertasPanel";
import { HistorialPanel } from "@/components/Panel/HistorialPanel";
import { useElementosEstado } from "@/hooks/useElementosEstado";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useUsuarioLocal } from "@/hooks/useUsuarioLocal";
import { useTramos } from "@/hooks/useTramos";
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
  const { tramos, recargar: recargarTramos } = useTramos();

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

  // --- Modo trazado de línea (MT/BT) ---
  const [modoTrazado, setModoTrazado] = useState(false);
  const [puntosTrazado, setPuntosTrazado] = useState<[number, number][]>([]);
  const [mostrarFormTramo, setMostrarFormTramo] = useState(false);

  // --- Tramo tocado en el mapa (para ver/editar su alimentador) ---
  const [tramoSeleccionado, setTramoSeleccionado] = useState<TramoSeleccionado | null>(
    null
  );

  useEffect(() => {
    obtenerAlimentadores()
      .then((data) => setAlimentadores(data as Alimentador[]))
      .catch(() => {
        /* si falla (ej. offline), simplemente no se muestran filtros por alimentador */
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
    if (modoAltaElemento) {
      setUbicacionNuevoElemento(coords);
      setMostrarFormElemento(true);
      setModoAltaElemento(false);
      return;
    }
    if (modoTrazado) {
      setPuntosTrazado((prev) => [...prev, [coords.lng, coords.lat]]);
    }
  }

  // Si estás en modo alta/trazado y tocás justo sobre un tramo existente,
  // priorizamos la acción del modo activo (agregar punto / ubicar
  // elemento) en vez de abrir la info del tramo — evita el conflicto de
  // que se abran los dos paneles a la vez.
  function handleSeleccionarTramo(tramo: TramoSeleccionado) {
    if (modoAltaElemento || modoTrazado) return;
    setTramoSeleccionado(tramo);
  }

  function handleActivarTrazado() {
    setModoTrazado(true);
    setPuntosTrazado([]);
    setModoAltaElemento(false);
  }

  function handleCancelarTrazado() {
    setModoTrazado(false);
    setPuntosTrazado([]);
  }

  function handleDeshacerPunto() {
    setPuntosTrazado((prev) => prev.slice(0, -1));
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
        tramos={tramos}
        puntosTrazado={puntosTrazado}
        onSeleccionarTramo={handleSeleccionarTramo}
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

      {/* Botones flotantes de modo, apilados verticalmente para que no se
          pisen entre sí en pantallas angostas. */}
      {!modoTrazado && (
        <div className="fixed bottom-4 left-4 z-20 flex flex-col gap-2 items-start">
          <button
            onClick={handleActivarTrazado}
            className="h-touch px-4 rounded-full font-semibold shadow-lg bg-panel-raised border border-panel-border text-slate-200"
          >
            🖊 Trazar línea
          </button>
          <button
            onClick={() => setModoAltaElemento((v) => !v)}
            className={`h-touch px-4 rounded-full font-semibold shadow-lg transition ${
              modoAltaElemento
                ? "bg-acento text-panel"
                : "bg-panel-raised border border-panel-border text-slate-200"
            }`}
          >
            {modoAltaElemento ? "Tocá el mapa…" : "+ Elemento"}
          </button>
        </div>
      )}

      {/* Barra de control del trazado en curso */}
      {modoTrazado && (
        <div className="fixed bottom-4 inset-x-4 z-20 bg-panel-raised border border-panel-border rounded-xl shadow-lg p-3">
          <p className="text-sm text-slate-300 mb-2">
            {puntosTrazado.length === 0
              ? "Tocá el mapa para marcar el primer punto del tramo."
              : `${puntosTrazado.length} punto${puntosTrazado.length !== 1 ? "s" : ""} marcado${
                  puntosTrazado.length !== 1 ? "s" : ""
                } · seguí tocando para agregar más`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeshacerPunto}
              disabled={puntosTrazado.length === 0}
              className="h-9 px-3 rounded-lg border border-panel-border text-slate-300 text-sm disabled:opacity-40"
            >
              Deshacer
            </button>
            <button
              onClick={handleCancelarTrazado}
              className="h-9 px-3 rounded-lg border border-estado-abierto text-estado-abierto text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => setMostrarFormTramo(true)}
              disabled={puntosTrazado.length < 2}
              className="h-9 px-3 rounded-lg bg-acento text-panel font-semibold text-sm disabled:opacity-40 flex-1"
            >
              Guardar tramo
            </button>
          </div>
        </div>
      )}

      <SyncStatus online={online} pendientes={pendientes} sincronizando={sincronizando} />

      <AlertasPanel elementos={elementos} />
      <HistorialPanel />

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

      {mostrarFormTramo && (
        <TramoForm
          puntos={puntosTrazado}
          alimentadores={alimentadores}
          onCerrar={() => setMostrarFormTramo(false)}
          onCreado={() => {
            recargarTramos();
            setModoTrazado(false);
            setPuntosTrazado([]);
          }}
        />
      )}

      {tramoSeleccionado && (
        <TramoInfoPanel
          tramo={tramoSeleccionado}
          alimentadores={alimentadores}
          onCerrar={() => setTramoSeleccionado(null)}
          onActualizado={() => recargarTramos()}
        />
      )}
    </main>
  );
}
