"use client";

import { useEffect, useState } from "react";
import {
  obtenerSalidasBTAbiertas,
  suscribirseASalidasBT,
} from "@/services/salidasBtService";
import { LABEL_TIPO } from "@/lib/estado";
import type { ElementoEstado, SalidaBTEstado } from "@/types";

const LABEL_MOTIVO: Record<string, string> = {
  poda: "poda",
  mantenimiento: "mantenimiento",
  preventivo: "preventivo",
  falla: "falla",
  otro: "otro",
};

function formatearHora(fechaIso: string) {
  return new Date(fechaIso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AlertasPanelProps {
  elementos: ElementoEstado[];
}

export function AlertasPanel({ elementos }: AlertasPanelProps) {
  const [abierto, setAbierto] = useState(false);
  const [salidasAbiertas, setSalidasAbiertas] = useState<SalidaBTEstado[]>([]);

  useEffect(() => {
    function cargar() {
      obtenerSalidasBTAbiertas()
        .then(setSalidasAbiertas)
        .catch(() => {});
    }
    cargar();
    const cancelar = suscribirseASalidasBT(cargar);
    return cancelar;
  }, []);

  const elementosAbiertos = elementos.filter((e) => e.estado === "abierto");
  const total = elementosAbiertos.length + salidasAbiertas.length;

  return (
    <div className="fixed top-40 left-3 z-20">
      <button
        onClick={() => setAbierto((v) => !v)}
        className={`h-touch px-3 rounded-xl border font-semibold text-sm shadow-lg flex items-center gap-1.5 ${
          total > 0
            ? "bg-estado-abierto text-white border-estado-abierto"
            : "bg-panel-raised border-panel-border text-slate-300"
        }`}
      >
        🚨 {total}
      </button>

      {abierto && (
        <div className="mt-2 w-72 max-h-80 overflow-y-auto bg-panel-raised border border-panel-border rounded-xl shadow-xl p-2">
          {total === 0 && (
            <p className="text-sm text-slate-400 p-2">No hay elementos abiertos.</p>
          )}

          {elementosAbiertos.map((e) => (
            <div key={e.id} className="p-2 border-b border-panel-border last:border-b-0">
              <p className="text-sm font-medium text-slate-100">{e.nombre}</p>
              <p className="text-xs text-slate-400">
                {LABEL_TIPO[e.tipo]} ·{" "}
                {e.ultimo_evento_motivo ? LABEL_MOTIVO[e.ultimo_evento_motivo] : "sin motivo"} ·{" "}
                {e.ultimo_evento_fecha ? formatearHora(e.ultimo_evento_fecha) : "—"}
              </p>
            </div>
          ))}

          {salidasAbiertas.map((s) => (
            <div key={s.id} className="p-2 border-b border-panel-border last:border-b-0">
              <p className="text-sm font-medium text-slate-100">
                {s.transformador_nombre} · {s.nombre || `Salida ${s.numero}`}
              </p>
              <p className="text-xs text-slate-400">
                Salida BT ·{" "}
                {s.ultimo_evento_motivo ? LABEL_MOTIVO[s.ultimo_evento_motivo] : "sin motivo"} ·{" "}
                {s.ultimo_evento_fecha ? formatearHora(s.ultimo_evento_fecha) : "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
