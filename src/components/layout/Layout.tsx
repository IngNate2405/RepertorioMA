import { type ReactNode } from 'react'
import { WifiOff } from 'lucide-react'
import BottomNav from './BottomNav'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

interface Props {
  children: ReactNode
  title?: string
  headerRight?: ReactNode
  noPadding?: boolean
}

export default function Layout({ children, title, headerRight, noPadding }: Props) {
  const online = useOnlineStatus()

  return (
    <div className="flex flex-col h-full bg-bg">
      {!online && (
        <div className="flex items-center justify-center gap-1.5 bg-accent-500/15 text-accent-500 text-xs font-medium py-1.5 px-4">
          <WifiOff size={12} /> Sin conexión — viendo datos guardados
        </div>
      )}
      {title && (
        <header className="flex items-center justify-between px-4 pt-12 pb-3 bg-bg sticky top-0 z-10 border-b border-br2">
          <h1 className="text-lg font-semibold text-t1">{title}</h1>
          {headerRight && <div>{headerRight}</div>}
        </header>
      )}
      <main className={`flex-1 overflow-y-auto pb-24 ${noPadding ? '' : 'px-4'}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
