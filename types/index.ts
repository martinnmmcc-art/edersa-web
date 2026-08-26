export type TipoElemento =
  | "reconectador"
  | "seccionador"
  | "cuchilla"
  | "omnirouter"
  | "transformador"
  | "capacitor"
  | "central_termica"
  | "barra"
  | "generador";

export type TipoEvento = "apertura" | "cierre" | "falla" | "reposicion";

export type EstadoElemento = "cerrado" | "abierto" | "desconocido";

export type TensionSecundariaBT = "220" | "380" | "380/220";
export type TipoCapacitor = "fijo" | "automatico";
export type TipoMotor = "gas" | "diesel";

export interface Alimentador {
  id: string;
  nombre: string;
  tension_kv: 13.2 | 33;
  color_mapa: string;
  activo: boolean;
}

export interface ElementoEstado {
  id: string;
  nombre: string;
  tipo: TipoElemento;
  alimentador_id: string | null;
  alimentador_nombre: string | null;
  tension_kv: number | null;
  alimentador_id_b: string | null;
  alimentador_b_nombre: string | null;
  lat: number;
  lng: number;
  codigo: string | null;
  activo: boolean;
  ultimo_evento_tipo: TipoEvento | null;
  ultimo_evento_motivo: TipoMotivo | null;
  ultimo_evento_usuario: string | null;
  ultimo_evento_fecha: string | null;
  estado: EstadoElemento;
}

export interface EventoInput {
  client_uuid: string;
  elemento_id?: string;
  salida_bt_id?: string;
  tipo: TipoEvento;
  usuario: string;
  motivo?: TipoMotivo;
  observaciones?: string;
  foto_url?: string;
  fecha: string;
}

export interface EventoPendiente extends EventoInput {
  intentos: number;
  creado_en: string;
}

export interface Transformador {
  id: string;
  elemento_id: string;
  potencia_kva: number;
  tension_primaria_kv: number;
  tension_secundaria_v: TensionSecundariaBT;
  fases: 1 | 3;
  fabricante?: string | null;
  numero_serie?: string | null;
  fecha_instalacion?: string | null;
}

export interface NuevoTransformadorInput {
  nombre: string;
  alimentador_id: string | null;
  lat: number;
  lng: number;
  potencia_kva: number;
  tension_primaria_kv: number;
  tension_secundaria_v: TensionSecundariaBT;
  fases: 1 | 3;
  fabricante?: string;
  numero_serie?: string;
}

export interface Capacitor {
  id: string;
  elemento_id: string;
  potencia_kvar: number;
  tension_kv: number;
  tipo: TipoCapacitor;
}

export interface NuevoCapacitorInput {
  nombre: string;
  alimentador_id: string | null;
  lat: number;
  lng: number;
  potencia_kvar: number;
  tension_kv: number;
  tipo: TipoCapacitor;
}

export interface Generador {
  id: string;
  elemento_id: string;
  tipo_motor: TipoMotor;
  potencia_kva: number;
  tension_salida_kv: number;
}

export interface NuevoGeneradorInput {
  nombre: string;
  alimentador_id: string | null;
  lat: number;
  lng: number;
  tipo_motor: TipoMotor;
  potencia_kva: number;
  tension_salida_kv: number;
}

export interface NuevoElementoInput {
  nombre: string;
  tipo: TipoElemento;
  alimentador_id: string | null;
  alimentador_id_b?: string | null;
  lat: number;
  lng: number;
  codigo?: string;
}

export interface ActualizarElementoInput {
  id: string;
  nombre: string;
  alimentador_id: string | null;
  alimentador_id_b?: string | null;
}

export type ModoMapa = "calles" | "satelite" | "hibrida" | "topografico";

export type TipoMotivo =
  | "poda"
  | "mantenimiento"
  | "preventivo"
  | "falla"
  | "transferencia_carga"
  | "otro";

export interface SalidaBTEstado {
  id: string;
  transformador_id: string;
  numero: number;
  nombre: string | null;
  transformador_elemento_id: string;
  transformador_nombre: string;
  ultimo_evento_tipo: TipoEvento | null;
  ultimo_evento_motivo: TipoMotivo | null;
  ultimo_evento_usuario: string | null;
  ultimo_evento_fecha: string | null;
  estado: EstadoElemento;
}

export interface ManiobraHistorial {
  id: string;
  tipo: TipoEvento;
  motivo: TipoMotivo | null;
  usuario: string;
  observaciones: string | null;
  fecha: string;
  origen: string;
  objetivo_tipo: "elemento" | "salida_bt";
  objetivo_elemento_id: string;
  objetivo_nombre: string;
  objetivo_tipo_elemento: string;
}

export type Turno = "mañana" | "tarde" | "noche";

export interface ResumenTurno {
  clave: string;
  fechaTurno: string;
  turno: Turno;
  total: number;
  aperturas: number;
  cierres: number;
  porMotivo: Record<string, number>;
}

export type TensionTramo = "MT" | "BT";

export interface TramoLinea {
  id: string;
  alimentador_id: string | null;
  tension: TensionTramo;
  nombre: string | null;
  color: string | null;
  puntos: [number, number][]; // [lng, lat][]
}

export interface NuevoTramoInput {
  alimentador_id: string | null;
  tension: TensionTramo;
  nombre?: string;
  color?: string;
  puntos: [number, number][];
}
