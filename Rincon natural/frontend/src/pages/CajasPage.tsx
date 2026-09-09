import { FormEvent, Fragment, useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import Layout from '../components/Layout'
import { formatCurrency, formatDate, formatQuantity, getTodayInputValue } from '../lib/format'
import { createSale, getEmployees, getProducts, getSales } from '../services/store'
import { Employee, Product, Sale, Unit } from '../types'

interface SaleDraftItem {
  productId: string
  quantity: string
  unit: Unit
  price: string
}

interface DailySaleSummary {
  date: string
  operations: number
  total: number
  unitSummary: string
  details: Array<{
    productName: string
    quantity: number
    unit: Unit
  }>
}

const initialItem: SaleDraftItem = {
  productId: '',
  quantity: '',
  unit: 'kg',
  price: '',
}

export default function CajasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => getTodayInputValue())
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saleForm, setSaleForm] = useState({
    employeeId: '',
    saleDate: getTodayInputValue(),
    items: [initialItem],
  })

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const [salesData, productsData, employeesData] = await Promise.all([
          getSales(),
          getProducts(),
          getEmployees(),
        ])

        if (!active) {
          return
        }

        setSales(salesData)
        setProducts(productsData)
        setEmployees(employeesData)
        setSaleForm((current) => ({
          ...current,
          employeeId: current.employeeId || employeesData[0]?.id || '',
        }))
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la caja.')
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [])

  const filteredSales = sales.filter((sale) => {
    const saleDate = sale.saleDate.slice(0, 10)
    return saleDate >= startDate && saleDate <= endDate
  })

  const summaryByDay = buildDailySummary(filteredSales)
  const totalSales = summaryByDay.reduce((sum, day) => sum + day.total, 0)
  const totalOperations = summaryByDay.reduce((sum, day) => sum + day.operations, 0)

  const resetSaleForm = () => {
    setSaleForm({
      employeeId: employees[0]?.id ?? '',
      saleDate: getTodayInputValue(),
      items: [initialItem],
    })
  }

  const addItem = () => {
    setSaleForm((current) => ({
      ...current,
      items: [...current.items, initialItem],
    }))
  }

  const updateItem = (index: number, key: keyof SaleDraftItem, value: string) => {
    setSaleForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }

        if (key === 'productId') {
          const selectedProduct = products.find((product) => product.id === value)
          return {
            ...item,
            productId: value,
            unit: selectedProduct?.unit ?? item.unit,
          }
        }

        return {
          ...item,
          [key]: value,
        }
      }),
    }))
  }

  const removeItem = (index: number) => {
    setSaleForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await createSale({
        employeeId: saleForm.employeeId,
        saleDate: saleForm.saleDate,
        items: saleForm.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unit: item.unit,
          price: Number(item.price),
        })),
      })

      const [salesData, productsData] = await Promise.all([getSales(), getProducts()])
      setSales(salesData)
      setProducts(productsData)
      setError('')
      resetSaleForm()
    } catch (saleError) {
      setError(saleError instanceof Error ? saleError.message : 'No se pudo guardar la venta.')
    }
  }

  const exportToExcel = () => {
    const exportRows = summaryByDay.flatMap((day) => [
      {
        Fecha: formatDate(day.date),
        Operaciones: day.operations,
        CantidadVendida: day.unitSummary,
        Total: day.total,
        Producto: '',
        CantidadProducto: '',
      },
      ...day.details.map((detail) => ({
        Fecha: '',
        Operaciones: '',
        CantidadVendida: '',
        Total: '',
        Producto: detail.productName,
        CantidadProducto: formatQuantity(detail.quantity, detail.unit),
      })),
    ])

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    XLSX.utils.sheet_add_json(
      worksheet,
      [
        {},
        {
          Fecha: 'TOTAL',
          Operaciones: totalOperations,
          CantidadVendida: '',
          Total: totalSales,
          Producto: '',
          CantidadProducto: '',
        },
      ],
      { origin: -1, skipHeader: true }
    )

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Caja')
    XLSX.writeFile(workbook, `Caja_${startDate}_${endDate}.xlsx`)
  }

  return (
    <Layout>
      {error ? (
        <div className="mb-6 rounded-2xl border border-[rgba(139,105,20,0.24)] bg-[rgba(139,105,20,0.12)] px-4 py-3 text-sm text-[#6f5310]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSubmit} className="app-panel p-6">
          <p className="app-kicker">Movimiento</p>
          <h3 className="mt-2 font-[Georgia] text-2xl font-semibold text-[var(--color-verde-deep)]">
            Registrar venta
          </h3>
          <p className="app-subtitle">
            Cada venta descuenta stock automaticamente y se suma al resumen diario de caja.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="app-label">Empleado</span>
              <select
                value={saleForm.employeeId}
                onChange={(event) =>
                  setSaleForm((current) => ({ ...current, employeeId: event.target.value }))
                }
                className="app-field"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="app-label">Fecha</span>
              <input
                type="date"
                value={saleForm.saleDate}
                onChange={(event) =>
                  setSaleForm((current) => ({ ...current, saleDate: event.target.value }))
                }
                className="app-field"
              />
            </label>
          </div>

          <div className="mt-6 space-y-4">
            {saleForm.items.map((item, index) => {
              const selectedProduct = products.find((product) => product.id === item.productId)

              return (
                <div key={`sale-item-${index}`} className="app-panel-muted p-4">
                  <div className="grid gap-3 md:grid-cols-[1.5fr_0.7fr_0.7fr_0.8fr_auto]">
                    <label className="block">
                      <span className="app-label">Producto</span>
                      <select
                        value={item.productId}
                        onChange={(event) => updateItem(index, 'productId', event.target.value)}
                        className="app-field"
                        required
                      >
                        <option value="">Seleccionar</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="app-label">Cantidad</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                        className="app-field"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="app-label">Unidad</span>
                      <select
                        value={item.unit}
                        onChange={(event) => updateItem(index, 'unit', event.target.value)}
                        className="app-field"
                      >
                        <option value="kg">Kg</option>
                        <option value="g">Gramos</option>
                        <option value="unidad">Unidad</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="app-label">Precio</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(event) => updateItem(index, 'price', event.target.value)}
                        className="app-field"
                        required
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={saleForm.items.length === 1}
                      className="app-button-danger self-end disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  </div>

                  {selectedProduct ? (
                    <p className="mt-3 text-xs text-[var(--color-text-soft)]">
                      Disponible: {formatQuantity(selectedProduct.quantity, selectedProduct.unit)}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={addItem} className="app-button-secondary">
              Agregar producto
            </button>
            <button type="submit" className="app-button-primary">
              Guardar venta
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="app-panel p-6">
            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="app-label">Desde</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="app-field"
                />
              </label>
              <label className="block">
                <span className="app-label">Hasta</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="app-field"
                />
              </label>
              <button onClick={exportToExcel} type="button" className="app-button-primary">
                Exportar Excel
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <SmallMetric label="Total del rango" value={formatCurrency(totalSales)} />
              <SmallMetric label="Operaciones" value={totalOperations.toString()} />
              <SmallMetric label="Dias con ventas" value={summaryByDay.length.toString()} />
            </div>
          </section>

          <section className="app-table-shell">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Operaciones</th>
                    <th className="px-6 py-4 font-medium">Cantidad vendida</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece8da]">
                  {summaryByDay.map((day) => (
                    <Fragment key={day.date}>
                      <tr>
                        <td className="px-6 py-4 font-semibold text-[var(--color-verde-deep)]">
                          {formatDate(day.date)}
                        </td>
                        <td className="px-6 py-4">{day.operations}</td>
                        <td className="px-6 py-4">{day.unitSummary}</td>
                        <td className="px-6 py-4 font-semibold text-[var(--color-madera)]">
                          {formatCurrency(day.total)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              setExpandedDate((current) => (current === day.date ? null : day.date))
                            }
                            className="app-button-secondary px-4 py-2 text-xs"
                          >
                            {expandedDate === day.date ? 'Ocultar' : 'Detalles'}
                          </button>
                        </td>
                      </tr>

                      {expandedDate === day.date ? (
                        <tr className="bg-[rgba(45,80,22,0.04)] text-sm text-[var(--color-text)]">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="app-panel-muted p-4">
                              <h4 className="text-base font-semibold text-[var(--color-verde-deep)]">
                                Productos vendidos el {formatDate(day.date)}
                              </h4>
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {day.details.map((detail, index) => (
                                  <div
                                    key={`${day.date}-${detail.productName}-${index}`}
                                    className="rounded-2xl border border-[rgba(45,80,22,0.1)] bg-white/75 px-4 py-3"
                                  >
                                    <p className="font-semibold text-[var(--color-verde-deep)]">
                                      {detail.productName}
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                                      {formatQuantity(detail.quantity, detail.unit)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {summaryByDay.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-[var(--color-text-soft)]">
                No hay ventas registradas en este rango de fechas.
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </Layout>
  )
}

function buildDailySummary(sales: Sale[]): DailySaleSummary[] {
  const summaryMap = new Map<string, DailySaleSummary>()

  sales.forEach((sale) => {
    const date = sale.saleDate.slice(0, 10)
    const current = summaryMap.get(date) ?? {
      date,
      operations: 0,
      total: 0,
      unitSummary: '',
      details: [],
    }

    current.operations += 1
    current.total += sale.total

    sale.items.forEach((item) => {
      const detail = current.details.find(
        (candidate) => candidate.productName === item.productName && candidate.unit === item.unit
      )

      if (detail) {
        detail.quantity += item.quantity
      } else {
        current.details.push({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
        })
      }
    })

    const unitTotals = current.details.reduce<Record<Unit, number>>(
      (accumulator, detail) => {
        accumulator[detail.unit] += detail.quantity
        return accumulator
      },
      { kg: 0, g: 0, unidad: 0 }
    )

    current.unitSummary = [
      unitTotals.kg > 0 ? formatQuantity(unitTotals.kg, 'kg') : null,
      unitTotals.g > 0 ? formatQuantity(unitTotals.g, 'g') : null,
      unitTotals.unidad > 0 ? formatQuantity(unitTotals.unidad, 'unidad') : null,
    ]
      .filter(Boolean)
      .join(' | ')

    summaryMap.set(date, current)
  })

  return Array.from(summaryMap.values()).sort((a, b) => b.date.localeCompare(a.date))
}

interface SmallMetricProps {
  label: string
  value: string
}

function SmallMetric({ label, value }: SmallMetricProps) {
  return (
    <div className="app-panel-muted px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-madera)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--color-verde-deep)]">{value}</p>
    </div>
  )
}
