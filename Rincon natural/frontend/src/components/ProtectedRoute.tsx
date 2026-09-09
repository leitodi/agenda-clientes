import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { isAuthenticated } from '../services/auth'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
