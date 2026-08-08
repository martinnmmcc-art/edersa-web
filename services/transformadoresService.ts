import { supabase } from "@/lib/supabase/client";
import type { NuevoTransformadorInput } from "@/types";

export async function crearTransformador(input: NuevoTransformadorInput) {
  const { data: elemento, error: errElemento } = await supabase
    .from("elementos")
    .insert({
      nombre: input.nombre,
      tipo: "transformador",
      alimentador_id: input.alimentador_id,
      lat: input.lat,
      lng: input.lng,
    })
    .select()
    .single();

  if (errElemento) throw errElemento;

  const { data: transformador, error: errTransformador } = await supabase
    .from("transformadores")
    .insert({
      elemento_id: elemento.id,
      potencia_kva: input.potencia_kva,
      tension_primaria_kv: input.tension_primaria_kv,
      tension_secundaria_v: input.tension_secundaria_v,
      fases: input.fases,
      fabricante: input.fabricante ?? null,
      numero_serie: input.numero_serie ?? null,
    })
    .select()
    .single();

  if (errTransformador) {
    await supabase.from("elementos").delete().eq("id", elemento.id);
    throw errTransformador;
  }

  return { elemento, transformador };
}

export async function obtenerTransformadorPorElemento(elementoId: string) {
  const { data, error } = await supabase
    .from("transformadores")
    .select("*")
    .eq("elemento_id", elementoId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
