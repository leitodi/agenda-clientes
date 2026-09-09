import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middleware/auth'
import Product from '../models/Product'

function normalizeProviderIds(providerId: string, providerIds?: string[]) {
  return Array.from(new Set([providerId, ...(providerIds || [])])).filter(Boolean)
}

function serializeProduct(product: any) {
  return {
    id: product._id.toString(),
    name: product.name,
    providerId: product.providerId?.toString?.() || '',
    providerIds: (product.providerIds || []).map((id: mongoose.Types.ObjectId) => id.toString()),
    quantity: product.quantity,
    unit: product.unit,
    minimumStock: product.minimumStock,
    soldQuantity: product.soldQuantity || 0,
  }
}

export const getAll = async (req: AuthRequest, res: Response) => {
  try {
    const products = await Product.find().sort({ name: 1 }).lean()
    return res.json(products.map(serializeProduct))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al obtener productos' })
  }
}

export const getById = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).lean()

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    return res.json(serializeProduct(product))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al obtener producto' })
  }
}

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const { name, providerId, providerIds, quantity, unit, minimumStock, soldQuantity } = req.body

    if (!name || !providerId || quantity === undefined || !unit) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' })
    }

    const normalizedProviderIds = normalizeProviderIds(String(providerId), providerIds)

    const product = await Product.create({
      name: String(name).trim(),
      providerId: new mongoose.Types.ObjectId(String(providerId)),
      providerIds: normalizedProviderIds.map((id) => new mongoose.Types.ObjectId(String(id))),
      quantity: Number(quantity),
      unit,
      minimumStock: minimumStock !== undefined ? Number(minimumStock) : 10,
      soldQuantity: soldQuantity !== undefined ? Number(soldQuantity) : 0,
    })

    return res.status(201).json(serializeProduct(product))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al crear producto' })
  }
}

export const update = async (req: AuthRequest, res: Response) => {
  try {
    const { name, providerId, providerIds, quantity, unit, minimumStock, soldQuantity } = req.body
    const normalizedProviderIds = providerId
      ? normalizeProviderIds(String(providerId), providerIds)
      : undefined

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(providerId ? { providerId: new mongoose.Types.ObjectId(String(providerId)) } : {}),
        ...(normalizedProviderIds
          ? {
              providerIds: normalizedProviderIds.map((id) => new mongoose.Types.ObjectId(String(id))),
            }
          : {}),
        ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(minimumStock !== undefined ? { minimumStock: Number(minimumStock) } : {}),
        ...(soldQuantity !== undefined ? { soldQuantity: Number(soldQuantity) } : {}),
      },
      { new: true }
    ).lean()

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    return res.json(serializeProduct(product))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al actualizar producto' })
  }
}

export const remove = async (req: AuthRequest, res: Response) => {
  try {
    await Product.findByIdAndDelete(req.params.id)
    return res.json({ message: 'Producto eliminado' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al eliminar producto' })
  }
}
