import client from './api'
import { Employee, EmployeeSchedule, Product, Provider, Sale } from '../types'

type ProviderInput = Omit<Provider, 'id' | 'active'> & {
  id?: string
  active?: boolean
}

type EmployeeInput = Omit<Employee, 'id' | 'active'> & {
  id?: string
  active?: boolean
}

type ProductInput = Omit<Product, 'id' | 'soldQuantity'> & {
  id?: string
  soldQuantity?: number
}

type SaleInput = {
  employeeId: string
  saleDate: string
  items: Array<{
    productId: string
    quantity: number
    unit: Product['unit']
    price: number
  }>
}

interface BackendProvider {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  active?: boolean
}

interface BackendEmployee {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  role: Employee['role']
  salary: number
  active: boolean
  schedule?: Partial<EmployeeSchedule>
  schedules?: Array<Partial<EmployeeSchedule>>
}

interface BackendProduct {
  id: string
  name: string
  providerId: string
  providerIds?: string[]
  quantity: number
  unit: Product['unit']
  minimumStock: number
  soldQuantity?: number
}

interface BackendSaleItem {
  id: string
  productId: string
  quantity: number
  unit: Product['unit']
  price: number
  product?: {
    name: string
  }
}

interface BackendSale {
  id: string
  employeeId: string
  saleDate: string
  total: number
  employee?: {
    firstName: string
    lastName: string
  }
  items: BackendSaleItem[]
}

const emptySchedule: EmployeeSchedule = {
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

function normalizeProvider(provider: BackendProvider): Provider {
  return {
    id: provider.id,
    name: provider.name,
    address: provider.address ?? '',
    phone: provider.phone ?? '',
    email: provider.email ?? '',
    active: provider.active ?? true,
  }
}

function normalizeSchedule(schedule?: Partial<EmployeeSchedule>): EmployeeSchedule {
  return {
    ...emptySchedule,
    ...schedule,
  }
}

function normalizeEmployee(employee: BackendEmployee): Employee {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone ?? '',
    role: employee.role,
    salary: employee.salary,
    active: employee.active,
    schedule: normalizeSchedule(employee.schedule ?? employee.schedules?.[0]),
  }
}

function normalizeProduct(product: BackendProduct): Product {
  return {
    id: product.id,
    name: product.name,
    providerId: product.providerId,
    providerIds: Array.from(new Set([product.providerId, ...(product.providerIds ?? [])])),
    quantity: product.quantity,
    unit: product.unit,
    minimumStock: product.minimumStock,
    soldQuantity: product.soldQuantity ?? 0,
  }
}

function normalizeSale(sale: BackendSale): Sale {
  return {
    id: sale.id,
    employeeId: sale.employeeId,
    employeeName: sale.employee
      ? `${sale.employee.firstName} ${sale.employee.lastName}`
      : 'Empleado',
    saleDate: sale.saleDate,
    total: sale.total,
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name ?? 'Producto',
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      subtotal: item.quantity * item.price,
    })),
  }
}

export async function getProviders() {
  const { data } = await client.get<BackendProvider[]>('/providers')
  return data.map(normalizeProvider).sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveProvider(input: ProviderInput) {
  if (input.id) {
    await client.put(`/providers/${input.id}`, input)
  } else {
    await client.post('/providers', input)
  }

  return getProviders()
}

export async function deleteProvider(id: string) {
  await client.delete(`/providers/${id}`)
  return getProviders()
}

export async function getEmployees() {
  const { data } = await client.get<BackendEmployee[]>('/employees')
  return data
    .map(normalizeEmployee)
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
}

export async function saveEmployee(input: EmployeeInput) {
  const payload = {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone || null,
    role: input.role,
    salary: input.salary,
    schedule: input.schedule,
  }

  if (input.id) {
    await client.put(`/employees/${input.id}`, payload)
  } else {
    await client.post('/employees', payload)
  }

  return getEmployees()
}

export async function deleteEmployee(id: string) {
  await client.delete(`/employees/${id}`)
  return getEmployees()
}

export async function getProducts() {
  const { data } = await client.get<BackendProduct[]>('/products')
  return data.map(normalizeProduct).sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveProduct(input: ProductInput) {
  const payload = {
    name: input.name,
    providerId: input.providerId,
    providerIds: input.providerIds,
    quantity: input.quantity,
    unit: input.unit,
    minimumStock: input.minimumStock,
    soldQuantity: input.soldQuantity ?? 0,
  }

  if (input.id) {
    await client.put(`/products/${input.id}`, payload)
  } else {
    await client.post('/products', payload)
  }

  return getProducts()
}

export async function deleteProduct(id: string) {
  await client.delete(`/products/${id}`)
  return getProducts()
}

export async function getSales() {
  const { data } = await client.get<BackendSale[]>('/sales')
  return data
    .map(normalizeSale)
    .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
}

export async function createSale(input: SaleInput) {
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const { data } = await client.post<BackendSale>('/sales', {
    ...input,
    total,
  })

  return normalizeSale(data)
}
