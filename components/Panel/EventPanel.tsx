"use client";

import { useState } from "react";
import { registrarEvento } from "@/services/eventosService";
import {
  actualizarElemento,
  darDeBajaElemento,
} from "@/services/elementosService";
import { COLOR_ESTADO, LABEL_ESTADO, LABEL_TIPO, TIPOS_SIN_MANIOBRA } from "@/lib/estado";
import { SalidasBTPanel } from "./SalidasBTPanel";
import type { Alimentador, ElementoEstado, TipoMotivo } from "@/types";

const MOTIVOS: { valor: TipoMotivo; label: string }[] = [
  { valor: "preventivo", label: "Preventivo" },
  { valor: "mantenimiento", label: "Mantenimiento" },
  { valor: "poda", label: "Poda" },
  { valor: "falla", label: "Falla" },
  { valor: "transferencia_carga", label: "Transferencia de carga" },
  { valor: "otro", label: "Otro" },
];

interface EventPanelProps {
  elemento: ElementoEstado;
  usuario: string;
  alimentadores: Alimentador[];
  onCerrarPanel: () => void;
  onEventoRegistrado: (offline: boolean) => void;
}

export function EventPanel({
  elemento,
  usuario,
  alimentadores,
  onCerrarPanel,
  onEventoRegistrado,
}: EventPanelProps) {
  const [enviando, setEnviando] = useState<"apertura" | "cierre" | null>(null);
  const [motivo, setMotivo] = useState<TipoMotivo>("preventivo");
  const [editando, setEditando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);

  async function handleRegistrar(tipo: "apertura" | "cierre") {
    setEnviando(tipo);
    try {
      const resultado = await registrarEvento({
        elemento_id: elemento.id,
        tipo,
        usuario,
        motivo,
      });
      onEventoRegistrado(resultado.offline);
      onCerrarPanel();
    } finally {
      setEnviando(null);
    }
  }

  async function handleGuardarEdicion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nombre = String(form.get("nombre") || "").trim();
    const alimentador_id = (form.get("alimentador_id") as string) || null;
    const alimentador_id_b = (form.get("alimentador_id_b") as string) || null;
    const es_fuente = form.get("es_fuente") === "on";
    if (nombre.length < 2) return;

    setGuardandoEdicion(true);
    try {
      await actualizarElemento(elemento.id, { nombre, alimentador_id, alimentador_id_b, es_fuente });
      onEventoRegistrado(false);
      onCerrarPanel();
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function handleDarDeBaja() {
    setGuardandoEdicion(true);
    try {
      await darDeBajaElemento(elemento.id);
      onEventoRegistrado(false);
      onCerrarPanel();
    } finally {
      setGuardandoEdicion(false);
    }
  }

  if (editando) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-30 bg-panel-raised border-t border-panel-border rounded-t-2xl shadow-2xl"
        role="dialog"
        aria-label={`Editar ${elemento.nombre}`}
      >
        <form onSubmit={handleGuardarEdicion} className="max-w-lg mx-auto p-4 pb-6 flex flex-col gap-3">
          <h2 className="font-display text-2xl leading-tight">Editar elemento</h2>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Nombre / identificador
            <input
              name="nombre"
              required
              defaultValue={elemento.nombre}
              className="campo-input"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Alimentador
            <select
              name="alimentador_id"
              defaultValue={elemento.alimentador_id ?? ""}
              className="campo-input"
            >
              <option value="">Sin asignar</option>
              {alimentadores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.tension_kv}kV)
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="es_fuente"
              defaultChecked={elemento.es_fuente}
              className="w-5 h-5"
            />
            Es un punto de alimentación (fuente de energía)
          </label>

          {elemento.tipo === "omnirouter" && (
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Segundo alimentador (si anilla / transfiere carga)
              <select
                name="alimentador_id_b"
                defaultValue={elemento.alimentador_id_b ?? ""}
                className="campo-input"
              >
                <option value="">No anilla — un solo alimentador</option>
                {alimentadores.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.tension_kv}kV)
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="flex-1 h-touch rounded-xl border border-panel-border text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoEdicion}
              className="flex-1 h-touch rounded-xl bg-acento text-panel font-semibold disabled:opacity-50"
            >
              {guardandoEdicion ? "Guardando…" : "Guardar"}
            </button>
          </div>

          {!confirmandoBaja ? (
            <button
              type="button"
              onClick={() => setConfirmandoBaja(true)}
              className="h-touch rounded-xl border border-estado-abierto text-estado-abierto text-sm mt-1"
            >
              Dar de baja este elemento
            </button>
          ) : (
            <div className="border border-estado-abierto rounded-xl p-3 mt-1">
              <p className="text-sm text-slate-200 mb-2">
                Deja de verse en el mapa, pero se conserva su historial de
                eventos. ¿Confirmás?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmandoBaja(false)}
                  className="flex-1 h-touch rounded-lg border border-panel-border text-slate-300 text-sm"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={handleDarDeBaja}
                  disabled={guardandoEdicion}
                  className="flex-1 h-touch rounded-lg bg-estado-abierto text-white text-sm disabled:opacity-50"
                >
                  Sí, dar de baja
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 bg-panel-raised border-t border-panel-border rounded-t-2xl shadow-2xl safe-area-bottom max-h-[85vh] overflow-y-auto"
      role="dialog"
      aria-label={`Registrar evento para ${elemento.nombre}`}
    >
      <div className="max-w-lg mx-auto p-4 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {LABEL_TIPO[elemento.tipo]}
              {elemento.alimentador_nombre ? ` · ${elemento.alimentador_nombre}` : ""}
            </p>
            <h2 className="font-display text-2xl leading-tight">{elemento.nombre}</h2>
            {elemento.es_fuente && (
              <p className="text-xs mt-1 text-estado-cerrado font-semibold">
                ⚡ Punto de alimentación (fuente)
              </p>
            )}
            {elemento.alimentador_b_nombre && (
              <p className="text-xs mt-1 text-acento font-semibold">
                🔗 Anilla: {elemento.alimentador_nombre} ↔ {elemento.alimentador_b_nombre}
              </p>
            )}
            {!TIPOS_SIN_MANIOBRA.has(elemento.tipo) && (
              <p
                className="text-sm mt-1 font-semibold"
                style={{ color: COLOR_ESTADO[elemento.estado] }}
              >
                Estado actual: {LABEL_ESTADO[elemento.estado]}
                {elemento.ultimo_evento_motivo && elemento.estado === "abierto"
                  ? ` · ${elemento.ultimo_evento_motivo}`
                  : ""}
              </p>
            )}
          </div>
          <button
            onClick={onCerrarPanel}
            aria-label="Cerrar panel"
            className="text-slate-400 hover:text-slate-100 text-2xl leading-none px-2 h-touch"
          >
            ×
          </button>
        </div>

        {!TIPOS_SIN_MANIOBRA.has(elemento.tipo) && (
          <>
            <label className="flex flex-col gap-1 text-sm text-slate-300 mb-3">
              Motivo de la maniobra
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as TipoMotivo)}
                className="campo-input"
              >
                {MOTIVOS.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRegistrar("apertura")}
                disabled={enviando !== null}
                className="h-16 rounded-xl bg-estado-abierto text-white font-display text-2xl tracking-wide disabled:opacity-50 active:scale-95 transition"
              >
                {enviando === "apertura" ? "Guardando…" : "ABRIR"}
              </button>
              <button
                onClick={() => handleRegistrar("cierre")}
                disabled={enviando !== null}
                className="h-16 rounded-xl bg-estado-cerrado text-white font-display text-2xl tracking-wide disabled:opacity-50 active:scale-95 transition"
              >
                {enviando === "cierre" ? "Guardando…" : "CERRAR"}
              </button>
            </div>
          </>
        )}

        {elemento.tipo === "transformador" && (
          <SalidasBTPanel elementoId={elemento.id} usuario={usuario} />
        )}

        <button
          onClick={() => setEditando(true)}
          className="w-full h-touch mt-3 rounded-xl border border-panel-border text-slate-300 text-sm"
        >
          Editar nombre / alimentador
        </button>

        <p className="text-xs text-slate-500 mt-3 text-center">
          Operario: {usuario}
        </p>
      </div>
    </div>
  );
}
