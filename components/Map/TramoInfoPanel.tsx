"use client";

import { useState } from "react";
import { actualizarTramo, darDeBajaTramo } from "@/services/tramosService";
import type { Alimentador } from "@/types";

export interface TramoSeleccionado {
  id: string;
  nombre: string;
  tension: string;
  alimentador_id: string;
}

interface TramoInfoPanelProps {
  tramo: TramoSeleccionado;
  alimentadores: Alimentador[];
  onCerrar: () => void;
  onActualizado: () => void;
}

export function TramoInfoPanel({
  tramo,
  alimentadores,
  onCerrar,
  onActualizado,
}: TramoInfoPanelProps) {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);

  const alimentadorActual = alimentadores.find((a) => a.id === tramo.alimentador_id);

  async function handleGuardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setGuardando(true);
    try {
      await actualizarTramo(tramo.id, {
        alimentador_id: (form.get("alimentador_id") as string) || null,
        nombre: String(form.get("nombre") || "") || null,
      });
      onActualizado();
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  async function handleBaja() {
    setGuardando(true);
    try {
      await darDeBajaTramo(tramo.id);
      onActualizado();
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 bg-panel-raised border-t border-panel-border rounded-t-2xl shadow-2xl"
      role="dialog"
      aria-label="Información del tramo"
    >
      <div className="max-w-lg mx-auto p-4 pb-6">
        {!editando ? (
          <>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Tramo {tramo.tension === "MT" ? "de media tensión" : "de baja tensión"}
                </p>
                <h2 className="font-display text-2xl leading-tight">
                  {tramo.nombre || "(sin nombre)"}
                </h2>
                <p className="text-sm mt-1 text-slate-300">
                  Alimentador:{" "}
                  <span className="font-semibold text-slate-100">
                    {alimentadorActual
                      ? `${alimentadorActual.nombre} (${alimentadorActual.tension_kv}kV)`
                      : "sin asignar"}
                  </span>
                </p>
              </div>
              <button
                onClick={onCerrar}
                aria-label="Cerrar"
                className="text-slate-400 hover:text-slate-100 text-2xl leading-none px-2 h-touch"
              >
                ×
              </button>
            </div>

            <button
              onClick={() => setEditando(true)}
              className="w-full h-touch rounded-xl bg-acento text-panel font-semibold"
            >
              Editar tramo
            </button>
          </>
        ) : (
          <form onSubmit={handleGuardar} className="flex flex-col gap-3">
            <h2 className="font-display text-2xl leading-tight mb-1">Editar tramo</h2>

            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Nombre (opcional)
              <input
                name="nombre"
                defaultValue={tramo.nombre}
                className="campo-input"
                placeholder="Ej: Tramo Ruta 40 - Villa Turismo"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Alimentador
              <select
                name="alimentador_id"
                defaultValue={tramo.alimentador_id}
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
                disabled={guardando}
                className="flex-1 h-touch rounded-xl bg-acento text-panel font-semibold disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>

            {!confirmandoBaja ? (
              <button
                type="button"
                onClick={() => setConfirmandoBaja(true)}
                className="h-touch rounded-xl border border-estado-abierto text-estado-abierto text-sm mt-1"
              >
                Eliminar este tramo
              </button>
            ) : (
              <div className="border border-estado-abierto rounded-xl p-3 mt-1">
                <p className="text-sm text-slate-200 mb-2">¿Confirmás eliminar el tramo?</p>
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
                    onClick={handleBaja}
                    disabled={guardando}
                    className="flex-1 h-touch rounded-lg bg-estado-abierto text-white text-sm disabled:opacity-50"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
