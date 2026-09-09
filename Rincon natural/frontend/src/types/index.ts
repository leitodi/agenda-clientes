export type Unit = 'kg' | 'g' | 'unidad'

export type EmployeeRole = 'personal' | 'empleado'

export interface SessionUser {
  id: string
  email: string
  name: string
}

export interface User extends SessionUser {
  password: string
}

export interface EmployeeSchedule {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
  startTime: string
  endTime: string
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  phone: string
  role: EmployeeRole
  salary: number
  active: boolean
  schedule: EmployeeSchedule
}

export interface Provider {
  id: string
  name: string
  address: string
  phone: string
  email: string
  active: boolean
}

export interface Product {
  id: string
  name: string
  providerId: string
  providerIds: string[]
  quantity: number
  unit: Unit
  minimumStock: number
  soldQuantity: number
}

export interface SaleItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unit: Unit
  price: number
  subtotal: number
}

export interface Sale {
  id: string
  employeeId: string
  employeeName: string
  saleDate: string
  total: number
  items: SaleItem[]
}

export interface AppState {
  users: User[]
  employees: Employee[]
  providers: Provider[]
  products: Product[]
  sales: Sale[]
}
