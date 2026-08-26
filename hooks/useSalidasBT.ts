"use client";

import { useCallback, useEffect, useState } from "react";
import {
  obtenerSalidasBTDeTransformador,
  suscribirseASalidasBT,
} from "@/services/salidasBtService";
import type { SalidaBTEstado } from "@/types";

export function useSalidasBT(elementoId: string) {
  const [salidas, setSalidas] = useState<SalidaBTEstado[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const data = await obtenerSalidasBTDeTransformador(elementoId);
      setSalidas(data);
    } finally {
      setCargando(false);
    }
  }, [elementoId]);

  useEffect(() => {
    cargar();
    const cancelar = suscribirseASalidasBT(() => cargar());
    return cancelar;
  }, [cargar]);

  return { salidas, cargando, recargar: cargar };
}
