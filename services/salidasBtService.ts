import { supabase } from "@/lib/supabase/client";
import type { SalidaBTEstado } from "@/types";

export async function obtenerSalidasBTDeTransformador(
  elementoId: string
): Promise<SalidaBTEstado[]> {
  const { data, error } = await supabase
    .from("v_salidas_bt_estado")
    .select("*")
    .eq("transformador_elemento_id", elementoId)
    .order("numero");

  if (error) throw error;
  return (data ?? []) as SalidaBTEstado[];
}

export async function obtenerSalidasBTAbiertas(): Promise<SalidaBTEstado[]> {
  const { data, error } = await supabase
    .from("v_salidas_bt_estado")
    .select("*")
    .eq("estado", "abierto");

  if (error) throw error;
  return (data ?? []) as SalidaBTEstado[];
}

export async function crearSalidaBT(
  transformadorId: string,
  numero: 1 | 2 | 3 | 4,
  nombre?: string
) {
  const { data, error } = await supabase
    .from("salidas_bt")
    .insert({ transformador_id: transformadorId, numero, nombre: nombre || null })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function suscribirseASalidasBT(onCambio: () => void) {
  const canal = supabase
    .channel("salidas-bt-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "salidas_bt" },
      () => onCambio()
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "eventos" },
      () => onCambio()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}
