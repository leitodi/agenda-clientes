import client from './api'
import { SessionUser } from '../types'
import { clearSession, getStoredToken, getStoredUser, storeSession } from './session'

interface LoginResponse {
  token: string
  user: SessionUser
}

export async function login(email: string, password: string) {
  try {
    const { data } = await client.post<LoginResponse>('/auth/login', {
      email,
      password,
    })

    storeSession(data.token, data.user)
    return data.user
  } catch (error: any) {
    const message =
      error?.response?.data?.error || 'No se pudo iniciar sesion.'
    throw new Error(message)
  }
}

export function logout() {
  clearSession()
}

export function getSessionUser() {
  return getStoredUser()
}

export function isAuthenticated() {
  return Boolean(getStoredToken() && getStoredUser())
}
