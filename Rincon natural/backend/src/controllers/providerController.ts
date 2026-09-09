import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middleware/auth'
import Provider from '../models/Provider'

export const getAll = async (req: AuthRequest, res: Response) => {
  try {
    const providers = await Provider.find().sort({ name: 1 }).lean()
    return res.json(
      providers.map((provider) => ({
        id: provider._id.toString(),
        name: provider.name,
        address: provider.address || '',
        phone: provider.phone || '',
        email: provider.email || '',
        active: provider.active,
      }))
    )
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al obtener proveedores' })
  }
}

export const getById = async (req: AuthRequest, res: Response) => {
  try {
    const provider = await Provider.findById(req.params.id).lean()

    if (!provider) {
      return res.status(404).json({ error: 'Proveedor no encontrado' })
    }

    return res.json({
      id: provider._id.toString(),
      name: provider.name,
      address: provider.address || '',
      phone: provider.phone || '',
      email: provider.email || '',
      active: provider.active,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al obtener proveedor' })
  }
}

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, phone, email } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Nombre del proveedor requerido' })
    }

    const provider = await Provider.create({
      name: String(name).trim(),
      address: String(address || '').trim(),
      phone: String(phone || '').trim(),
      email: String(email || '').trim(),
      active: true,
    })

    return res.status(201).json({
      id: provider._id.toString(),
      name: provider.name,
      address: provider.address,
      phone: provider.phone,
      email: provider.email,
      active: provider.active,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al crear proveedor' })
  }
}

export const update = async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, phone, email } = req.body

    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      {
        name: String(name).trim(),
        address: String(address || '').trim(),
        phone: String(phone || '').trim(),
        email: String(email || '').trim(),
      },
      { new: true }
    ).lean()

    if (!provider) {
      return res.status(404).json({ error: 'Proveedor no encontrado' })
    }

    return res.json({
      id: provider._id.toString(),
      name: provider.name,
      address: provider.address || '',
      phone: provider.phone || '',
      email: provider.email || '',
      active: provider.active,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al actualizar proveedor' })
  }
}

export const remove = async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Proveedor invalido' })
    }

    await Provider.findByIdAndDelete(req.params.id)
    return res.json({ message: 'Proveedor eliminado' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al eliminar proveedor' })
  }
}
