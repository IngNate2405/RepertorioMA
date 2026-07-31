import Layout from '../components/layout/Layout'
import DarkModeToggle from '../components/settings/DarkModeToggle'
import LogoutButton from '../components/settings/LogoutButton'

export default function Settings() {
  return (
    <Layout title="Configuración">
      <div className="pt-3 space-y-4 pb-6">
        <DarkModeToggle />

        <div className="pt-2 border-t border-br2">
          <LogoutButton />
        </div>
      </div>
    </Layout>
  )
}
