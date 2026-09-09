import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('rincon')
  const [password, setPassword] = useState('rincon123')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesion.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1720px]">
        <section className="app-panel overflow-hidden p-3 md:p-4">
          <div className="brand-wood min-h-[280px] rounded-[36px] md:min-h-[360px]" />
        </section>

        <section className="mx-auto -mt-10 max-w-xl md:-mt-16">
          <div className="app-panel px-6 py-8 md:px-8">
            <p className="app-kicker">Acceso privado</p>
            <h3 className="app-title text-3xl">Iniciar sesion</h3>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="app-label">Usuario</span>
                <input
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="app-field"
                />
              </label>

              <label className="block">
                <span className="app-label">Contrasena</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="app-field"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-[rgba(139,105,20,0.24)] bg-[rgba(139,105,20,0.12)] px-4 py-3 text-sm text-[#6f5310]">
                  {error}
                </div>
              ) : null}

              <button type="submit" disabled={isSubmitting} className="app-button-primary w-full disabled:opacity-70">
                {isSubmitting ? 'Ingresando...' : 'Entrar al sistema'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
