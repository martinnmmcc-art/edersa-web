import { supabase } from "@/lib/supabase/client";
import type { ManiobraHistorial } from "@/types";

export async function obtenerHistorial(limite = 300): Promise<ManiobraHistorial[]> {
  const { data, error } = await supabase
    .from("v_historial_maniobras")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(limite);

  if (error) throw error;
  return (data ?? []) as ManiobraHistorial[];
}
