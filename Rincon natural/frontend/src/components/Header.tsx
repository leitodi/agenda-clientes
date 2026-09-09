import { useLocation } from 'react-router-dom'
import { getSessionUser } from '../services/auth'

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Panel general',
    subtitle: 'Vista rapida del negocio y alertas importantes.',
  },
  '/caja': {
    title: 'Caja y ventas',
    subtitle: 'Registra ventas, controla el rango de fechas y exporta a Excel.',
  },
  '/productos': {
    title: 'Productos',
    subtitle: 'Administra catalogo, unidades de medida y proveedores.',
  },
  '/empleados': {
    title: 'Empleados',
    subtitle: 'Organiza horarios, roles y sueldo fijo del equipo.',
  },
  '/proveedores': {
    title: 'Proveedores',
    subtitle: 'Gestiona contactos y datos comerciales.',
  },
  '/stock': {
    title: 'Stock',
    subtitle: 'Controla existencias, vendidos y minimos por producto.',
  },
}

export default function Header() {
  const location = useLocation()
  const sessionUser = getSessionUser()
  const meta = pageMeta[location.pathname] ?? pageMeta['/dashboard']

  return (
    <header className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
      <div className="app-panel p-3">
        <div className="brand-wood min-h-[240px] rounded-[26px] border border-white/20 md:min-h-[320px]" />
      </div>

      <div className="app-panel flex flex-col justify-between px-6 py-6 md:px-8">
        <div>
          <p className="app-kicker">Panel de gestion</p>
          <h3 className="app-title text-3xl md:text-[3rem]">Sesion activa</h3>
          <p className="app-subtitle">
            Usuario: {sessionUser?.name ?? 'Usuario'} ({sessionUser?.email ?? ''})
          </p>
        </div>

        <div className="mt-8">
          <div className="app-panel-muted px-4 py-4">
            <p className="app-kicker tracking-[0.25em]">Vista actual</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-verde-deep)]">
              {meta.title}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
