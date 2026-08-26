import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase/client";
import { encolarEvento } from "@/lib/db/offlineQueue";
import type { EventoInput, TipoEvento, TipoMotivo } from "@/types";

export async function registrarEvento(params: {
  elemento_id?: string;
  salida_bt_id?: string;
  tipo: TipoEvento;
  usuario: string;
  motivo?: TipoMotivo;
  observaciones?: string;
}): Promise<{ ok: boolean; offline: boolean }> {
  if (!params.elemento_id === !params.salida_bt_id) {
    throw new Error("registrarEvento necesita elemento_id O salida_bt_id (uno solo).");
  }

  const evento: EventoInput = {
    client_uuid: uuidv4(),
    elemento_id: params.elemento_id,
    salida_bt_id: params.salida_bt_id,
    tipo: params.tipo,
    usuario: params.usuario,
    motivo: params.motivo,
    observaciones: params.observaciones,
    fecha: new Date().toISOString(),
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await encolarEvento({ ...evento, intentos: 0, creado_en: evento.fecha });
    return { ok: true, offline: true };
  }

  const { error } = await supabase.from("eventos").insert({
    client_uuid: evento.client_uuid,
    elemento_id: evento.elemento_id ?? null,
    salida_bt_id: evento.salida_bt_id ?? null,
    tipo: evento.tipo,
    usuario: evento.usuario,
    motivo: evento.motivo ?? null,
    observaciones: evento.observaciones ?? null,
    fecha: evento.fecha,
    origen: "online",
  });

  if (error) {
    await encolarEvento({ ...evento, intentos: 0, creado_en: evento.fecha });
    return { ok: true, offline: true };
  }

  return { ok: true, offline: false };
}

export async function enviarEventoPendiente(evento: EventoInput) {
  const { error } = await supabase.from("eventos").insert({
    client_uuid: evento.client_uuid,
    elemento_id: evento.elemento_id ?? null,
    salida_bt_id: evento.salida_bt_id ?? null,
    tipo: evento.tipo,
    usuario: evento.usuario,
    motivo: evento.motivo ?? null,
    observaciones: evento.observaciones ?? null,
    foto_url: evento.foto_url ?? null,
    fecha: evento.fecha,
    origen: "offline_sync",
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}
