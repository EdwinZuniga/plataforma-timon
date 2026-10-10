import { cn } from '@/utils/cn'

// Mapa de Google incrustado (interactivo: arrastrar, mover y zoom) centrado en un punto.
export function MapaUbicacion({ latitud, longitud, zoom = 16, className }) {
  return (
    <iframe
      title="Mapa de la ubicación"
      src={`https://maps.google.com/maps?q=${latitud},${longitud}&z=${zoom}&output=embed`}
      className={cn('w-full h-56 rounded-md border', className)}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}
