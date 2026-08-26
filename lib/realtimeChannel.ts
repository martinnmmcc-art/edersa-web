let contador = 0;

/**
 * Supabase Realtime tira error si dos canales activos comparten el mismo
 * nombre ("cannot add postgres_changes callbacks... after subscribe()").
 * Esto pasa fácil en esta app porque varios componentes pueden estar
 * suscriptos al mismo tipo de cambio a la vez (ej: AlertasPanel y
 * SalidasBTPanel, los dos escuchando salidas_bt). Por eso cada
 * suscripción arma su propio nombre de canal, aunque escuchen la misma
 * tabla.
 */
export function nombreCanalUnico(base: string): string {
  contador += 1;
  return `${base}-${contador}-${Date.now()}`;
}
