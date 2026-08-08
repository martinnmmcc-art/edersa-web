"use client";

import { useState, FormEvent } from "react";
import { crearElemento } from "@/services/elementosService";
import { crearTransformador } from "@/services/transformadoresService";
import { crearCapacitor } from "@/services/capacitoresService";
import { crearGenerador } from "@/services/generadoresService";
import { LABEL_TIPO } from "@/lib/estado";
import type { Alimentador, TensionSecundariaBT, TipoElemento } from "@/types";

interface ElementoFormProps {
  alimentadores: Alimentador[];
  ubicacionPreseleccionada: { lat: number; lng: number } | null;
  onCerrar: () => void;
  onCreado: () => void;
}

const TIPOS: TipoElemento[] = [
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

const OPCIONES_TENSION_SECUNDARIA: TensionSecundariaBT[] = ["220", "380", "380/220"];

export function ElementoForm({
  alimentadores,
  ubicacionPreseleccionada,
  onCerrar,
  onCreado,
}: ElementoFormProps) {
  const [tipo, setTipo] = useState<TipoElemento>("reconectador");
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const form = new FormData(e.currentTarget);
    const lat = Number(form.get("lat"));
    const lng = Number(form.get("lng"));
    const nombre = String(form.get("nombre") || "").trim();
    const alimentador_id = (form.get("alimentador_id") as string) || null;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setErrorMsg("Ubicación inválida. Tocá el mapa para fijar el punto.");
      return;
    }
    if (nombre.length < 2) {
      setErrorMsg("Poné un nombre para identificar el elemento.");
      return;
    }

    setGuardando(true);
    try {
      if (tipo === "transformador") {
        await crearTransformador({
          nombre,
          alimentador_id,
          lat,
          lng,
          potencia_kva: Number(form.get("potencia_kva")),
          tension_primaria_kv: Number(form.get("tension_primaria_kv")),
          tension_secundaria_v: form.get("tension_secundaria_v") as TensionSecundariaBT,
          fases: Number(form.get("fases")) as 1 | 3,
          fabricante: String(form.get("fabricante") || ""),
          numero_serie: String(form.get("numero_serie") || ""),
        });
      } else if (tipo === "capacitor") {
        await crearCapacitor({
          nombre,
          alimentador_id,
          lat,
          lng,
          potencia_kvar: Number(form.get("potencia_kvar")),
          tension_kv: Number(form.get("tension_kv")),
          tipo: form.get("tipo_capacitor") as "fijo" | "automatico",
        });
      } else if (tipo === "generador") {
        await crearGenerador({
          nombre,
          alimentador_id,
          lat,
          lng,
          tipo_motor: form.get("tipo_motor") as "gas" | "diesel",
          potencia_kva: Number(form.get("potencia_kva_generador")),
          tension_salida_kv: Number(form.get("tension_salida_kv")),
        });
      } else {
        await crearElemento({ nombre, tipo, alimentador_id, lat, lng });
      }
      onCreado();
      onCerrar();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "No se pudo guardar el elemento.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-panel-raised border border-panel-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <h2 className="font-display text-2xl mb-4">Nuevo elemento</h2>

        {!ubicacionPreseleccionada && (
          <p className="text-sm text-acento mb-3">
            Tip: cerrá este formulario, tocá el mapa en la ubicación del
            elemento y volvé a abrir &quot;+ Elemento&quot; para que la
            posición se cargue sola.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Campo label="Tipo">
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`h-touch rounded-lg text-xs font-semibold border px-1 ${
                    tipo === t
                      ? "bg-acento text-panel border-acento"
                      : "bg-panel text-slate-300 border-panel-border"
                  }`}
                >
                  {LABEL_TIPO[t]}
                </button>
              ))}
            </div>
          </Campo>

          <Campo label="Nombre / identificador">
            <input
              name="nombre"
              required
              className="campo-input"
              placeholder="Ej: Seccionador SC-14"
            />
          </Campo>

          <Campo label="Alimentador">
            <select name="alimentador_id" className="campo-input">
              <option value="">Sin asignar</option>
              {alimentadores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.tension_kv}kV)
                </option>
              ))}
            </select>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Latitud">
              <input
                name="lat"
                required
                type="number"
                step="any"
                defaultValue={ubicacionPreseleccionada?.lat}
                className="campo-input"
              />
            </Campo>
            <Campo label="Longitud">
              <input
                name="lng"
                required
                type="number"
                step="any"
                defaultValue={ubicacionPreseleccionada?.lng}
                className="campo-input"
              />
            </Campo>
          </div>

          {tipo === "transformador" && (
            <>
              <Campo label="Potencia (kVA)">
                <input
                  name="potencia_kva"
                  required
                  type="number"
                  step="any"
                  className="campo-input"
                  placeholder="Ej: 100"
                />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Tensión primaria (kV)">
                  <input
                    name="tension_primaria_kv"
                    required
                    type="number"
                    step="any"
                    defaultValue={13.2}
                    className="campo-input"
                  />
                </Campo>
                <Campo label="Tensión secundaria">
                  <select
                    name="tension_secundaria_v"
                    required
                    className="campo-input"
                    defaultValue="380/220"
                  >
                    {OPCIONES_TENSION_SECUNDARIA.map((v) => (
                      <option key={v} value={v}>
                        {v}V
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
              <Campo label="Fases">
                <select name="fases" className="campo-input" defaultValue={3}>
                  <option value={3}>Trifásico</option>
                  <option value={1}>Monofásico</option>
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Fabricante (opcional)">
                  <input name="fabricante" className="campo-input" />
                </Campo>
                <Campo label="N° de serie (opcional)">
                  <input name="numero_serie" className="campo-input" />
                </Campo>
              </div>
            </>
          )}

          {tipo === "capacitor" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Potencia reactiva (kVAr)">
                  <input
                    name="potencia_kvar"
                    required
                    type="number"
                    step="any"
                    className="campo-input"
                    placeholder="Ej: 300"
                  />
                </Campo>
                <Campo label="Tensión (kV)">
                  <input
                    name="tension_kv"
                    required
                    type="number"
                    step="any"
                    defaultValue={13.2}
                    className="campo-input"
                  />
                </Campo>
              </div>
              <Campo label="Tipo de banco">
                <select name="tipo_capacitor" className="campo-input" defaultValue="fijo">
                  <option value="fijo">Fijo</option>
                  <option value="automatico">Automático</option>
                </select>
              </Campo>
            </>
          )}

          {tipo === "generador" && (
            <>
              <Campo label="Tipo de motor">
                <select name="tipo_motor" className="campo-input" defaultValue="gas">
                  <option value="gas">Gas</option>
                  <option value="diesel">Diésel</option>
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Potencia (kVA)">
                  <input
                    name="potencia_kva_generador"
                    required
                    type="number"
                    step="any"
                    className="campo-input"
                  />
                </Campo>
                <Campo label="Tensión de salida (kV)">
                  <input
                    name="tension_salida_kv"
                    required
                    type="number"
                    step="any"
                    defaultValue={13.2}
                    className="campo-input"
                  />
                </Campo>
              </div>
            </>
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
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-300">
      {label}
      {children}
    </label>
  );
}
