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
import { actualizarPuntosTramo } from "@/services/tramosService";
import { buscarPuntoDeSnap, type EmpalmePendiente } from "@/lib/geo";
import { resolverColorTramo } from "@/lib/anillado";
import { calcularEnergizacion } from "@/lib/energizacion";
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

const UMBRAL_SNAP_METROS = 15;

interface PuntoTrazado {
  coord: [number, number];
  conectado: boolean;
  empalme: EmpalmePendiente | null;
}

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

  const [modoTrazado, setModoTrazado] = useState(false);
  const [puntosTrazadoInfo, setPuntosTrazadoInfo] = useState<PuntoTrazado[]>([]);
  const [mostrarFormTramo, setMostrarFormTramo] = useState(false);

  const [modoConectar, setModoConectar] = useState(false);
  const [origenConectar, setOrigenConectar] = useState<ElementoEstado | null>(null);

  const [tramoSeleccionado, setTramoSeleccionado] = useState<TramoSeleccionado | null>(
    null
  );

  useEffect(() => {
    obtenerAlimentadores()
      .then((data) => setAlimentadores(data as Alimentador[]))
      .catch(() => {});
  }, []);

  const elementosFiltrados = useMemo(() => {
    return elementos.filter((el) => {
      if (!tiposActivos.has(el.tipo)) return false;
      if (alimentadorId !== "todos" && el.alimentador_id !== alimentadorId)
        return false;
      return true;
    });
  }, [elementos, tiposActivos, alimentadorId]);

  const energizacion = useMemo(
    () => calcularEnergizacion(tramos, elementos),
    [tramos, elementos]
  );

  const tramosParaMapa = useMemo(() => {
    return tramos.map((t) => ({
      ...t,
      color: energizacion.tramosEnergizados.has(t.id)
        ? resolverColorTramo(t, alimentadores, elementos)
        : "#6b7280",
    }));
  }, [tramos, alimentadores, elementos, energizacion]);

  const puntosTrazado = useMemo(
    () => puntosTrazadoInfo.map((p) => p.coord),
    [puntosTrazadoInfo]
  );
  const puntosConectados = useMemo(
    () => puntosTrazadoInfo.map((p) => p.conectado),
    [puntosTrazadoInfo]
  );

  const modoEspecialActivo = modoAltaElemento || modoTrazado || modoConectar;

  function toggleTipo(tipo: TipoElemento) {
    setTiposActivos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }

  function handleClickMapa(coords: { lat: number; lng: number }) {
    if (modoConectar) return;

    if (modoAltaElemento) {
      setUbicacionNuevoElemento(coords);
      setMostrarFormElemento(true);
      setModoAltaElemento(false);
      return;
    }

    if (modoTrazado) {
      const resultado = buscarPuntoDeSnap(
        coords,
        elementos.map((e) => ({ lat: e.lat, lng: e.lng })),
        tramos,
        UMBRAL_SNAP_METROS
      );
      const nuevo: PuntoTrazado = resultado
        ? {
            coord: [resultado.punto.lng, resultado.punto.lat],
            conectado: true,
            empalme: resultado.empalme,
          }
        : { coord: [coords.lng, coords.lat], conectado: false, empalme: null };
      setPuntosTrazadoInfo((prev) => [...prev, nuevo]);
    }
  }

  function handleTocarElemento(elemento: ElementoEstado) {
    if (modoConectar) {
      if (!origenConectar) {
        setOrigenConectar(elemento);
        return;
      }
      if (origenConectar.id === elemento.id) return;
      setPuntosTrazadoInfo([
        { coord: [origenConectar.lng, origenConectar.lat], conectado: true, empalme: null },
        { coord: [elemento.lng, elemento.lat], conectado: true, empalme: null },
      ]);
      setModoConectar(false);
      setOrigenConectar(null);
      setMostrarFormTramo(true);
      return;
    }

    if (modoTrazado) {
      setPuntosTrazadoInfo((prev) => [
        ...prev,
        { coord: [elemento.lng, elemento.lat], conectado: true, empalme: null },
      ]);
      return;
    }

    if (modoAltaElemento) return;

    setElementoSeleccionado(elemento);
  }

  function handleSeleccionarTramo(tramo: TramoSeleccionado) {
    if (modoEspecialActivo) return;
    setTramoSeleccionado(tramo);
  }

  function handleActivarTrazado() {
    setModoTrazado(true);
    setPuntosTrazadoInfo([]);
    setModoAltaElemento(false);
    setModoConectar(false);
    setOrigenConectar(null);
  }

  function handleActivarConectar() {
    setModoConectar(true);
    setOrigenConectar(null);
    setModoTrazado(false);
    setModoAltaElemento(false);
    setPuntosTrazadoInfo([]);
  }

  function handleCancelarTrazado() {
    setModoTrazado(false);
    setPuntosTrazadoInfo([]);
  }

  function handleCancelarConectar() {
    setModoConectar(false);
    setOrigenConectar(null);
  }

  function handleDeshacerPunto() {
    setPuntosTrazadoInfo((prev) => prev.slice(0, -1));
  }

  async function aplicarEmpalmesPendientes() {
    const porTramo = new Map<string, EmpalmePendiente[]>();
    for (const p of puntosTrazadoInfo) {
      if (!p.empalme) continue;
      const lista = porTramo.get(p.empalme.tramoId) ?? [];
      lista.push(p.empalme);
      porTramo.set(p.empalme.tramoId, lista);
    }

    for (const [tramoId, empalmes] of porTramo) {
      const tramoViejo = tramos.find((t) => t.id === tramoId);
      if (!tramoViejo) continue;

      const nuevosPuntos = [...tramoViejo.puntos];
      const puntoDelEmpalme = (e: EmpalmePendiente) =>
        puntosTrazadoInfo.find((p) => p.empalme === e)!.coord;

      empalmes
        .sort((a, b) => b.segmentoIndice - a.segmentoIndice)
        .forEach((e) => {
          nuevosPuntos.splice(e.segmentoIndice + 1, 0, puntoDelEmpalme(e));
        });

      await actualizarPuntosTramo(tramoId, nuevosPuntos);
    }
  }

  if (!cargado) return null;

  if (!usuario) {
    return <IdentificacionOperario onIdentificado={setUsuario} />;
  }

  return (
    <main className="h-dvh w-full relative overflow-hidden">
      <MapView
        elementos={elementosFiltrados}
        elementoSeleccionadoId={
          origenConectar?.id ?? elementoSeleccionado?.id ?? null
        }
        onTocarElemento={handleTocarElemento}
        onClickMapa={handleClickMapa}
        tramos={tramosParaMapa}
        puntosTrazado={puntosTrazado}
        puntosConectados={puntosConectados}
        onSeleccionarTramo={handleSeleccionarTramo}
        elementosEnergizadosIds={energizacion.elementosEnergizados}
        modoEspecialActivo={modoEspecialActivo}
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

      {!modoTrazado && !modoConectar && (
        <div className="fixed bottom-4 left-4 z-20 flex flex-col gap-2 items-start">
          <button
            onClick={handleActivarConectar}
            className="h-touch px-4 rounded-full font-semibold shadow-lg bg-panel-raised border border-panel-border text-slate-200"
          >
            🔗 Conectar 2 puntos
          </button>
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

      {modoConectar && (
        <div className="fixed bottom-4 inset-x-4 z-20 bg-panel-raised border border-panel-border rounded-xl shadow-lg p-3">
          <p className="text-sm text-slate-300 mb-2">
            {!origenConectar
              ? "Tocá el primer elemento (el punto de partida)."
              : `Origen: ${origenConectar.nombre}. Ahora tocá el segundo elemento para conectarlos con una línea recta.`}
          </p>
          <button
            onClick={handleCancelarConectar}
            className="h-9 px-3 rounded-lg border border-estado-abierto text-estado-abierto text-sm w-full"
          >
            Cancelar
          </button>
        </div>
      )}

      {modoTrazado && (
        <div className="fixed bottom-4 inset-x-4 z-20 bg-panel-raised border border-panel-border rounded-xl shadow-lg p-3">
          <p className="text-sm text-slate-300 mb-2">
            {puntosTrazadoInfo.length === 0
              ? "Tocá el mapa, un elemento, o cualquier punto de otra línea para arrancar desde ahí."
              : `${puntosTrazadoInfo.length} punto${puntosTrazadoInfo.length !== 1 ? "s" : ""} · verde = conectado a algo real, naranja = suelto`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeshacerPunto}
              disabled={puntosTrazadoInfo.length === 0}
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
              disabled={puntosTrazadoInfo.length < 2}
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
          elementos={elementos}
          onCerrar={() => setMostrarFormTramo(false)}
          onCreado={async () => {
            await aplicarEmpalmesPendientes();
            recargarTramos();
            setModoTrazado(false);
            setPuntosTrazadoInfo([]);
          }}
        />
      )}

      {tramoSeleccionado && (
        <TramoInfoPanel
          tramo={tramoSeleccionado}
          alimentadores={alimentadores}
          elementos={elementos}
          onCerrar={() => setTramoSeleccionado(null)}
          onActualizado={() => recargarTramos()}
        />
      )}
    </main>
  );
}
