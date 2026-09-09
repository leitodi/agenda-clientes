import { EmployeeSchedule, Unit } from '../types'

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dayLabels: Array<{ key: keyof EmployeeSchedule; label: string }> = [
  { key: 'monday', label: 'Lun' },
  { key: 'tuesday', label: 'Mar' },
  { key: 'wednesday', label: 'Mie' },
  { key: 'thursday', label: 'Jue' },
  { key: 'friday', label: 'Vie' },
  { key: 'saturday', label: 'Sab' },
  { key: 'sunday', label: 'Dom' },
]

export function formatCurrency(value: number) {
  return moneyFormatter.format(value)
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

export function formatQuantity(value: number, unit: Unit) {
  const normalized = Number.isInteger(value) ? value.toString() : value.toFixed(2)
  const shortUnit = unit === 'unidad' ? 'unid' : unit
  return `${normalized} ${shortUnit}`
}

export function formatScheduleDays(schedule: EmployeeSchedule) {
  const activeDays = dayLabels
    .filter((day) => schedule[day.key] === true)
    .map((day) => day.label)

  return activeDays.length > 0 ? activeDays.join(', ') : 'Sin dias'
}

export function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10)
}
