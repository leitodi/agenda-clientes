import { FormEvent, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { formatCurrency, formatScheduleDays } from '../lib/format'
import { deleteEmployee, getEmployees, saveEmployee } from '../services/store'
import { Employee, EmployeeRole, EmployeeSchedule } from '../types'

const dayOptions: Array<{ key: keyof EmployeeSchedule; label: string }> = [
  { key: 'monday', label: 'Lun' },
  { key: 'tuesday', label: 'Mar' },
  { key: 'wednesday', label: 'Mie' },
  { key: 'thursday', label: 'Jue' },
  { key: 'friday', label: 'Vie' },
  { key: 'saturday', label: 'Sab' },
  { key: 'sunday', label: 'Dom' },
]

const initialSchedule: EmployeeSchedule = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
  startTime: '09:00',
  endTime: '17:00',
}

const initialForm = {
  firstName: '',
  lastName: '',
  phone: '',
  role: 'empleado' as EmployeeRole,
  salary: '',
  schedule: initialSchedule,
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(initialForm)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const employeesData = await getEmployees()

        if (!active) {
          return
        }

        setEmployees(employeesData)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los empleados.')
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

    try {
      const updatedEmployees = await saveEmployee({
        id: editingId ?? undefined,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        salary: Number(formData.salary),
        schedule: formData.schedule,
      })

      setEmployees(updatedEmployees)
      setError('')
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el empleado.')
    }
  }

  const handleEdit = (employee: Employee) => {
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone,
      role: employee.role,
      salary: employee.salary.toString(),
      schedule: employee.schedule,
    })
    setEditingId(employee.id)
    setShowForm(true)
  }

  const handleDelete = async (employeeId: string) => {
    const confirmed = window.confirm('Se va a eliminar el empleado. Continuar?')

    if (!confirmed) {
      return
    }

    try {
      setEmployees(await deleteEmployee(employeeId))
      setError('')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el empleado.')
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
            <p className="app-kicker">Equipo</p>
            <h3 className="mt-2 font-[Georgia] text-2xl font-semibold text-[var(--color-verde-deep)]">
              Altas y horarios
            </h3>
            <p className="app-subtitle">
              Registra nombre, apellido, dias de trabajo, horario, sueldo fijo y si es
              personal o empleado.
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
            {showForm ? 'Cerrar formulario' : 'Nuevo empleado'}
          </button>
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="app-label">Nombre</span>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, firstName: event.target.value }))
                  }
                  required
                  className="app-field"
                />
              </label>

              <label className="block">
                <span className="app-label">Apellido</span>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, lastName: event.target.value }))
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

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="app-label">Rol</span>
                  <select
                    value={formData.role}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        role: event.target.value as EmployeeRole,
                      }))
                    }
                    className="app-field"
                  >
                    <option value="personal">Personal</option>
                    <option value="empleado">Empleado</option>
                  </select>
                </label>

                <label className="block">
                  <span className="app-label">Sueldo fijo</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salary}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, salary: event.target.value }))
                    }
                    required
                    className="app-field"
                  />
                </label>
              </div>
            </div>

            <div className="app-panel-muted p-5">
              <p className="text-sm font-semibold text-[var(--color-madera)]">Dias de trabajo</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {dayOptions.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        schedule: {
                          ...current.schedule,
                          [day.key]: !current.schedule[day.key],
                        },
                      }))
                    }
                    className={['app-toggle-pill', formData.schedule[day.key] ? 'app-toggle-pill-active' : ''].join(' ')}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="app-label">Hora de ingreso</span>
                  <input
                    type="time"
                    value={formData.schedule.startTime}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        schedule: { ...current.schedule, startTime: event.target.value },
                      }))
                    }
                    className="app-field"
                  />
                </label>

                <label className="block">
                  <span className="app-label">Hora de salida</span>
                  <input
                    type="time"
                    value={formData.schedule.endTime}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        schedule: { ...current.schedule, endTime: event.target.value },
                      }))
                    }
                    className="app-field"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="app-button-primary">
                {editingId ? 'Guardar cambios' : 'Agregar empleado'}
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
                <th className="px-6 py-4 font-medium">Empleado</th>
                <th className="px-6 py-4 font-medium">Rol</th>
                <th className="px-6 py-4 font-medium">Horario</th>
                <th className="px-6 py-4 font-medium">Sueldo</th>
                <th className="px-6 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece8da]">
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[var(--color-verde-deep)]">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                      {employee.phone || 'Sin telefono'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="app-chip">
                      {employee.role === 'personal' ? 'Personal' : 'Empleado'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p>{formatScheduleDays(employee.schedule)}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                      {employee.schedule.startTime} a {employee.schedule.endTime}
                    </p>
                  </td>
                  <td className="px-6 py-4">{formatCurrency(employee.salary)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="app-button-secondary px-4 py-2 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
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
