"use client";

import { LABEL_TIPO } from "@/lib/estado";
import type { Alimentador, TipoElemento } from "@/types";

interface FilterBarProps {
  tiposActivos: Set<TipoElemento>;
  onToggleTipo: (tipo: TipoElemento) => void;
  alimentadores: Alimentador[];
  alimentadorId: string | "todos";
  onCambiarAlimentador: (id: string | "todos") => void;
}

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

export function FilterBar({
  tiposActivos,
  onToggleTipo,
  alimentadores,
  alimentadorId,
  onCambiarAlimentador,
}: FilterBarProps) {
  return (
    <div className="fixed top-0 inset-x-0 z-20 bg-panel/95 backdrop-blur border-b border-panel-border">
      <div className="max-w-lg mx-auto p-3 flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {TODOS_LOS_TIPOS.map((tipo) => {
            const activo = tiposActivos.has(tipo);
            return (
              <button
                key={tipo}
                onClick={() => onToggleTipo(tipo)}
                className={`shrink-0 h-touch px-4 rounded-full text-sm font-semibold border transition ${
                  activo
                    ? "bg-acento text-panel border-acento"
                    : "bg-panel-raised text-slate-300 border-panel-border"
                }`}
              >
                {LABEL_TIPO[tipo]}
              </button>
            );
          })}
        </div>

        {alimentadores.length > 0 && (
          <select
            value={alimentadorId}
            onChange={(e) => onCambiarAlimentador(e.target.value)}
            className="h-touch rounded-lg bg-panel-raised border border-panel-border text-slate-100 px-3 text-sm"
          >
            <option value="todos">Todos los alimentadores</option>
            {alimentadores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} ({a.tension_kv}kV)
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
