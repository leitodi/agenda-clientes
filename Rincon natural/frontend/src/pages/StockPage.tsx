import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { formatQuantity } from '../lib/format'
import { deleteProduct, getProducts, getProviders, saveProduct } from '../services/store'
import { Product, Provider } from '../types'

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const providerMap = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider.name])),
    [providers]
  )
  const [draft, setDraft] = useState<{
    providerId: string
    providerIds: string[]
    quantity: string
    soldQuantity: string
    minimumStock: string
  }>({
    providerId: '',
    providerIds: [],
    quantity: '',
    soldQuantity: '',
    minimumStock: '',
  })

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

        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el stock.')
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [])

  const lowStockCount = products.filter((product) => product.quantity <= product.minimumStock).length

  const startEditing = (product: Product) => {
    setEditingId(product.id)
    setDraft({
      providerId: product.providerId,
      providerIds: product.providerIds,
      quantity: product.quantity.toString(),
      soldQuantity: product.soldQuantity.toString(),
      minimumStock: product.minimumStock.toString(),
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setDraft({
      providerId: '',
      providerIds: [],
      quantity: '',
      soldQuantity: '',
      minimumStock: '',
    })
  }

  const saveStockChanges = async (product: Product) => {
    try {
      const updatedProducts = await saveProduct({
        ...product,
        providerId: draft.providerId,
        providerIds: draft.providerIds,
        quantity: Number(draft.quantity),
        soldQuantity: Number(draft.soldQuantity),
        minimumStock: Number(draft.minimumStock),
      })

      setProducts(updatedProducts)
      setError('')
      cancelEditing()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar el stock.')
    }
  }

  const handleDelete = async (productId: string) => {
    const confirmed = window.confirm('Se va a borrar este producto del stock. Continuar?')

    if (!confirmed) {
      return
    }

    try {
      setProducts(await deleteProduct(productId))
      setError('')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo borrar el producto.')
    }
  }

  return (
    <Layout>
      {error ? (
        <div className="mb-6 rounded-2xl border border-[rgba(139,105,20,0.24)] bg-[rgba(139,105,20,0.12)] px-4 py-3 text-sm text-[#6f5310]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Productos en stock" value={products.length.toString()} tone="green" />
        <MetricCard label="Alertas activas" value={lowStockCount.toString()} tone="danger" />
        <MetricCard
          label="Vendidos acumulados"
          value={products.reduce((sum, product) => sum + product.soldQuantity, 0).toFixed(2)}
          tone="wood"
        />
      </section>

      <section className="app-table-shell mt-8">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr>
                <th className="px-6 py-4 font-medium">Producto</th>
                <th className="px-6 py-4 font-medium">Proveedores</th>
                <th className="px-6 py-4 font-medium">Stock actual</th>
                <th className="px-6 py-4 font-medium">Vendidos</th>
                <th className="px-6 py-4 font-medium">Minimo</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece8da]">
              {products.map((product) => {
                const isEditing = editingId === product.id
                const isLow = product.quantity <= product.minimumStock

                return (
                  <tr key={product.id} className={isLow ? 'bg-[rgba(139,105,20,0.12)]' : ''}>
                    <td className="px-6 py-4 font-semibold text-[var(--color-verde-deep)]">
                      {product.name}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="grid gap-3">
                          <select
                            value={draft.providerId}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                providerId: event.target.value,
                                providerIds: Array.from(
                                  new Set([event.target.value, ...current.providerIds.filter(Boolean)])
                                ),
                              }))
                            }
                            className="app-field"
                          >
                            {providers.map((provider) => (
                              <option key={provider.id} value={provider.id}>
                                {provider.name}
                              </option>
                            ))}
                          </select>
                          <select
                            multiple
                            value={draft.providerIds}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                providerIds: Array.from(
                                  new Set([
                                    current.providerId,
                                    ...Array.from(
                                      event.target.selectedOptions,
                                      (option) => option.value
                                    ),
                                  ].filter(Boolean))
                                ),
                              }))
                            }
                            className="app-field min-h-24"
                          >
                            {providers.map((provider) => (
                              <option key={provider.id} value={provider.id}>
                                {provider.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {product.providerIds.map((providerId) => (
                            <span key={`${product.id}-${providerId}`} className="app-chip">
                              {providerMap.get(providerId) ?? 'Proveedor'}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.quantity}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, quantity: event.target.value }))
                          }
                          className="app-field w-28"
                        />
                      ) : (
                        formatQuantity(product.quantity, product.unit)
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.soldQuantity}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              soldQuantity: event.target.value,
                            }))
                          }
                          className="app-field w-28"
                        />
                      ) : (
                        formatQuantity(product.soldQuantity, product.unit)
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.minimumStock}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              minimumStock: event.target.value,
                            }))
                          }
                          className="app-field w-28"
                        />
                      ) : (
                        formatQuantity(product.minimumStock, product.unit)
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={isLow ? 'app-badge-alert' : 'app-badge-ok'}>
                        {isLow ? 'Stock bajo' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => void saveStockChanges(product)}
                              className="app-button-primary px-4 py-2 text-xs"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="app-button-secondary px-4 py-2 text-xs"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(product)}
                              className="app-button-secondary px-4 py-2 text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => void handleDelete(product.id)}
                              className="app-button-danger"
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}

interface MetricCardProps {
  label: string
  value: string
  tone: 'green' | 'danger' | 'wood'
}

function MetricCard({ label, value, tone }: MetricCardProps) {
  const toneClass = {
    green: 'bg-[linear-gradient(180deg,#3b6021_0%,#284714_100%)] text-white border border-[rgba(45,80,22,0.3)]',
    danger: 'bg-[linear-gradient(180deg,#f5e9cf_0%,#ead9b3_100%)] text-[#6f5310] border border-[rgba(139,105,20,0.26)]',
    wood: 'bg-[linear-gradient(180deg,#9a7720_0%,#7b5d15_100%)] text-white border border-[rgba(139,105,20,0.28)]',
  }[tone]

  return (
    <div className={`rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.28)] ${toneClass}`}>
      <p className="text-sm uppercase tracking-[0.25em] opacity-75">{label}</p>
      <p className="mt-4 text-4xl font-semibold">{value}</p>
    </div>
  )
}
