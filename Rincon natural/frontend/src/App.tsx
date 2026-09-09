import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import CajasPage from './pages/CajasPage'
import EmployeesPage from './pages/EmployeesPage'
import LoginPage from './pages/LoginPage'
import ProductsPage from './pages/ProductsPage'
import ProvidersPage from './pages/ProvidersPage'
import StockPage from './pages/StockPage'
import { isAuthenticated } from './services/auth'

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caja"
          element={
            <ProtectedRoute>
              <CajasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/empleados"
          element={
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/proveedores"
          element={
            <ProtectedRoute>
              <ProvidersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtectedRoute>
              <StockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </Router>
  )
}

export default App
