import { NavLink, useLocation } from 'react-router-dom'
import { Home, ListMusic, ShieldCheck } from 'lucide-react'

const tabs = [
  { to: '/canciones', icon: ListMusic, label: 'Canciones' },
  { to: '/', icon: Home, label: 'Inicio', exact: true },
  { to: '/admin', icon: ShieldCheck, label: 'Admin' },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] border-t border-br z-50"
      style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-center justify-around px-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {tabs.map(({ to, icon: Icon, label, exact }) => {
          const isActive = exact ? location.pathname === to : location.pathname.startsWith(to)
          const isHome = to === '/'

          return (
            <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
              <div
                className={`flex items-center justify-center rounded-2xl transition-all duration-200
                  ${isHome
                    ? `w-12 h-12 -mt-4 shadow-lg ${isActive ? 'bg-accent-500' : 'bg-s2 border border-br'}`
                    : `w-8 h-8 ${isActive ? 'bg-accent-500/20' : ''}`
                  }`}
              >
                <Icon size={isHome ? 22 : 20} className={isActive ? (isHome ? 'text-t1' : 'text-accent-500') : 'text-t3'} />
              </div>
              <span className={`text-[10px] font-medium truncate ${isActive ? 'text-accent-500' : 'text-t3'}`}>
                {label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
