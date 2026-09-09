import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-page-shell">
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 md:py-8">
        <Header />
        <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Sidebar />
          <main className="min-w-0">
            <div className="fade-up">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
