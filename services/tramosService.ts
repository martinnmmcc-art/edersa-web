import { supabase } from "@/lib/supabase/client";
import type { NuevoTramoInput, TramoLinea } from "@/types";

export async function obtenerTramos(): Promise<TramoLinea[]> {
  const { data, error } = await supabase
    .from("tramos_linea")
    .select("*")
    .eq("activo", true);

  if (error) throw error;
  return (data ?? []) as TramoLinea[];
}

export async function crearTramo(input: NuevoTramoInput) {
  const { data, error } = await supabase
    .from("tramos_linea")
    .insert({
      alimentador_id: input.alimentador_id,
      tension: input.tension,
      nombre: input.nombre || null,
      color: input.color || null,
      puntos: input.puntos,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function suscribirseATramos(onCambio: () => void) {
  const canal = supabase
    .channel("tramos-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tramos_linea" },
      () => onCambio()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}
