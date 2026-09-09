import client from './api'
import { Product } from '../types'

export const ProductService = {
  getAll: () => client.get<Product[]>('/products'),
  getById: (id: string) => client.get<Product>(`/products/${id}`),
  create: (data: Omit<Product, 'id'>) => client.post<Product>('/products', data),
  update: (id: string, data: Partial<Product>) => client.put<Product>(`/products/${id}`, data),
  delete: (id: string) => client.delete(`/products/${id}`),
}
