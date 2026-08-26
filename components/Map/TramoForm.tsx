"use client";

import { useState, FormEvent } from "react";
import { crearTramo } from "@/services/tramosService";
import type { Alimentador, ElementoEstado, TensionTramo } from "@/types";

interface TramoFormProps {
  puntos: [number, number][];
  alimentadores: Alimentador[];
  elementos: ElementoEstado[];
  onCerrar: () => void;
  onCreado: () => void;
}

export function TramoForm({ puntos, alimentadores, elementos, onCerrar, onCreado }: TramoFormProps) {
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [esAnillo, setEsAnillo] = useState(false);

  const omnirouters = elementos.filter((e) => e.tipo === "omnirouter");

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
        alimentador_id_b: esAnillo ? (form.get("alimentador_id_b") as string) || null : null,
        elemento_frontera_id: esAnillo
          ? (form.get("elemento_frontera_id") as string) || null
          : null,
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
      <div className="bg-panel-raised border border-panel-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
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
            Alimentador {esAnillo ? "principal" : ""}
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

          <label className="flex items-center gap-2 text-sm text-slate-300 mt-1">
            <input
              type="checkbox"
              checked={esAnillo}
              onChange={(e) => setEsAnillo(e.target.checked)}
              className="w-5 h-5"
            />
            Este tramo forma parte de un anillo (puede alimentarse desde dos lados)
          </label>

          {esAnillo && (
            <div className="bg-panel rounded-lg p-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                Alimentador secundario (el otro lado del anillo)
                <select name="alimentador_id_b" className="campo-input">
                  <option value="">Elegir…</option>
                  {alimentadores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} ({a.tension_kv}kV)
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-300">
                Omnirouter que define el anillo
                <select name="elemento_frontera_id" className="campo-input">
                  <option value="">Elegir…</option>
                  {omnirouters.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500 mt-1">
                  Cuando ese omnirouter esté CERRADO, el tramo se va a pintar
                  con el color del alimentador secundario.
                </span>
              </label>
            </div>
          )}

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
