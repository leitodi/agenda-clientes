import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { formatCurrency, formatDateTime, formatQuantity } from '../lib/format'
import { getEmployees, getProducts, getProviders, getSales } from '../services/store'
import { Employee, Product, Provider, Sale } from '../types'

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const [productsData, employeesData, providersData, salesData] = await Promise.all([
          getProducts(),
          getEmployees(),
          getProviders(),
          getSales(),
        ])

        if (!active) {
          return
        }

        setProducts(productsData)
        setEmployees(employeesData)
        setProviders(providersData)
        setSales(salesData)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el panel.')
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const todaySales = sales.filter((sale) => sale.saleDate.slice(0, 10) === today)
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0)
  const lowStockProducts = products.filter((product) => product.quantity <= product.minimumStock)

  return (
    <Layout>
      {error ? (
        <div className="mb-6 rounded-2xl border border-[rgba(139,105,20,0.24)] bg-[rgba(139,105,20,0.12)] px-4 py-3 text-sm text-[#6f5310]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Ventas de hoy" value={formatCurrency(todayTotal)} tone="green" />
        <SummaryCard label="Productos cargados" value={products.length.toString()} tone="wood" />
        <SummaryCard
          label="Empleados activos"
          value={employees.length.toString()}
          tone="green-soft"
        />
        <SummaryCard
          label="Alertas de stock"
          value={lowStockProducts.length.toString()}
          tone={lowStockProducts.length > 0 ? 'danger' : 'neutral'}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="app-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker">Resumen</p>
              <h3 className="mt-2 font-[Georgia] text-2xl font-semibold text-[var(--color-verde-deep)]">
                Movimiento reciente
              </h3>
            </div>
            <div className="app-panel-muted px-4 py-2 text-sm text-[var(--color-text-muted)]">
              {sales.length} ventas registradas
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {sales.slice(0, 5).map((sale) => (
              <article key={sale.id} className="app-panel-muted px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-[var(--color-verde-deep)]">
                      {sale.employeeName}
                    </p>
                    <p className="text-sm text-[var(--color-text-soft)]">
                      {formatDateTime(sale.saleDate)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-[var(--color-madera)]">
                    {formatCurrency(sale.total)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sale.items.map((item) => (
                    <span key={`${sale.id}-${item.id}`} className="app-chip">
                      {item.productName}: {formatQuantity(item.quantity, item.unit)}
                    </span>
                  ))}
                </div>
              </article>
            ))}

            {sales.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[rgba(45,80,22,0.18)] px-5 py-10 text-center text-[var(--color-text-soft)]">
                Todavia no hay ventas cargadas.
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="app-panel p-6">
            <p className="app-kicker">Control</p>
            <h3 className="mt-2 font-[Georgia] text-2xl font-semibold text-[var(--color-verde-deep)]">
              Stock bajo
            </h3>
            <div className="mt-5 space-y-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-[rgba(139,105,20,0.24)] bg-[rgba(139,105,20,0.12)] px-4 py-3"
                >
                  <p className="font-semibold text-[var(--color-verde-deep)]">{product.name}</p>
                  <p className="mt-1 text-sm text-[#6f5310]">
                    Disponible: {formatQuantity(product.quantity, product.unit)} | Minimo:{' '}
                    {formatQuantity(product.minimumStock, product.unit)}
                  </p>
                </div>
              ))}

              {lowStockProducts.length === 0 ? (
                <div className="rounded-2xl bg-[rgba(45,80,22,0.12)] px-4 py-3 text-sm text-[var(--color-verde-deep)]">
                  No hay productos en alerta.
                </div>
              ) : null}
            </div>
          </div>

          <div className="app-panel p-6">
            <p className="app-kicker">Base de datos</p>
            <h3 className="mt-2 font-[Georgia] text-2xl font-semibold text-[var(--color-verde-deep)]">
              Panorama general
            </h3>
            <dl className="mt-5 grid gap-4">
              <InfoRow label="Proveedores" value={providers.length.toString()} />
              <InfoRow
                label="Productos vendidos acumulados"
                value={products.reduce((sum, product) => sum + product.soldQuantity, 0).toFixed(2)}
              />
              <InfoRow
                label="Ticket promedio"
                value={
                  sales.length > 0
                    ? formatCurrency(sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length)
                    : formatCurrency(0)
                }
              />
            </dl>
          </div>
        </div>
      </section>
    </Layout>
  )
}

interface SummaryCardProps {
  label: string
  value: string
  tone: 'green' | 'wood' | 'green-soft' | 'danger' | 'neutral'
}

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  const toneClass = {
    green: 'bg-[linear-gradient(180deg,#3b6021_0%,#284714_100%)] text-white border border-[rgba(45,80,22,0.3)]',
    wood: 'bg-[linear-gradient(180deg,#9a7720_0%,#7b5d15_100%)] text-white border border-[rgba(139,105,20,0.28)]',
    'green-soft':
      'bg-[linear-gradient(180deg,#ffffff_0%,#f6f0e3_100%)] text-[var(--color-verde-deep)] border border-[rgba(45,80,22,0.14)]',
    danger:
      'bg-[linear-gradient(180deg,#f5e9cf_0%,#ead9b3_100%)] text-[#6f5310] border border-[rgba(139,105,20,0.26)]',
    neutral:
      'bg-[linear-gradient(180deg,#ffffff_0%,#f7f1e6_100%)] text-[var(--color-verde-deep)] border border-[rgba(45,80,22,0.14)]',
  }[tone]

  return (
    <div className={`rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.28)] ${toneClass}`}>
      <p className="text-sm uppercase tracking-[0.25em] opacity-75">{label}</p>
      <p className="mt-4 text-4xl font-semibold">{value}</p>
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="app-panel-muted flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-base font-semibold text-[var(--color-verde-deep)]">{value}</dd>
    </div>
  )
}
