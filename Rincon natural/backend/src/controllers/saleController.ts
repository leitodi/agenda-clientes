import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Employee from '../models/Employee'
import Product from '../models/Product'
import Sale from '../models/Sale'
import { convertQuantity, Unit } from '../utils/units'

type SalePayloadItem = {
  productId: string
  quantity: number
  unit: Unit
  price: number
}

function serializeSale(sale: any) {
  return {
    id: sale._id.toString(),
    employeeId:
      typeof sale.employeeId === 'object' && sale.employeeId?._id
        ? sale.employeeId._id.toString()
        : sale.employeeId.toString(),
    saleDate: sale.saleDate,
    total: sale.total,
    employee:
      typeof sale.employeeId === 'object' && sale.employeeId
        ? {
            firstName: sale.employeeId.firstName,
            lastName: sale.employeeId.lastName,
          }
        : undefined,
    items: (sale.items || []).map((item: any) => ({
      id: item._id.toString(),
      productId:
        typeof item.productId === 'object' && item.productId?._id
          ? item.productId._id.toString()
          : item.productId.toString(),
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      product:
        typeof item.productId === 'object' && item.productId
          ? {
              name: item.productId.name,
            }
          : undefined,
    })),
  }
}

export const getAll = async (req: AuthRequest, res: Response) => {
  try {
    const sales = await Sale.find()
      .populate('employeeId', 'firstName lastName')
      .populate('items.productId', 'name')
      .sort({ saleDate: -1 })
      .lean()

    return res.json(sales.map(serializeSale))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al obtener ventas' })
  }
}

export const getByDateRange = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Fechas requeridas' })
    }

    const normalizedStartDate = new Date(String(startDate))
    const normalizedEndDate = new Date(String(endDate))
    normalizedEndDate.setHours(23, 59, 59, 999)

    const sales = await Sale.find({
      saleDate: {
        $gte: normalizedStartDate,
        $lte: normalizedEndDate,
      },
    })
      .populate('employeeId', 'firstName lastName')
      .populate('items.productId', 'name')
      .sort({ saleDate: -1 })
      .lean()

    return res.json(sales.map(serializeSale))
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Error al obtener ventas' })
  }
}

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, items, total, saleDate } = req.body

    if (!employeeId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' })
    }

    const employee = await Employee.findById(employeeId)
    if (!employee) {
      return res.status(404).json({ error: 'Selecciona un empleado para registrar la venta.' })
    }

    const normalizedItems: SalePayloadItem[] = items.map((item: any) => ({
      productId: String(item.productId),
      quantity: Number(item.quantity),
      unit: item.unit as Unit,
      price: Number(item.price),
    }))

    const uniqueProductIds = Array.from(new Set(normalizedItems.map((item) => item.productId)))
    const products = await Product.find({ _id: { $in: uniqueProductIds } })
    const productsById = new Map(products.map((product) => [product._id.toString(), product]))
    const requiredByProduct = new Map<string, number>()

    for (const item of normalizedItems) {
      const product = productsById.get(item.productId)

      if (!product) {
        return res
          .status(404)
          .json({ error: 'Uno de los productos seleccionados ya no existe.' })
      }

      const quantityToDiscount = convertQuantity(item.quantity, item.unit, product.unit as Unit)
      requiredByProduct.set(
        item.productId,
        Number(((requiredByProduct.get(item.productId) || 0) + quantityToDiscount).toFixed(3))
      )
    }

    for (const [productId, quantityToDiscount] of requiredByProduct.entries()) {
      const product = productsById.get(productId)

      if (!product) {
        return res.status(404).json({ error: 'Uno de los productos seleccionados ya no existe.' })
      }

      if (product.quantity < quantityToDiscount) {
        return res.status(400).json({ error: `Stock insuficiente para ${product.name}.` })
      }
    }

    for (const [productId, quantityToDiscount] of requiredByProduct.entries()) {
      const product = productsById.get(productId)

      if (!product) {
        continue
      }

      product.quantity = Number((product.quantity - quantityToDiscount).toFixed(3))
      product.soldQuantity = Number((product.soldQuantity + quantityToDiscount).toFixed(3))
      await product.save()
    }

    const computedTotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0)

    const createdSale = await Sale.create({
      employeeId,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      total: Number.isFinite(Number(total)) ? Number(total) : computedTotal,
      items: normalizedItems,
    })

    const savedSale = await Sale.findById(createdSale._id)
      .populate('employeeId', 'firstName lastName')
      .populate('items.productId', 'name')
      .lean()

    if (!savedSale) {
      return res.status(500).json({ error: 'No se pudo recuperar la venta creada.' })
    }

    return res.status(201).json(serializeSale(savedSale))
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Error al crear venta'
    return res.status(500).json({ error: message })
  }
}
