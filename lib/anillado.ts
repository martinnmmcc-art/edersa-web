import type { Alimentador, ElementoEstado, TramoLinea } from "@/types";

const COLOR_DEFECTO_MT = "#facc15";
const COLOR_DEFECTO_BT = "#38bdf8";

/**
 * Devuelve el color con el que hay que pintar un tramo AHORA MISMO.
 *
 * Prioridad:
 * 1. Si el tramo tiene `elemento_frontera_id` (es un tramo de anillo) y
 *    ese elemento (el omnirouter que define el anillo) está CERRADO,
 *    se pinta con el color del alimentador secundario — significa que
 *    en este momento lo está alimentando el otro lado del anillo.
 * 2. Si no, con el color del alimentador principal asignado.
 * 3. Si el tramo no tiene alimentador asignado, con el color manual que
 *    se le haya puesto al crear el tramo.
 * 4. Si tampoco eso, un color por defecto según la tensión (MT/BT).
 */
export function resolverColorTramo(
  tramo: TramoLinea,
  alimentadores: Alimentador[],
  elementos: ElementoEstado[]
): string {
  let alimentadorActivoId = tramo.alimentador_id;

  if (tramo.elemento_frontera_id) {
    const frontera = elementos.find((e) => e.id === tramo.elemento_frontera_id);
    if (frontera?.estado === "cerrado" && tramo.alimentador_id_b) {
      alimentadorActivoId = tramo.alimentador_id_b;
    }
  }

  const alimentador = alimentadores.find((a) => a.id === alimentadorActivoId);
  if (alimentador?.color_mapa) return alimentador.color_mapa;
  if (tramo.color) return tramo.color;
  return tramo.tension === "MT" ? COLOR_DEFECTO_MT : COLOR_DEFECTO_BT;
}

/** Texto legible de qué alimentador está sirviendo el tramo ahora mismo. */
export function describirEstadoAnillo(
  tramo: TramoLinea,
  alimentadores: Alimentador[],
  elementos: ElementoEstado[]
): string | null {
  if (!tramo.elemento_frontera_id || !tramo.alimentador_id_b) return null;

  const frontera = elementos.find((e) => e.id === tramo.elemento_frontera_id);
  const principal = alimentadores.find((a) => a.id === tramo.alimentador_id);
  const secundario = alimentadores.find((a) => a.id === tramo.alimentador_id_b);
  const anillado = frontera?.estado === "cerrado";

  const activo = anillado ? secundario : principal;

  return `Anillo ${principal?.nombre ?? "?"} ↔ ${secundario?.nombre ?? "?"} por ${
    frontera?.nombre ?? "elemento frontera"
  } — activo ahora: ${activo?.nombre ?? "sin datos"}`;
}
