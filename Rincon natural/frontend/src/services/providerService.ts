import client from './api'
import { Provider } from '../types'

export const ProviderService = {
  getAll: () => client.get<Provider[]>('/providers'),
  getById: (id: string) => client.get<Provider>(`/providers/${id}`),
  create: (data: Omit<Provider, 'id'>) => client.post<Provider>('/providers', data),
  update: (id: string, data: Partial<Provider>) => client.put<Provider>(`/providers/${id}`, data),
  delete: (id: string) => client.delete(`/providers/${id}`),
}
