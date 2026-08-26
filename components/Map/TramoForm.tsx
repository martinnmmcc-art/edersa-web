"use client";

import { useState, FormEvent } from "react";
import { crearTramo } from "@/services/tramosService";
import type { Alimentador, TensionTramo } from "@/types";

interface TramoFormProps {
  puntos: [number, number][];
  alimentadores: Alimentador[];
  onCerrar: () => void;
  onCreado: () => void;
}

export function TramoForm({ puntos, alimentadores, onCerrar, onCreado }: TramoFormProps) {
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (puntos.length < 2) {
      setErrorMsg("Necesitás al menos 2 puntos para un tramo.");
      return;
    }
    const form = new FormData(e.currentTarget);
    setGuardando(true);
    setErrorMsg(null);
    try {
      await crearTramo({
        tension: form.get("tension") as TensionTramo,
        alimentador_id: (form.get("alimentador_id") as string) || null,
        nombre: String(form.get("nombre") || "") || undefined,
        puntos,
      });
      onCreado();
      onCerrar();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "No se pudo guardar el tramo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-panel-raised border border-panel-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5">
        <h2 className="font-display text-2xl mb-1">Guardar tramo</h2>
        <p className="text-xs text-slate-400 mb-4">{puntos.length} puntos trazados</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Tensión
            <select name="tension" required className="campo-input" defaultValue="MT">
              <option value="MT">Media tensión (MT)</option>
              <option value="BT">Baja tensión (BT)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Alimentador
            <select name="alimentador_id" className="campo-input">
              <option value="">Sin asignar</option>
              {alimentadores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.tension_kv}kV)
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Nombre (opcional)
            <input
              name="nombre"
              className="campo-input"
              placeholder="Ej: Tramo Ruta 40 - Villa Turismo"
            />
          </label>

          {errorMsg && <p className="text-sm text-estado-abierto">{errorMsg}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 h-touch rounded-xl border border-panel-border text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 h-touch rounded-xl bg-acento text-panel font-semibold disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar tramo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
