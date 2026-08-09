"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

type Punto = {
  id: string
  lat: number
  lng: number
  nombre?: string
}

type Props = {
  puntos: Punto[]
}

export default function MapView({ puntos }: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapContainer = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    // 🔵 Inicializar mapa
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-64.18, -31.42], // ajustá a tu zona
      zoom: 12,
    })

    mapRef.current = map

    // 🔵 Agregar controles
    map.addControl(new maplibregl.NavigationControl(), "top-right")

    // 🔴 CUANDO CARGA EL MAPA
    map.on("load", () => {
      puntos.forEach((p) => {
        crearMarker(map, p)
      })
    })

    return () => {
      map.remove()
    }
  }, [puntos])

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: "100%" }}
    />
  )
}

//
// ✅ FUNCIÓN CORRECTA DE MARKER
//
function crearMarker(map: maplibregl.Map, punto: Punto) {
  // 🔴 CONTENEDOR RAÍZ (NO TOCAR POSITION)
  const contenedor = document.createElement("div")

  // 🟢 WRAPPER INTERNO (ACÁ SÍ VA RELATIVE)
  const wrapper = document.createElement("div")
  wrapper.style.position = "relative"
  wrapper.style.display = "flex"
  wrapper.style.flexDirection = "column"
  wrapper.style.alignItems = "center"

  // 🔵 ICONO
  const icono = document.createElement("div")
  icono.style.width = "14px"
  icono.style.height = "14px"
  icono.style.borderRadius = "50%"
  icono.style.background = "red"
  icono.style.border = "2px solid white"

  // 🟡 LABEL
  if (punto.nombre) {
    const label = document.createElement("div")
    label.innerText = punto.nombre

    label.style.position = "absolute"
    label.style.top = "18px"
    label.style.background = "white"
    label.style.padding = "2px 6px"
    label.style.borderRadius = "4px"
    label.style.fontSize = "12px"
    label.style.whiteSpace = "nowrap"
    label.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)"

    wrapper.appendChild(label)
  }

  wrapper.appendChild(icono)
  contenedor.appendChild(wrapper)

  // ✅ CREACIÓN CORRECTA
  new maplibregl.Marker({
    element: contenedor,
    anchor: "bottom",
  })
    .setLngLat([punto.lng, punto.lat])
    .addTo(map)
}
