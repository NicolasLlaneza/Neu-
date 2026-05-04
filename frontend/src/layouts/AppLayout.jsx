import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-dark">
      <Sidebar />
      <Topbar />
      <main className="ml-56 pt-14 p-6">
        {children}
      </main>
    </div>
  )
}
