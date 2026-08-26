import type { ResumenTurno, Turno } from "@/types";

export function obtenerTurno(fecha: Date): Turno {
  const h = fecha.getHours();
  if (h >= 7 && h < 15) return "mañana";
  if (h >= 15 && h < 23) return "tarde";
  return "noche";
}

export function fechaDelTurno(fecha: Date): string {
  const d = new Date(fecha);
  if (d.getHours() < 7) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface ManiobraMinima {
  tipo: string;
  motivo: string | null;
  fecha: string;
}

export function resumenPorTurno(maniobras: ManiobraMinima[]): ResumenTurno[] {
  const grupos = new Map<string, ResumenTurno>();

  for (const m of maniobras) {
    const fecha = new Date(m.fecha);
    const turno = obtenerTurno(fecha);
    const fechaTurno = fechaDelTurno(fecha);
    const clave = `${fechaTurno}__${turno}`;

    if (!grupos.has(clave)) {
      grupos.set(clave, {
        clave,
        fechaTurno,
        turno,
        total: 0,
        aperturas: 0,
        cierres: 0,
        porMotivo: {},
      });
    }

    const g = grupos.get(clave)!;
    g.total += 1;
    if (m.tipo === "apertura" || m.tipo === "falla") g.aperturas += 1;
    if (m.tipo === "cierre" || m.tipo === "reposicion") g.cierres += 1;

    const motivo = m.motivo ?? "sin especificar";
    g.porMotivo[motivo] = (g.porMotivo[motivo] ?? 0) + 1;
  }

  const ORDEN_TURNO: Record<Turno, number> = { noche: 2, tarde: 1, "mañana": 0 };
  return Array.from(grupos.values()).sort((a, b) => {
    if (a.fechaTurno !== b.fechaTurno) return a.fechaTurno < b.fechaTurno ? 1 : -1;
    return ORDEN_TURNO[b.turno] - ORDEN_TURNO[a.turno];
  });
}
