interface Punto {
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
 * Se usa para "pegar" un punto recién tocado a un elemento o a otro
 * tramo ya existente, en vez de dejarlo como una coordenada suelta que
 * casi coincide pero no exactamente (eso es lo que rompe la topología:
 * dos líneas que deberían tocarse pero quedan a 2 metros una de otra).
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
