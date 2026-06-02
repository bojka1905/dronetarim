import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import CalendarPage from './pages/CalendarPage'
import Payments from './pages/Payments'
import Kasa from './pages/Kasa'
import Settings from './pages/Settings'
import PinScreen, { isPinRequired } from './components/PinScreen'

export default function App() {
  const [unlocked, setUnlocked] = useState(() => !isPinRequired())

  if (!unlocked) {
    return <PinScreen onUnlock={() => setUnlocked(true)} />
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/musteriler"    element={<Customers />} />
          <Route path="/musteriler/:id" element={<CustomerDetail />} />
          <Route path="/isler"      element={<Jobs />} />
          <Route path="/isler/:id"  element={<JobDetail />} />
          <Route path="/takvim"     element={<CalendarPage />} />
          <Route path="/odemeler"   element={<Payments />} />
          <Route path="/kasa"       element={<Kasa />} />
          <Route path="/ayarlar"    element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
