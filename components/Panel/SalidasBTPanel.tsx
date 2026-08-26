"use client";

import { useState } from "react";
import { useSalidasBT } from "@/hooks/useSalidasBT";
import { crearSalidaBT } from "@/services/salidasBtService";
import { registrarEvento } from "@/services/eventosService";
import { obtenerTransformadorPorElemento } from "@/services/transformadoresService";
import { COLOR_ESTADO, LABEL_ESTADO } from "@/lib/estado";
import type { TipoMotivo } from "@/types";

const MOTIVOS: { valor: TipoMotivo; label: string }[] = [
  { valor: "preventivo", label: "Preventivo" },
  { valor: "mantenimiento", label: "Mantenimiento" },
  { valor: "poda", label: "Poda" },
  { valor: "falla", label: "Falla" },
  { valor: "transferencia_carga", label: "Transferencia de carga" },
  { valor: "otro", label: "Otro" },
];

interface SalidasBTPanelProps {
  elementoId: string;
  usuario: string;
}

export function SalidasBTPanel({ elementoId, usuario }: SalidasBTPanelProps) {
  const { salidas, cargando, recargar } = useSalidasBT(elementoId);
  const [agregando, setAgregando] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [creando, setCreando] = useState(false);
  const [maniobrando, setManiobrando] = useState<string | null>(null);
  const [motivoPorSalida, setMotivoPorSalida] = useState<Record<string, TipoMotivo>>({});

  async function handleAgregar() {
    setCreando(true);
    try {
      const transformador = await obtenerTransformadorPorElemento(elementoId);
      if (!transformador) return;
      const numerosUsados = new Set(salidas.map((s) => s.numero));
      const siguiente = ([1, 2, 3, 4] as const).find((n) => !numerosUsados.has(n));
      if (!siguiente) return;
      await crearSalidaBT(transformador.id, siguiente, nombreNueva || undefined);
      setNombreNueva("");
      setAgregando(false);
      recargar();
    } finally {
      setCreando(false);
    }
  }

  async function handleManiobra(salidaId: string, tipo: "apertura" | "cierre") {
    const motivo = motivoPorSalida[salidaId] ?? "preventivo";
    setManiobrando(salidaId);
    try {
      await registrarEvento({ salida_bt_id: salidaId, tipo, usuario, motivo });
      recargar();
    } finally {
      setManiobrando(null);
    }
  }

  if (cargando) return null;

  return (
    <div className="mt-4 pt-4 border-t border-panel-border">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
        Salidas BT ({salidas.length}/4)
      </p>

      <div className="flex flex-col gap-2">
        {salidas.map((s) => (
          <div key={s.id} className="bg-panel rounded-lg p-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {s.nombre || `Salida ${s.numero}`}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: COLOR_ESTADO[s.estado] }}
              >
                {LABEL_ESTADO[s.estado]}
              </span>
            </div>
            <div className="flex gap-2">
              <select
                className="campo-input text-xs h-8 flex-1"
                value={motivoPorSalida[s.id] ?? "preventivo"}
                onChange={(e) =>
                  setMotivoPorSalida((prev) => ({
                    ...prev,
                    [s.id]: e.target.value as TipoMotivo,
                  }))
                }
              >
                {MOTIVOS.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleManiobra(s.id, "apertura")}
                disabled={maniobrando !== null}
                className="h-8 px-3 rounded-lg bg-estado-abierto text-white text-xs font-semibold disabled:opacity-50"
              >
                Abrir
              </button>
              <button
                onClick={() => handleManiobra(s.id, "cierre")}
                disabled={maniobrando !== null}
                className="h-8 px-3 rounded-lg bg-estado-cerrado text-white text-xs font-semibold disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        ))}

        {salidas.length === 0 && (
          <p className="text-xs text-slate-500">Este transformador todavía no tiene salidas BT cargadas.</p>
        )}
      </div>

      {salidas.length < 4 &&
        (agregando ? (
          <div className="flex gap-2 mt-2">
            <input
              className="campo-input text-xs h-8 flex-1"
              placeholder="Nombre (opcional)"
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
            />
            <button
              onClick={handleAgregar}
              disabled={creando}
              className="h-8 px-3 rounded-lg bg-acento text-panel text-xs font-semibold disabled:opacity-50"
            >
              {creando ? "…" : "Crear"}
            </button>
            <button
              onClick={() => setAgregando(false)}
              className="h-8 px-3 rounded-lg border border-panel-border text-slate-300 text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAgregando(true)}
            className="w-full h-8 mt-2 rounded-lg border border-dashed border-panel-border text-slate-400 text-xs"
          >
            + Agregar salida
          </button>
        ))}
    </div>
  );
}
