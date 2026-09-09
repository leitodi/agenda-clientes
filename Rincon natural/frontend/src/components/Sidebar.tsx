import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../services/auth'

const links = [
  { to: '/dashboard', label: 'Inicio' },
  { to: '/caja', label: 'Caja' },
  { to: '/productos', label: 'Productos' },
  { to: '/empleados', label: 'Empleados' },
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/stock', label: 'Stock' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="app-panel h-fit px-4 py-5 md:sticky md:top-6">
      <div className="brand-wood mb-6 rounded-[28px] border border-[rgba(255,255,255,0.2)] p-5">
        <div className="flex items-center gap-4 rounded-[22px] bg-white/12 p-4 backdrop-blur-[2px]">
          <img
            src="/logo.svg"
            alt="Rincon Natural"
            className="h-14 w-14 rounded-2xl bg-white/90 p-2"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#f5ead0]">Dietetica</p>
            <h1 className="text-2xl font-semibold text-white">Rincon Natural</h1>
          </div>
        </div>
      </div>

      <nav className="grid gap-2 md:gap-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              [
                'rounded-[22px] px-5 py-4 text-sm font-medium transition',
                isActive
                  ? 'border border-[rgba(45,80,22,0.22)] bg-[rgba(45,80,22,0.12)] text-[var(--color-verde-deep)] shadow-lg'
                  : 'border border-transparent bg-transparent text-[var(--color-text-muted)] hover:border-[rgba(139,105,20,0.16)] hover:bg-[rgba(139,105,20,0.08)] hover:text-[var(--color-verde-deep)]',
              ].join(' ')
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-6 w-full rounded-[22px] border border-[rgba(139,105,20,0.28)] bg-gradient-to-b from-[#8b6914] to-[#6f5310] px-4 py-3 text-sm font-semibold text-white transition hover:from-[#9a7720] hover:to-[#7b5d15]"
      >
        Cerrar sesion
      </button>
    </aside>
  )
}
