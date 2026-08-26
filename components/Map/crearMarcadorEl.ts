import { COLOR_ESTADO, ICONO_TIPO } from "@/lib/estado";
import type { ElementoEstado } from "@/types";

const COLOR_SIN_TENSION = "#6b7280"; // gris — no le llega energía desde ninguna fuente

export function crearMarcadorEl(
  elemento: ElementoEstado,
  seleccionado: boolean,
  energizado: boolean = true
) {
  const tamaño = seleccionado ? 40 : 32;

  const raiz = document.createElement("div");
  raiz.style.width = `${tamaño}px`;
  raiz.style.height = `${tamaño}px`;
  raiz.style.cursor = "pointer";

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "100%";
  wrapper.style.height = "100%";

  const circulo = document.createElement("div");
  circulo.style.width = `${tamaño}px`;
  circulo.style.height = `${tamaño}px`;
  circulo.style.borderRadius = "9999px";
  circulo.style.display = "flex";
  circulo.style.alignItems = "center";
  circulo.style.justifyContent = "center";
  circulo.style.fontWeight = "700";
  circulo.style.fontFamily = "'Barlow Condensed', sans-serif";
  circulo.style.fontSize = seleccionado ? "16px" : "14px";
  circulo.style.color = "#0b0f14";
  // Si no le llega tensión, gris manda por encima del verde/rojo — es
  // el dato operativo más importante en ese momento.
  circulo.style.background = energizado ? COLOR_ESTADO[elemento.estado] : COLOR_SIN_TENSION;
  circulo.style.border = seleccionado ? "3px solid #ffb100" : "2px solid #0b0f14";
  circulo.style.boxShadow = "0 2px 6px rgba(0,0,0,0.5)";
  if (!energizado) {
    circulo.style.opacity = "0.55";
  }
  circulo.textContent = ICONO_TIPO[elemento.tipo];

  const etiqueta = document.createElement("div");
  etiqueta.textContent = elemento.codigo || elemento.nombre;
  etiqueta.style.position = "absolute";
  etiqueta.style.top = "100%";
  etiqueta.style.left = "50%";
  etiqueta.style.transform = "translateX(-50%)";
  etiqueta.style.marginTop = "3px";
  etiqueta.style.fontFamily = "'Barlow Condensed', sans-serif";
  etiqueta.style.fontSize = "12px";
  etiqueta.style.fontWeight = "600";
  etiqueta.style.color = "#f1f5f9";
  etiqueta.style.background = "rgba(11, 15, 20, 0.85)";
  etiqueta.style.padding = "1px 6px";
  etiqueta.style.borderRadius = "4px";
  etiqueta.style.whiteSpace = "nowrap";
  etiqueta.style.maxWidth = "140px";
  etiqueta.style.overflow = "hidden";
  etiqueta.style.textOverflow = "ellipsis";
  etiqueta.style.pointerEvents = "none";

  wrapper.appendChild(circulo);
  wrapper.appendChild(etiqueta);
  raiz.appendChild(wrapper);

  raiz.setAttribute("role", "button");
  raiz.setAttribute(
    "aria-label",
    `${elemento.nombre}, ${elemento.tipo}, estado ${elemento.estado}${
      energizado ? "" : ", sin tensión"
    }`
  );
  return raiz;
}
