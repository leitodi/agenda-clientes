import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Employee from '../models/Employee'

function serializeEmployee(employee: any) {
  return {
    id: employee._id.toString(),
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone || '',
    role: employee.role,
    salary: employee.salary,
    active: employee.active,
    schedules: employee.schedule ? [employee.schedule] : [],
  }
}

export const getAll = async (req: AuthRequest, res: Response) => {
  try {
    const employees = await Employee.find().sort({ lastName: 1, firstName: 1 }).lean()
    return res.json(employees.map(serializeEmployee))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al obtener empleados' })
  }
}

export const getById = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.id).lean()

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' })
    }

    return res.json(serializeEmployee(employee))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al obtener empleado' })
  }
}

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone, role, salary, schedule } = req.body

    if (!firstName || !lastName || !role || salary === undefined) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' })
    }

    const employee = await Employee.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phone: String(phone || '').trim(),
      role,
      salary: Number(salary),
      schedule: schedule || undefined,
      active: true,
    })

    return res.status(201).json(serializeEmployee(employee))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al crear empleado' })
  }
}

export const update = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone, role, salary, schedule } = req.body

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        ...(firstName !== undefined ? { firstName: String(firstName).trim() } : {}),
        ...(lastName !== undefined ? { lastName: String(lastName).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone || '').trim() } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(salary !== undefined ? { salary: Number(salary) } : {}),
        ...(schedule !== undefined ? { schedule } : {}),
      },
      { new: true }
    ).lean()

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' })
    }

    return res.json(serializeEmployee(employee))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al actualizar empleado' })
  }
}

export const remove = async (req: AuthRequest, res: Response) => {
  try {
    await Employee.findByIdAndDelete(req.params.id)
    return res.json({ message: 'Empleado eliminado' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al eliminar empleado' })
  }
}
