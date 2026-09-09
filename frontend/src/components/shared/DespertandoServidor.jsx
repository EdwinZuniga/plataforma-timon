// Animación de espera mientras el servidor / la base de datos se reactivan.
// La BD de Azure se autopausa por inactividad varias veces al día; en vez de
// fallar el login, mostramos progreso para que la persona sepa qué ocurre.

function mensajePara(segundos) {
  if (segundos < 6) return 'Verificando tu acceso…'
  if (segundos < 20) return 'Encendiendo el servidor…'
  if (segundos < 45) return 'Reactivando la base de datos, ya casi…'
  return 'Está tardando un poco más de lo normal. Seguimos intentando…'
}

export default function DespertandoServidor({ segundos = 0 }) {
  // Llenado por tiempo transcurrido: se acerca al 95 % en ~60 s y nunca
  // llega solo al 100 % (eso lo marca el login exitoso).
  const pct = Math.min(95, Math.round((segundos / 60) * 95))

  return (
    <div className="flex flex-col items-center text-center py-6 space-y-5">
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-16 w-16 rounded-full bg-primary-700/20 animate-ping" />
        <span className="relative inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-700 text-3xl">
          ⚓
        </span>
      </div>

      <div className="space-y-1">
        <p className="font-medium text-foreground">{mensajePara(segundos)}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{segundos}s</p>
      </div>

      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary-700 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground max-w-xs">
        La base de datos se apaga cuando no hay actividad y tarda unos segundos en
        volver. No cierres esta ventana.
      </p>
    </div>
  )
}
