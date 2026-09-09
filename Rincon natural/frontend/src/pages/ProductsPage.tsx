import { FormEvent, useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { formatQuantity } from '../lib/format'
import { unitOptions } from '../lib/units'
import { deleteProduct, getProducts, getProviders, saveProduct } from '../services/store'
import { Product, Provider, Unit } from '../types'

const initialForm = {
  name: '',
  providerId: '',
  providerIds: [] as string[],
  quantity: '',
  unit: 'kg' as Unit,
  minimumStock: '',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(initialForm)
  const [error, setError] = useState('')
  const providerMap = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider.name])),
    [providers]
  )

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const [productsData, providersData] = await Promise.all([getProducts(), getProviders()])

        if (!active) {
          return
        }

        setProducts(productsData)
        setProviders(providersData)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los productos.')
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
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.providerId) {
      return
    }

    try {
      const savedProducts = await saveProduct({
        id: editingId ?? undefined,
        name: formData.name.trim(),
        providerId: formData.providerId,
        providerIds: formData.providerIds,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        minimumStock: Number(formData.minimumStock),
      })

      setProducts(savedProducts)
      setError('')
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el producto.')
    }
  }

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      providerId: product.providerId,
      providerIds: product.providerIds,
      quantity: product.quantity.toString(),
      unit: product.unit,
      minimumStock: product.minimumStock.toString(),
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  const handleDelete = async (productId: string) => {
    const confirmed = window.confirm('Se va a eliminar el producto. Continuar?')

    if (!confirmed) {
      return
    }

    try {
      setProducts(await deleteProduct(productId))
      setError('')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el producto.')
    }
  }

  return (
    <Layout>
      {error ? (
        <div className="mb-6 rounded-2xl border border-[rgba(139,105,20,0.24)] bg-[rgba(139,105,20,0.12)] px-4 py-3 text-sm text-[#6f5310]">
          {error}
        </div>
      ) : null}

      <section className="app-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="app-kicker">Catalogo</p>
            <h3 className="mt-2 font-[Georgia] text-2xl font-semibold text-[var(--color-verde-deep)]">
              Carga de productos
            </h3>
            <p className="app-subtitle">
              Cada producto puede tener proveedor principal, proveedores alternativos y unidad
              de stock en kg, gramos o unidad.
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
            {showForm ? 'Cerrar formulario' : 'Nuevo producto'}
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
              <span className="app-label">Proveedor principal</span>
              <select
                value={formData.providerId}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    providerId: event.target.value,
                    providerIds: Array.from(
                      new Set([event.target.value, ...current.providerIds.filter(Boolean)])
                    ),
                  }))
                }
                required
                className="app-field"
              >
                <option value="">Seleccionar proveedor</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="app-label">Proveedores adicionales</span>
              <select
                multiple
                value={formData.providerIds}
                onChange={(event) => {
                  const values = Array.from(event.target.selectedOptions, (option) => option.value)
                  setFormData((current) => ({
                    ...current,
                    providerIds: current.providerId
                      ? Array.from(new Set([current.providerId, ...values]))
                      : values,
                  }))
                }}
                className="app-field min-h-32"
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-3 md:col-span-1">
              <label className="block">
                <span className="app-label">Cantidad</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, quantity: event.target.value }))
                  }
                  required
                  className="app-field"
                />
              </label>

              <label className="block">
                <span className="app-label">Unidad</span>
                <select
                  value={formData.unit}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      unit: event.target.value as Unit,
                    }))
                  }
                  className="app-field"
                >
                  {unitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="app-label">Minimo</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimumStock}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      minimumStock: event.target.value,
                    }))
                  }
                  required
                  className="app-field"
                />
              </label>
            </div>

            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="app-button-primary">
                {editingId ? 'Guardar cambios' : 'Agregar producto'}
              </button>
              <button type="button" onClick={resetForm} className="app-button-secondary">
                Cancelar
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="app-table-shell mt-8">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr>
                <th className="px-6 py-4 font-medium">Producto</th>
                <th className="px-6 py-4 font-medium">Proveedores</th>
                <th className="px-6 py-4 font-medium">Stock actual</th>
                <th className="px-6 py-4 font-medium">Minimo</th>
                <th className="px-6 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece8da]">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[var(--color-verde-deep)]">{product.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                      Vendido acumulado: {formatQuantity(product.soldQuantity, product.unit)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {product.providerIds.map((providerId) => (
                        <span key={`${product.id}-${providerId}`} className="app-chip">
                          {providerMap.get(providerId) ?? 'Proveedor'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">{formatQuantity(product.quantity, product.unit)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={[
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        product.quantity <= product.minimumStock ? 'app-badge-alert' : 'app-badge-ok',
                      ].join(' ')}
                    >
                      {formatQuantity(product.minimumStock, product.unit)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="app-button-secondary px-4 py-2 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
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
