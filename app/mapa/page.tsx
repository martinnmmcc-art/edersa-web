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
import { buscarPuntoDeSnap, buscarSegmentoMasCercano, type EmpalmePendiente } from "@/lib/geo";
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

// Radio de "pegado" de respaldo, por si algún llamado no trae el radio
// calculado dinámicamente según el zoom (ver MapView.tsx).
const UMBRAL_SNAP_METROS_DEFECTO = 10;

interface PuntoTrazado {
  coord: [number, number]; // [lng, lat]
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

  // --- Trazado libre (multi-punto) ---
  const [modoTrazado, setModoTrazado] = useState(false);
  const [puntosTrazadoInfo, setPuntosTrazadoInfo] = useState<PuntoTrazado[]>([]);
  const [mostrarFormTramo, setMostrarFormTramo] = useState(false);
  // Apagalo cuando dos líneas de alimentadores distintos van a pasar
  // cerca a propósito (mismo poste) y no querés que se unan solas.
  const [pegadoActivo, setPegadoActivo] = useState(true);

  // --- Conectar 2 elementos directo (atajo rápido) ---
  const [modoConectar, setModoConectar] = useState(false);
  const [origenConectar, setOrigenConectar] = useState<ElementoEstado | null>(null);

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

  const energizacion = useMemo(
    () => calcularEnergizacion(tramos, elementos),
    [tramos, elementos]
  );

  const tramosParaMapa = useMemo(() => {
    return tramos.map((t) => ({
      ...t,
      color: energizacion.tramosEnergizados.has(t.id)
        ? resolverColorTramo(t, alimentadores, elementos)
        : "#6b7280", // gris: sin tensión
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

  function handleClickMapa(coords: { lat: number; lng: number; radioSnapMetros?: number }) {
    if (modoConectar) return; // acá solo interesan los toques sobre elementos

    if (modoAltaElemento) {
      setUbicacionNuevoElemento(coords);
      setMostrarFormElemento(true);
      setModoAltaElemento(false);
      return;
    }

    if (modoTrazado) {
      const resultado = pegadoActivo
        ? buscarPuntoDeSnap(
            coords,
            elementos.map((e) => ({ lat: e.lat, lng: e.lng })),
            tramos,
            coords.radioSnapMetros ?? UMBRAL_SNAP_METROS_DEFECTO
          )
        : null;
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

  // Qué hacer cuando se toca un elemento (marcador) en el mapa, según
  // el modo activo.
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

  // Al guardar un tramo nuevo, si alguno de sus puntos quedó "empalmado"
  // en el medio de un tramo viejo, hay que partir ese tramo viejo
  // insertándole el vértice nuevo — si no, la unión queda solo visual
  // (dos líneas que pasan cerca) y no una conexión real en los datos.
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
      // Insertar de mayor a menor índice para no invalidar los índices
      // ya calculados a medida que se insertan los anteriores.
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
          <p className="text-sm text-slate-300 mb-1">
            {puntosTrazadoInfo.length === 0
              ? "Tocá el mapa, un elemento, o cualquier punto de otra línea para arrancar desde ahí. Si hay líneas de otro alimentador cerca, apagá el pegado abajo."
              : `${puntosTrazadoInfo.length} punto${puntosTrazadoInfo.length !== 1 ? "s" : ""} · verde = conectado, naranja = suelto`}
          </p>
          {puntosTrazadoInfo.length > 0 && (
            <p className="text-xs mb-2 font-semibold">
              {(() => {
                const ultimo = puntosTrazadoInfo[puntosTrazadoInfo.length - 1];
                if (ultimo.empalme) {
                  return (
                    <span className="text-estado-cerrado">
                      ✂️ Último punto: va a partir una línea existente para unirse ahí.
                    </span>
                  );
                }
                if (ultimo.conectado) {
                  return (
                    <span className="text-estado-cerrado">
                      ✅ Último punto: pegado exacto a un elemento o vértice ya existente.
                    </span>
                  );
                }
                return (
                  <span className="text-acento">
                    ⚠️ Último punto: quedó suelto, no detectó nada cerca para unir.
                  </span>
                );
              })()}
            </p>
          )}
          <button
            onClick={() => setPegadoActivo((v) => !v)}
            className={`w-full h-8 mb-2 rounded-lg text-xs font-semibold border ${
              pegadoActivo
                ? "bg-estado-cerrado/20 border-estado-cerrado text-estado-cerrado"
                : "bg-estado-abierto/20 border-estado-abierto text-estado-abierto"
            }`}
          >
            {pegadoActivo
              ? "🧲 Pegado activado — tocalo para apagarlo (líneas cercanas de otro alimentador)"
              : "🧲 Pegado apagado — tocalo para volver a activarlo"}
          </button>
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
          tramos={tramos}
          onCerrarPanel={() => setElementoSeleccionado(null)}
          onEventoRegistrado={() => recargar()}
          onReconectado={() => recargarTramos()}
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
          onCreado={async () => {
            // Si el punto donde se creó el elemento cae cerca de una
            // línea ya trazada, lo "suelda" ahí mismo (sin moverlo) para
            // que quede realmente conectado desde el primer momento —
            // esto es justo lo que faltaba y causaba que un seccionador
            // recién cargado quedara separado de la línea.
            if (ubicacionNuevoElemento) {
              const resultado = buscarSegmentoMasCercano(
                ubicacionNuevoElemento,
                tramos,
                UMBRAL_SNAP_METROS_DEFECTO
              );
              if (resultado) {
                const tramoViejo = tramos.find((t) => t.id === resultado.tramoId);
                if (tramoViejo) {
                  const nuevosPuntos = [...tramoViejo.puntos];
                  nuevosPuntos.splice(resultado.segmentoIndice + 1, 0, [
                    ubicacionNuevoElemento.lng,
                    ubicacionNuevoElemento.lat,
                  ]);
                  await actualizarPuntosTramo(resultado.tramoId, nuevosPuntos);
                  recargarTramos();
                }
              }
            }
            recargar();
          }}
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
