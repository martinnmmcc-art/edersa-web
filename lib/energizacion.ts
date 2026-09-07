import { TIPOS_INTERRUPTOR } from "@/lib/estado";
import type { ElementoEstado, TramoLinea } from "@/types";

// Por más que no estén marcados a mano como "fuente", estos tipos
// siempre inyectan energía (si existen en el mapa).
const TIPOS_FUENTE_AUTOMATICA = new Set(["barra", "central_termica"]);

function clave(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Clave de un SEGMENTO puntual (no de todo el tramo): tramoId + índice. */
function claveSegmento(tramoId: string, indice: number): string {
  return `${tramoId}::${indice}`;
}

interface Arista {
  destino: string;
  tramoId: string;
  segmentoIndice: number;
}

export interface ResultadoEnergizacion {
  // Antes esto marcaba el TRAMO entero como energizado apenas UNO de
  // sus segmentos tenía tensión — el bug real: un tramo largo con el
  // corte en el medio se pintaba entero con color, en vez de solo la
  // mitad que realmente tiene tensión. Ahora se trackea por segmento
  // individual (cada tramo puede tener docenas, uno entre cada par de
  // puntos consecutivos).
  segmentosEnergizados: Set<string>;
  elementosEnergizados: Set<string>;
}

/**
 * Recorre el grafo de la red (cada segmento entre dos puntos
 * consecutivos de un tramo es una arista, sus puntos son los nodos)
 * desde cada elemento marcado como fuente, y devuelve qué segmentos y
 * elementos quedan "con tensión" en este momento.
 *
 * Un interruptor (reconectador/seccionador/cuchilla/omnirouter) que
 * está ABIERTO corta el recorrido en su punto: él mismo queda
 * energizado (le llega tensión hasta ahí) pero nada más allá de él, en
 * esa dirección, se marca como energizado — y eso incluye el resto del
 * MISMO tramo si el corte cae en el medio de su recorrido.
 */
export function calcularEnergizacion(
  tramos: TramoLinea[],
  elementos: ElementoEstado[]
): ResultadoEnergizacion {
  const adyacencia = new Map<string, Arista[]>();

  function agregarArista(a: string, b: string, tramoId: string, segmentoIndice: number) {
    if (!adyacencia.has(a)) adyacencia.set(a, []);
    adyacencia.get(a)!.push({ destino: b, tramoId, segmentoIndice });
  }

  for (const tramo of tramos) {
    for (let i = 0; i < tramo.puntos.length - 1; i++) {
      const [lngA, latA] = tramo.puntos[i];
      const [lngB, latB] = tramo.puntos[i + 1];
      const a = clave(latA, lngA);
      const b = clave(latB, lngB);
      agregarArista(a, b, tramo.id, i);
      agregarArista(b, a, tramo.id, i);
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
    return els.some(
      (e) => TIPOS_INTERRUPTOR.has(e.tipo) && e.estado === "abierto" && e.corta_circuito
    );
  }

  const fuentes: string[] = [];
  for (const el of elementos) {
    if (el.es_fuente || TIPOS_FUENTE_AUTOMATICA.has(el.tipo)) {
      fuentes.push(clave(el.lat, el.lng));
    }
  }

  const verticesEnergizados = new Set<string>();
  const segmentosEnergizados = new Set<string>();
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
      // Se marca el SEGMENTO puntual, no todo el tramo — así un corte
      // en el medio de una línea larga solo apaga lo que sigue después
      // del corte, no la línea completa.
      segmentosEnergizados.add(claveSegmento(arista.tramoId, arista.segmentoIndice));
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

  return { segmentosEnergizados, elementosEnergizados };
}
