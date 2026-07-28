import { Phone, MessageCircle } from 'lucide-react'
import { soloDigitos, numeroWhatsApp } from '@/utils/phone'
import { cn } from '@/utils/cn'

export function PhoneActions({ telefono, className }) {
  if (!telefono) return null
  const digitos = soloDigitos(telefono)
  const wa = numeroWhatsApp(telefono)

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <a
        href={`tel:${digitos}`}
        onClick={(e) => e.stopPropagation()}
        title="Llamar"
        className="p-1 rounded text-muted-foreground hover:text-primary-700 dark:hover:text-primary-500 hover:bg-muted transition-colors"
      >
        <Phone className="h-3.5 w-3.5" />
      </a>
      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Escribir por WhatsApp"
          className="p-1 rounded text-muted-foreground hover:text-green-600 hover:bg-muted transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  )
}
