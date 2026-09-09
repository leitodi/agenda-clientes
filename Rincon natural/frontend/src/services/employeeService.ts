import client from './api'
import { Employee } from '../types'

export const EmployeeService = {
  getAll: () => client.get<Employee[]>('/employees'),
  getById: (id: string) => client.get<Employee>(`/employees/${id}`),
  create: (data: Omit<Employee, 'id'>) => client.post<Employee>('/employees', data),
  update: (id: string, data: Partial<Employee>) => client.put<Employee>(`/employees/${id}`, data),
  delete: (id: string) => client.delete(`/employees/${id}`),
}
