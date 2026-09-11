import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/useAuthStore'
import { getReunion, createAcuerdo, updateAcuerdo, updateReunion, generarTexto, deleteReunion, saveComisiones } from '@/api/reuniones'
import { getMiembros } from '@/api/equipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Copy, CheckCircle, Circle, Edit, Trash2, StickyNote, Check, Pencil, Users2, FileText } from 'lucide-react'
import { EditarReunionModal } from './EditarReunionModal'
import { ComisionesModal } from './ComisionesModal'
import { NotasEditor } from '@/components/NotasEditor'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export default function ReunionDetailPage() {
  const { id } = useParams()
  const { equipoActual } = useAuthStore()
  const { toast } = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [textoModal, setTextoModal] = useState(null)
  const [addingAcuerdo, setAddingAcuerdo] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [notasEditando, setNotasEditando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [comisionesModal, setComisionesModal] = useState(false)
  const [selectedResponsables, setSelectedResponsables] = useState([])

  const { data: reunion, isLoading } = useQuery({
    queryKey: ['reunion', id],
    queryFn: () => getReunion(equipoActual.id, id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const { data: miembros = [] } = useQuery({
    queryKey: ['miembros', equipoActual?.id],
    queryFn: () => getMiembros(equipoActual.id).then((r) => r.data.data),
    enabled: !!equipoActual?.id,
  })

  const miembrosActivos = miembros
    .filter((m) => m.activo)
    .sort((a, b) => (a.usuario?.nombre || '').localeCompare(b.usuario?.nombre || ''))

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { mutate: addAcuerdo, isPending: addingPending } = useMutation({
    mutationFn: (data) => createAcuerdo(equipoActual.id, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reunion', id] })
      reset()
      setSelectedResponsables([])
      setAddingAcuerdo(false)
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const toggleResponsable = (nombre) =>
    setSelectedResponsables((prev) =>
      prev.includes(nombre) ? prev.filter((n) => n !== nombre) : [...prev, nombre]
    )

  const onAddAcuerdo = (data) => {
    addAcuerdo({ ...data, responsable: selectedResponsables.join(', ') || undefined })
  }

  const { mutate: toggleCumplido } = useMutation({
    mutationFn: ({ acuerdoId, cumplido }) => updateAcuerdo(equipoActual.id, acuerdoId, { cumplido }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reunion', id] }),
  })

  const { mutate: generar, isPending: generando } = useMutation({
    mutationFn: () => generarTexto(equipoActual.id, id),
    onSuccess: (res) => setTextoModal(res.data.data.texto),
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: eliminar, isPending: eliminando } = useMutation({
    mutationFn: () => deleteReunion(equipoActual.id, id),
    onSuccess: () => {
      toast({ title: 'Reunión eliminada' })
      qc.invalidateQueries({ queryKey: ['reuniones'] })
      navigate('/reuniones')
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: guardarComisionesMut } = useMutation({
    mutationFn: (comisiones) => saveComisiones(equipoActual.id, id, comisiones),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reunion', id] })
      setComisionesModal(false)
      toast({ title: 'Comisiones guardadas' })
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const { mutate: guardarNotas, isPending: guardandoNotas } = useMutation({
    mutationFn: (html) => updateReunion(equipoActual.id, id, { notas: html }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reunion', id] })
      setNotasEditando(false)
      toast({ title: 'Notas guardadas' })
    },
    onError: (err) => toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }),
  })

  const handleEliminar = () => setConfirmEliminar(true)

  const copiarTexto = () => {
    navigator.clipboard.writeText(textoModal).then(() => toast({ title: 'Texto copiado al portapapeles' }))
  }

  if (isLoading) return <PageSpinner />
  if (!reunion) return <div className="p-6 text-muted-foreground">Reunión no encontrada</div>

  const acuerdosPendientes = reunion.acuerdos?.filter((a) => !a.cumplido).length
  const acuerdosCumplidos = reunion.acuerdos?.filter((a) => a.cumplido).length

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/reuniones"><button className="min-h-0 h-auto p-1 text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{reunion.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(reunion.fecha).toLocaleDateString('es-SV')} · {reunion.redactor?.nombre}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setEditModal(true)} title="Editar">
            <Edit className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Editar</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setNotasEditando(true)} title="Notas">
            <StickyNote className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Notas</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setComisionesModal(true)} title="Comisiones">
            <Users2 className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Comisiones</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => generar()} disabled={generando} title="Generar texto">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline ml-1">{generando ? '...' : 'Generar texto'}</span>
          </Button>
          <button
            onClick={handleEliminar}
            disabled={eliminando}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            title="Eliminar reunión"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {reunion.lugar && <p className="text-sm text-muted-foreground">📍 {reunion.lugar}</p>}
      {reunion.asistentes?.length > 0 && (
        <p className="text-sm">
          👥 {reunion.asistentes.map((a) => a.miembro.usuario.nombre).join(', ')}
        </p>
      )}
      {reunion.asistentes?.length === 0 && reunion.participantes && (
        <p className="text-sm">👥 {reunion.participantes}</p>
      )}

      {/* Comisiones */}
      {reunion.comisiones && (() => {
        const cs = JSON.parse(reunion.comisiones).filter((c) => c.miembros.length > 0)
        return cs.length > 0 ? (
          <Card>
            <CardContent className="py-3 px-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Users2 className="h-4 w-4 text-primary" /> Comisiones
                </p>
                <button
                  onClick={() => setComisionesModal(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                {cs.map((c) => (
                  <div key={c.nombre}>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{c.nombre}</p>
                    <p className="text-sm">{c.miembros.join(', ')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null
      })()}

      {/* Notas: tarjeta de solo lectura */}
      {reunion.notas && !notasEditando && (
        <Card className="border-primary-200 dark:border-primary-800/50">
          <CardContent className="py-3 px-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <StickyNote className="h-4 w-4 text-primary-700 dark:text-primary-400" /> Notas
              </p>
              <button
                onClick={() => setNotasEditando(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            </div>
            <div
              className="tiptap-content text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: reunion.notas }}
            />
          </CardContent>
        </Card>
      )}

      {/* Notas: editor */}
      {notasEditando && (
        <NotasEditor
          initialContent={reunion.notas ?? ''}
          onSave={(html) => guardarNotas(html)}
          onCancel={() => setNotasEditando(false)}
          isPending={guardandoNotas}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          <span className="text-orange-500">{acuerdosPendientes} pendientes</span>
          <span className="text-green-500">{acuerdosCumplidos} cumplidos</span>
        </div>
        <Button size="sm" onClick={() => setAddingAcuerdo(true)} variant="outline">
          <Plus className="h-4 w-4" /> Acuerdo
        </Button>
      </div>

      {addingAcuerdo && (
        <Card className="border-primary-200 dark:border-primary-800/50">
          <CardContent className="py-4 space-y-3">
            <Input {...register('descripcion', { required: 'Requerido' })} placeholder="Descripción del acuerdo" />
            {errors.descripcion && <p className="text-xs text-destructive">{errors.descripcion.message}</p>}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Responsables</label>
                {selectedResponsables.length > 0 && (
                  <span className="text-xs text-primary-700 dark:text-primary-400 font-medium">{selectedResponsables.length} seleccionados</span>
                )}
              </div>
              <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                {miembrosActivos.map((m) => {
                  const nombre = m.usuario?.nombre
                  const selected = selectedResponsables.includes(nombre)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleResponsable(nombre)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${selected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-primary-700 bg-primary-700' : 'border-input'}`}>
                        {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm">{nombre}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <Input type="date" {...register('fechaLimite')} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setAddingAcuerdo(false); reset(); setSelectedResponsables([]) }}>Cancelar</Button>
              <Button size="sm" disabled={addingPending} onClick={handleSubmit(onAddAcuerdo)}>Agregar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {reunion.acuerdos?.map((a) => (
          <Card key={a.id} className={a.cumplido ? 'opacity-60' : ''}>
            <CardContent className="flex items-start gap-3 py-3 px-4">
              <button
                className="min-h-0 h-auto p-0 mt-0.5 shrink-0"
                onClick={() => toggleCumplido({ acuerdoId: a.id, cumplido: !a.cumplido })}
              >
                {a.cumplido
                  ? <CheckCircle className="h-5 w-5 text-green-500" />
                  : <Circle className="h-5 w-5 text-muted-foreground" />}
              </button>
              <div className="flex-1">
                <p className={`font-medium ${a.cumplido ? 'line-through' : ''}`}>{a.descripcion}</p>
                {a.responsable && <p className="text-xs text-muted-foreground">Responsable: {a.responsable}</p>}
                {a.fechaLimite && <p className="text-xs text-muted-foreground">Fecha límite: {new Date(a.fechaLimite).toLocaleDateString('es-SV')}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {reunion.acuerdos?.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">Sin acuerdos registrados. Usa el botón + para agregar.</p>
        )}
      </div>

      {textoModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="bg-card rounded-t-2xl md:rounded-xl w-full max-w-lg max-h-[90vh] shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Texto del acta</h2>
              <button onClick={() => setTextoModal(null)} className="min-h-0 h-auto p-1 text-muted-foreground">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono bg-muted rounded-lg p-4">{textoModal}</pre>
            </div>
            <div className="p-4 border-t space-y-2">
              <Button className="w-full" onClick={copiarTexto}>
                <Copy className="h-4 w-4" /> Copiar texto
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Copia este texto y pégalo en tu grupo de WhatsApp
              </p>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <EditarReunionModal
          reunion={reunion}
          onClose={() => setEditModal(false)}
          onSaved={() => { setEditModal(false); qc.invalidateQueries({ queryKey: ['reunion', id] }) }}
        />
      )}

      {comisionesModal && (
        <ComisionesModal
          reunion={reunion}
          onClose={() => setComisionesModal(false)}
          onSaved={(data) => guardarComisionesMut(data)}
        />
      )}

      {confirmEliminar && (
        <ConfirmModal
          title="Eliminar reunión"
          description="Se borrarán también todos sus acuerdos. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={() => { setConfirmEliminar(false); eliminar() }}
          onCancel={() => setConfirmEliminar(false)}
        />
      )}
    </div>
  )
}
