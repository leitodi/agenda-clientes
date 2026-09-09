import Employee from '../models/Employee'
import Product from '../models/Product'
import Provider from '../models/Provider'
import Sale from '../models/Sale'
import User from '../models/User'
import { comparePassword, hashPassword } from './auth'

const defaultUser = {
  username: 'rincon',
  password: 'rincon123',
  name: 'Rincon Natural',
  role: 'admin',
}

const providerSeeds = [
  {
    name: 'Semillas del Sur',
    address: 'Av. San Martin 2450',
    phone: '11 4587 2201',
    email: 'ventas@semillasdelsur.com',
  },
  {
    name: 'Molinos Naturales',
    address: 'Belgrano 803',
    phone: '11 5022 1139',
    email: 'pedidos@molinosnaturales.com',
  },
  {
    name: 'Herbolaria Verde',
    address: 'Laprida 167',
    phone: '11 6170 8822',
    email: 'contacto@herbolariaverde.com',
  },
]

const employeeSeeds = [
  {
    firstName: 'Lucia',
    lastName: 'Mendez',
    phone: '11 3456 7788',
    role: 'personal',
    salary: 850000,
    schedule: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
      startTime: '08:00',
      endTime: '16:00',
    },
  },
  {
    firstName: 'Matias',
    lastName: 'Suarez',
    phone: '11 2987 5541',
    role: 'empleado',
    salary: 710000,
    schedule: {
      monday: false,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false,
      startTime: '10:00',
      endTime: '18:00',
    },
  },
]

const productSeeds = [
  {
    name: 'Avena arrollada',
    providerName: 'Molinos Naturales',
    providerNames: ['Molinos Naturales'],
    quantity: 32,
    unit: 'kg' as const,
    minimumStock: 12,
    soldQuantity: 6,
  },
  {
    name: 'Mix de semillas',
    providerName: 'Semillas del Sur',
    providerNames: ['Semillas del Sur', 'Herbolaria Verde'],
    quantity: 14,
    unit: 'kg' as const,
    minimumStock: 10,
    soldQuantity: 4.25,
  },
  {
    name: 'Te de manzanilla',
    providerName: 'Herbolaria Verde',
    providerNames: ['Herbolaria Verde'],
    quantity: 90,
    unit: 'unidad' as const,
    minimumStock: 30,
    soldQuantity: 18,
  },
  {
    name: 'Granola artesanal',
    providerName: 'Molinos Naturales',
    providerNames: ['Molinos Naturales', 'Semillas del Sur'],
    quantity: 8.5,
    unit: 'kg' as const,
    minimumStock: 9,
    soldQuantity: 2.5,
  },
]

const saleSeeds = [
  {
    employeeName: 'Lucia Mendez',
    saleDate: '2026-06-21T10:15:00.000Z',
    total: 22800,
    items: [
      { productName: 'Avena arrollada', quantity: 2, unit: 'kg' as const, price: 4200 },
      { productName: 'Te de manzanilla', quantity: 6, unit: 'unidad' as const, price: 2400 },
    ],
  },
  {
    employeeName: 'Matias Suarez',
    saleDate: '2026-06-22T12:30:00.000Z',
    total: 16000,
    items: [
      { productName: 'Mix de semillas', quantity: 500, unit: 'g' as const, price: 11000 },
      { productName: 'Granola artesanal', quantity: 1, unit: 'kg' as const, price: 10500 },
    ],
  },
]

async function ensureDefaultUser() {
  const existingUser = await User.findOne({ username: defaultUser.username })

  if (existingUser) {
    const passwordMatches = await comparePassword(defaultUser.password, existingUser.passwordHash)

    if (
      passwordMatches &&
      existingUser.name === defaultUser.name &&
      existingUser.role === defaultUser.role
    ) {
      return
    }
  }

  const passwordHash = await hashPassword(defaultUser.password)

  await User.findOneAndUpdate(
    { username: defaultUser.username },
    {
      username: defaultUser.username,
      passwordHash,
      name: defaultUser.name,
      role: defaultUser.role,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  )
}

async function ensureProviders() {
  if ((await Provider.countDocuments()) === 0) {
    await Provider.insertMany(providerSeeds.map((provider) => ({ ...provider, active: true })))
  }

  const providers = await Provider.find()
  return new Map(providers.map((provider) => [provider.name, provider]))
}

async function ensureEmployees() {
  if ((await Employee.countDocuments()) === 0) {
    await Employee.insertMany(employeeSeeds.map((employee) => ({ ...employee, active: true })))
  }

  const employees = await Employee.find()
  return new Map(employees.map((employee) => [`${employee.firstName} ${employee.lastName}`, employee]))
}

async function ensureProducts(providersByName: Map<string, any>) {
  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany(
      productSeeds.map((product) => {
        const primaryProvider = providersByName.get(product.providerName)
        const allProviders = product.providerNames
          .map((providerName) => providersByName.get(providerName))
          .filter(Boolean)

        if (!primaryProvider) {
          throw new Error(`No se encontro el proveedor ${product.providerName} para el seed.`)
        }

        return {
          name: product.name,
          providerId: primaryProvider._id,
          providerIds: allProviders.map((provider) => provider._id),
          quantity: product.quantity,
          unit: product.unit,
          minimumStock: product.minimumStock,
          soldQuantity: product.soldQuantity,
        }
      })
    )
  }

  const products = await Product.find()
  return new Map(products.map((product) => [product.name, product]))
}

async function ensureSales(employeesByName: Map<string, any>, productsByName: Map<string, any>) {
  if ((await Sale.countDocuments()) > 0) {
    return
  }

  await Sale.insertMany(
    saleSeeds.map((sale) => {
      const employee = employeesByName.get(sale.employeeName)

      if (!employee) {
        throw new Error(`No se encontro el empleado ${sale.employeeName} para el seed.`)
      }

      return {
        employeeId: employee._id,
        saleDate: new Date(sale.saleDate),
        total: sale.total,
        items: sale.items.map((item) => {
          const product = productsByName.get(item.productName)

          if (!product) {
            throw new Error(`No se encontro el producto ${item.productName} para el seed.`)
          }

          return {
            productId: product._id,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
          }
        }),
      }
    })
  )
}

export async function ensureSeedData() {
  await ensureDefaultUser()
  const providersByName = await ensureProviders()
  const employeesByName = await ensureEmployees()
  const productsByName = await ensureProducts(providersByName)
  await ensureSales(employeesByName, productsByName)
}
