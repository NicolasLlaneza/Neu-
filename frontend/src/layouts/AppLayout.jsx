import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-dark">
      <Sidebar />
      <Topbar />
      <main className="md:ml-56 pt-14 p-4 md:p-6 pb-20 md:pb-6">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
