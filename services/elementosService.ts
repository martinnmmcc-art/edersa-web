import { supabase } from "@/lib/supabase/client";
import { nombreCanalUnico } from "@/lib/realtimeChannel";
import type { ElementoEstado } from "@/types";

export async function obtenerElementosConEstado(): Promise<ElementoEstado[]> {
  const { data, error } = await supabase
    .from("v_elementos_estado")
    .select("*")
    .eq("activo", true);

  if (error) throw error;
  return (data ?? []) as ElementoEstado[];
}

export async function obtenerAlimentadores() {
  const { data, error } = await supabase
    .from("alimentadores")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  if (error) throw error;
  return data ?? [];
}

export function suscribirseAEventos(onCambio: () => void) {
  const canal = supabase
    .channel(nombreCanalUnico("eventos-realtime"))
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "eventos" },
      () => onCambio()
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "elementos" },
      () => onCambio()
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "elementos" },
      () => onCambio()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}

export async function crearElemento(input: {
  nombre: string;
  tipo: string;
  alimentador_id: string | null;
  alimentador_id_b?: string | null;
  lat: number;
  lng: number;
  codigo?: string;
}) {
  const { data, error } = await supabase
    .from("elementos")
    .insert({
      nombre: input.nombre,
      tipo: input.tipo,
      alimentador_id: input.alimentador_id,
      alimentador_id_b: input.alimentador_id_b ?? null,
      lat: input.lat,
      lng: input.lng,
      codigo: input.codigo,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function actualizarElemento(
  id: string,
  cambios: { nombre?: string; alimentador_id?: string | null; alimentador_id_b?: string | null }
) {
  const { error } = await supabase.from("elementos").update(cambios).eq("id", id);
  if (error) throw error;
}

export async function darDeBajaElemento(id: string) {
  const { error } = await supabase
    .from("elementos")
    .update({ activo: false })
    .eq("id", id);
  if (error) throw error;
}
