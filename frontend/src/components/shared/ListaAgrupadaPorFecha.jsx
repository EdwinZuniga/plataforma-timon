// Renderiza grupos [{ key, label, dias: [{ key, label, items }] }] con encabezado
// de mes fijo (sticky) y subtítulo por día — estilo Google Photos.
// `renderItem(item)` dibuja cada elemento de la lista.
export function ListaAgrupadaPorFecha({ grupos, renderItem }) {
  return (
    <div className="space-y-6">
      {grupos.map((mes) => (
        <section key={mes.key}>
          <h2 className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 text-lg font-semibold">
            {mes.label}
          </h2>
          <div className="mt-2 space-y-4">
            {mes.dias.map((dia) => (
              <div key={dia.key}>
                <p className="mb-1.5 px-1 text-sm font-medium text-muted-foreground">{dia.label}</p>
                <div className="space-y-2">
                  {dia.items.map((it) => renderItem(it))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
