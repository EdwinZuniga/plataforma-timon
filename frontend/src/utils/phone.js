export function soloDigitos(telefono) {
  return (telefono || '').replace(/\D/g, '')
}

export function numeroWhatsApp(telefono) {
  const digitos = soloDigitos(telefono)
  if (!digitos) return null
  // Números salvadoreños se guardan sin código de país (8 dígitos)
  return digitos.length === 8 ? `503${digitos}` : digitos
}
