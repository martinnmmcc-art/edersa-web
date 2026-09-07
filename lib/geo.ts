export interface Punto {
  lat: number;
  lng: number;
}

/** Distancia en metros entre dos puntos (fórmula haversine). */
export function distanciaMetros(a: Punto, b: Punto): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Busca el candidato más cercano a `punto` dentro de `umbralMetros`.
 * Se usa para "pegar" un punto recién tocado a un elemento o a un
 * vértice de otro tramo ya existente.
 */
export function buscarPuntoCercano(
  punto: Punto,
  candidatos: Punto[],
  umbralMetros: number
): Punto | null {
  let mejor: Punto | null = null;
  let mejorDistancia = umbralMetros;

  for (const candidato of candidatos) {
    const d = distanciaMetros(punto, candidato);
    if (d <= mejorDistancia) {
      mejorDistancia = d;
      mejor = candidato;
    }
  }

  return mejor;
}

/**
 * Proyecta `p` sobre el segmento a-b y devuelve el punto más cercano DEL
 * SEGMENTO (no solo de sus extremos) más la distancia a ese punto.
 * Aproximación plana simple (válida a escala de barrio/ciudad, no hace
 * falta geodesia exacta para esta precisión).
 */
export function proyectarPuntoEnSegmento(
  p: Punto,
  a: Punto,
  b: Punto
): Punto & { distancia: number } {
  const factorLng = Math.cos((a.lat * Math.PI) / 180);
  const ax = a.lng * factorLng;
  const ay = a.lat;
  const bx = b.lng * factorLng;
  const by = b.lat;
  const px = p.lng * factorLng;
  const py = p.lat;

  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;

  let t = largo2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / largo2;
  t = Math.max(0, Math.min(1, t));

  const proyectado: Punto = {
    lat: a.lat + t * (b.lat - a.lat),
    lng: a.lng + t * (b.lng - a.lng),
  };

  return { ...proyectado, distancia: distanciaMetros(p, proyectado) };
}

/**
 * Saca puntos duplicados consecutivos de una polilínea (ej: [A,A,B] ->
 * [A,B]). Evita que se acumulen segmentos de largo cero cuando un
 * mismo punto se empalma más de una vez en el mismo lugar — eso
 * confunde la búsqueda de "pegado" en intentos posteriores.
 */
export function deduplicarPuntosConsecutivos(
  puntos: [number, number][]
): [number, number][] {
  const resultado: [number, number][] = [];
  for (const p of puntos) {
    const anterior = resultado[resultado.length - 1];
    if (!anterior || anterior[0] !== p[0] || anterior[1] !== p[1]) {
      resultado.push(p);
    }
  }
  return resultado;
}

export interface TramoParaSnap {
  id: string;
  puntos: [number, number][]; // [lng, lat][]
}

export interface EmpalmePendiente {
  tramoId: string;
  segmentoIndice: number; // el punto nuevo va DESPUÉS de este índice
}

export interface ResultadoSnap {
  punto: Punto;
  empalme: EmpalmePendiente | null;
}

/**
 * Busca el tramo/segmento más cercano a un punto que YA EXISTE (por
 * ejemplo, un elemento ya cargado) — para "soldarlo" a esa línea sin
 * moverlo. A diferencia de `buscarPuntoDeSnap`, acá el punto que se va
 * a insertar en el tramo viejo es el mismo `punto` de entrada (no uno
 * proyectado), porque el objetivo es unir el elemento tal cual está,
 * no correrlo a la línea.
 */
export function buscarSegmentoMasCercano(
  punto: Punto,
  tramos: TramoParaSnap[],
  umbralMetros: number
): EmpalmePendiente | null {
  let mejor: EmpalmePendiente | null = null;
  let mejorDistancia = umbralMetros;

  for (const tramo of tramos) {
    for (let i = 0; i < tramo.puntos.length - 1; i++) {
      const [lngA, latA] = tramo.puntos[i];
      const [lngB, latB] = tramo.puntos[i + 1];
      if (lngA === lngB && latA === latB) continue; // segmento de largo cero: ignorar
      const proy = proyectarPuntoEnSegmento(punto, { lat: latA, lng: lngA }, { lat: latB, lng: lngB });
      if (proy.distancia <= mejorDistancia) {
        mejorDistancia = proy.distancia;
        mejor = { tramoId: tramo.id, segmentoIndice: i };
      }
    }
  }

  return mejor;
}

/**
 * Punto de "pegado" al trazar, considerando TODO lo que puede conectar:
 * elementos, vértices de tramos ya trazados, y cualquier punto a lo
 * largo de un tramo (no solo sus vértices).
 *
 * Importante: compara TODOS los candidatos por distancia real y se
 * queda con el más cercano — antes priorizaba ciegamente cualquier
 * vértice existente dentro del radio aunque hubiera un punto bastante
 * más cerca sobre otra línea, lo que hacía "saltar" el pegado a un
 * lugar más lejano del que el operario realmente estaba tocando.
 */
export function buscarPuntoDeSnap(
  click: Punto,
  puntosElementos: Punto[],
  tramos: TramoParaSnap[],
  umbralMetros: number
): ResultadoSnap | null {
  let mejor: ResultadoSnap | null = null;
  let mejorDistancia = umbralMetros;

  const vertices: Punto[] = [
    ...puntosElementos,
    ...tramos.flatMap((t) => t.puntos.map(([lng, lat]) => ({ lat, lng }))),
  ];
  for (const v of vertices) {
    const d = distanciaMetros(click, v);
    if (d <= mejorDistancia) {
      mejorDistancia = d;
      mejor = { punto: v, empalme: null };
    }
  }

  for (const tramo of tramos) {
    for (let i = 0; i < tramo.puntos.length - 1; i++) {
      const [lngA, latA] = tramo.puntos[i];
      const [lngB, latB] = tramo.puntos[i + 1];
      if (lngA === lngB && latA === latB) continue; // segmento de largo cero: ignorar
      const proy = proyectarPuntoEnSegmento(click, { lat: latA, lng: lngA }, { lat: latB, lng: lngB });
      if (proy.distancia <= mejorDistancia) {
        mejorDistancia = proy.distancia;
        mejor = {
          punto: { lat: proy.lat, lng: proy.lng },
          empalme: { tramoId: tramo.id, segmentoIndice: i },
        };
      }
    }
  }

  return mejor;
}
