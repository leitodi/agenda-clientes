import { SessionUser } from '../types'

export const SESSION_KEY = 'rincon-natural-session-v3'
export const TOKEN_KEY = 'rincon-natural-token-v1'

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const rawUser = window.localStorage.getItem(SESSION_KEY)
  return rawUser ? (JSON.parse(rawUser) as SessionUser) : null
}

export function storeSession(token: string, user: SessionUser) {
  window.localStorage.setItem(TOKEN_KEY, token)
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(SESSION_KEY)
}
