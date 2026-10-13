import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { coordenadasValidas, enlaceGoogleMaps, enlaceWaze } from '@/utils/ubicacion'

const COLOR_ESTADO = {
  ACTIVA: '#16a34a',
  PROCESO_INSCRIPCION: '#d97706',
  INACTIVA: '#6b7280',
}
const LABEL_ESTADO = {
  ACTIVA: 'Activa',
  PROCESO_INSCRIPCION: 'En proceso',
  INACTIVA: 'Inactiva',
}

const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const icono = (estado) => L.divIcon({
  className: '',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -28],
  html: `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 0C4.9 0 0 4.9 0 11c0 8.2 11 19 11 19s11-10.8 11-19C22 4.9 17.1 0 11 0z" fill="${COLOR_ESTADO[estado] || COLOR_ESTADO.ACTIVA}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="11" cy="11" r="4" fill="#fff"/></svg>`,
})

// Mapa general (OpenStreetMap + Leaflet) con un marcador por comunidad que tenga coordenadas.
export function MapaComunidades({ comunidades, onAbrir }) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)
  const onAbrirRef = useRef(onAbrir)
  onAbrirRef.current = onAbrir

  useEffect(() => {
    mapa.current = L.map(contenedor.current, { zoomControl: true }).setView([13.7, -89.2], 10)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa.current)
    capa.current = L.layerGroup().addTo(mapa.current)
    return () => { mapa.current.remove(); mapa.current = null }
  }, [])

  useEffect(() => {
    if (!mapa.current) return
    capa.current.clearLayers()
    const puntos = []
    comunidades.filter((c) => coordenadasValidas(c.latitud, c.longitud)).forEach((c) => {
      const pos = [c.latitud, c.longitud]
      puntos.push(pos)
      const popup = document.createElement('div')
      popup.innerHTML = `
        <p style="font-weight:600;margin:0 0 2px">${escapar(c.nombre)}</p>
        <p style="margin:0 0 6px;font-size:12px;color:#555">${escapar(c.departamento)} · ${LABEL_ESTADO[c.estado] || ''}</p>
        <div style="display:flex;gap:10px;font-size:13px;flex-wrap:wrap">
          <a href="#" data-abrir style="font-weight:600">Ver ficha</a>
          <a href="${enlaceGoogleMaps(c.latitud, c.longitud)}" target="_blank" rel="noopener noreferrer">Google Maps</a>
          <a href="${enlaceWaze(c.latitud, c.longitud)}" target="_blank" rel="noopener noreferrer">Waze</a>
        </div>`
      popup.querySelector('[data-abrir]').addEventListener('click', (e) => {
        e.preventDefault()
        onAbrirRef.current?.(c.id)
      })
      L.marker(pos, { icon: icono(c.estado), title: c.nombre }).bindPopup(popup).addTo(capa.current)
    })
    if (puntos.length) mapa.current.fitBounds(L.latLngBounds(puntos), { padding: [30, 30], maxZoom: 15 })
  }, [comunidades])

  return <div ref={contenedor} className="w-full h-[65vh] min-h-[360px] rounded-lg border z-0" />
}
