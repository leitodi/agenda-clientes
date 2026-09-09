import { FormEvent, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { deleteProvider, getProviders, saveProvider } from '../services/store'
import { Provider } from '../types'

const initialForm = {
  name: '',
  address: '',
  phone: '',
  email: '',
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(initialForm)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const providersData = await getProviders()

        if (!active) {
          return
        }

        setProviders(providersData)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los proveedores.')
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const updatedProviders = await saveProvider({
        id: editingId ?? undefined,
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
      })

      setProviders(updatedProviders)
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el proveedor.')
    }
  }

  const handleEdit = (provider: Provider) => {
    setFormData({
      name: provider.name,
      address: provider.address,
      phone: provider.phone,
      email: provider.email,
    })
    setEditingId(provider.id)
    setShowForm(true)
  }

  const handleDelete = async (providerId: string) => {
    const confirmed = window.confirm('Se va a eliminar el proveedor. Continuar?')

    if (!confirmed) {
      return
    }

    try {
      setProviders(await deleteProvider(providerId))
      setError('')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar.')
    }
  }

  return (
    <Layout>
      <section className="app-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="app-kicker">Abastecimiento</p>
            <h3 className="mt-2 font-[Georgia] text-2xl font-semibold text-[var(--color-verde-deep)]">
              Directorio de proveedores
            </h3>
            <p className="app-subtitle">
              Carga nombre, direccion, telefono y mail. Desde aca despues vas a poder vincular
              cada proveedor con los productos.
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm((current) => !current)
              if (showForm) {
                resetForm()
              }
            }}
            className="app-button-primary"
          >
            {showForm ? 'Cerrar formulario' : 'Nuevo proveedor'}
          </button>
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="app-label">Nombre</span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, name: event.target.value }))
                }
                required
                className="app-field"
              />
            </label>

            <label className="block">
              <span className="app-label">Telefono</span>
              <input
                type="text"
                value={formData.phone}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, phone: event.target.value }))
                }
                className="app-field"
              />
            </label>

            <label className="block">
              <span className="app-label">Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, email: event.target.value }))
                }
                className="app-field"
              />
            </label>

            <label className="block">
              <span className="app-label">Direccion</span>
              <input
                type="text"
                value={formData.address}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, address: event.target.value }))
                }
                className="app-field"
              />
            </label>

            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="app-button-primary">
                {editingId ? 'Guardar cambios' : 'Agregar proveedor'}
              </button>
              <button type="button" onClick={resetForm} className="app-button-secondary">
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-[rgba(139,105,20,0.24)] bg-[rgba(139,105,20,0.12)] px-4 py-3 text-sm text-[#6f5310]">
            {error}
          </div>
        ) : null}
      </section>

      <section className="app-table-shell mt-8">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr>
                <th className="px-6 py-4 font-medium">Proveedor</th>
                <th className="px-6 py-4 font-medium">Contacto</th>
                <th className="px-6 py-4 font-medium">Direccion</th>
                <th className="px-6 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece8da]">
              {providers.map((provider) => (
                <tr key={provider.id}>
                  <td className="px-6 py-4 font-semibold text-[var(--color-verde-deep)]">
                    {provider.name}
                  </td>
                  <td className="px-6 py-4">
                    <p>{provider.phone || 'Sin telefono'}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                      {provider.email || 'Sin email'}
                    </p>
                  </td>
                  <td className="px-6 py-4">{provider.address || 'Sin direccion'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(provider)}
                        className="app-button-secondary px-4 py-2 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="app-button-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}
