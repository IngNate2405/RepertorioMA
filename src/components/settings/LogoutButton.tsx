import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useRole } from '../../contexts/RoleContext'

export default function LogoutButton() {
  const { logout } = useRole()
  const navigate = useNavigate()

  return (
    <button
      onClick={() => {
        logout()
        navigate('/entrar', { replace: true })
      }}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-s2 border border-br text-red-400 font-medium py-2.5"
    >
      <LogOut size={16} /> Cerrar sesión
    </button>
  )
}
