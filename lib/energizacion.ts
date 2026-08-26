import type { ElementoEstado, TramoLinea } from "@/types";

// Elementos que "cortan" el circuito cuando están abiertos. El resto
// (transformador, capacitor, generador) son derivaciones/consumos: no
// interrumpen el paso de la línea aunque estén en el medio del trazado.
const TIPOS_INTERRUPTOR = new Set(["reconectador", "seccionador", "cuchilla", "omnirouter"]);

// Por más que no estén marcados a mano como "fuente", estos tipos
// siempre inyectan energía (si existen en el mapa).
const TIPOS_FUENTE_AUTOMATICA = new Set(["barra", "central_termica"]);

// Precisión para matchear coordenadas como "el mismo punto". Con el
// snapping de 15m al trazar, dos puntos que deberían tocarse quedan con
// las mismas coordenadas exactas, así que esto es solo para absorber
// el redondeo de punto flotante, no para "acercar" puntos distintos.
function clave(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

interface Arista {
  destino: string;
  tramoId: string;
}

export interface ResultadoEnergizacion {
  tramosEnergizados: Set<string>;
  elementosEnergizados: Set<string>;
}

/**
 * Recorre el grafo de la red (tramos como aristas, sus puntos como
 * nodos) desde cada elemento marcado como fuente, y devuelve qué
 * tramos y elementos quedan "con tensión" en este momento.
 *
 * Un interruptor (reconectador/seccionador/cuchilla/omnirouter) que
 * está ABIERTO corta el recorrido en su punto: él mismo queda
 * energizado (le llega tensión hasta ahí) pero nada más allá de él, en
 * esa dirección, se marca como energizado.
 */
export function calcularEnergizacion(
  tramos: TramoLinea[],
  elementos: ElementoEstado[]
): ResultadoEnergizacion {
  const adyacencia = new Map<string, Arista[]>();

  function agregarArista(a: string, b: string, tramoId: string) {
    if (!adyacencia.has(a)) adyacencia.set(a, []);
    adyacencia.get(a)!.push({ destino: b, tramoId });
  }

  for (const tramo of tramos) {
    for (let i = 0; i < tramo.puntos.length - 1; i++) {
      const [lngA, latA] = tramo.puntos[i];
      const [lngB, latB] = tramo.puntos[i + 1];
      const a = clave(latA, lngA);
      const b = clave(latB, lngB);
      agregarArista(a, b, tramo.id);
      agregarArista(b, a, tramo.id);
    }
  }

  const elementosPorVertice = new Map<string, ElementoEstado[]>();
  for (const el of elementos) {
    const k = clave(el.lat, el.lng);
    if (!elementosPorVertice.has(k)) elementosPorVertice.set(k, []);
    elementosPorVertice.get(k)!.push(el);
  }

  function verticeBloqueado(k: string): boolean {
    const els = elementosPorVertice.get(k);
    if (!els) return false;
    return els.some((e) => TIPOS_INTERRUPTOR.has(e.tipo) && e.estado === "abierto");
  }

  const fuentes: string[] = [];
  for (const el of elementos) {
    if (el.es_fuente || TIPOS_FUENTE_AUTOMATICA.has(el.tipo)) {
      fuentes.push(clave(el.lat, el.lng));
    }
  }

  const verticesEnergizados = new Set<string>();
  const tramosEnergizados = new Set<string>();
  const cola: string[] = [];

  for (const f of fuentes) {
    if (!verticesEnergizados.has(f)) {
      verticesEnergizados.add(f);
      cola.push(f);
    }
  }

  while (cola.length > 0) {
    const actual = cola.shift()!;

    // Si acá hay un interruptor abierto, el vértice queda energizado
    // (llega tensión hasta él) pero no seguimos más allá en ninguna
    // dirección desde este punto.
    if (verticeBloqueado(actual)) continue;

    const vecinos = adyacencia.get(actual) ?? [];
    for (const arista of vecinos) {
      tramosEnergizados.add(arista.tramoId);
      if (!verticesEnergizados.has(arista.destino)) {
        verticesEnergizados.add(arista.destino);
        cola.push(arista.destino);
      }
    }
  }

  const elementosEnergizados = new Set<string>();
  for (const el of elementos) {
    if (verticesEnergizados.has(clave(el.lat, el.lng))) {
      elementosEnergizados.add(el.id);
    }
  }

  return { tramosEnergizados, elementosEnergizados };
}
