"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerTramos, suscribirseATramos } from "@/services/tramosService";
import type { TramoLinea } from "@/types";

export function useTramos() {
  const [tramos, setTramos] = useState<TramoLinea[]>([]);

  const cargar = useCallback(async () => {
    try {
      const data = await obtenerTramos();
      setTramos(data);
    } catch {
      /* si falla, el mapa simplemente no muestra tramos hasta la próxima carga */
    }
  }, []);

  useEffect(() => {
    cargar();
    const cancelar = suscribirseATramos(() => cargar());
    return cancelar;
  }, [cargar]);

  return { tramos, recargar: cargar };
}
