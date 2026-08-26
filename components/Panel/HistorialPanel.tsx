"use client";

import { useEffect, useState } from "react";
import { obtenerHistorial } from "@/services/historialService";
import { resumenPorTurno } from "@/lib/turnos";
import type { ManiobraHistorial } from "@/types";

const LABEL_MOTIVO: Record<string, string> = {
  poda: "Poda",
  mantenimiento: "Mantenimiento",
  preventivo: "Preventivo",
  falla: "Falla",
  otro: "Otro",
  "sin especificar": "Sin motivo",
};

export function HistorialPanel() {
  const [abierto, setAbierto] = useState(false);
  const [maniobras, setManiobras] = useState<ManiobraHistorial[]>([]);
  const [vista, setVista] = useState<"turnos" | "lista">("turnos");

  useEffect(() => {
    if (!abierto) return;
    obtenerHistorial(300)
      .then(setManiobras)
      .catch(() => {});
  }, [abierto]);

  const resumen = resumenPorTurno(maniobras);

  return (
    <div className="fixed top-64 right-3 z-20">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="h-touch px-3 rounded-xl bg-panel-raised border border-panel-border text-slate-200 font-semibold text-sm shadow-lg"
      >
        📋 Historial
      </button>

      {abierto && (
        <div className="mt-2 w-80 max-h-96 overflow-y-auto bg-panel-raised border border-panel-border rounded-xl shadow-xl p-3">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setVista("turnos")}
              className={`flex-1 h-8 rounded-lg text-xs font-semibold ${
                vista === "turnos" ? "bg-acento text-panel" : "bg-panel text-slate-300"
              }`}
            >
              Por turno
            </button>
            <button
              onClick={() => setVista("lista")}
              className={`flex-1 h-8 rounded-lg text-xs font-semibold ${
                vista === "lista" ? "bg-acento text-panel" : "bg-panel text-slate-300"
              }`}
            >
              Lista
            </button>
          </div>

          {vista === "turnos" ? (
            resumen.length === 0 ? (
              <p className="text-sm text-slate-400">Sin maniobras registradas.</p>
            ) : (
              resumen.map((r) => (
                <div
                  key={r.clave}
                  className="mb-3 pb-3 border-b border-panel-border last:border-b-0"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {r.fechaTurno} · Turno {r.turno}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.total} maniobras · {r.aperturas} aperturas · {r.cierres} cierres
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {Object.entries(r.porMotivo)
                      .map(([m, n]) => `${LABEL_MOTIVO[m] ?? m}: ${n}`)
                      .join(" · ")}
                  </p>
                </div>
              ))
            )
          ) : maniobras.length === 0 ? (
            <p className="text-sm text-slate-400">Sin maniobras registradas.</p>
          ) : (
            maniobras.map((m) => (
              <div
                key={m.id}
                className="mb-2 pb-2 border-b border-panel-border last:border-b-0 text-xs"
              >
                <p className="text-slate-200 font-medium">
                  {m.objetivo_nombre} — {m.tipo.toUpperCase()}
                </p>
                <p className="text-slate-400">
                  {m.motivo ? LABEL_MOTIVO[m.motivo] : "sin motivo"} · {m.usuario} ·{" "}
                  {new Date(m.fecha).toLocaleString("es-AR")}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
