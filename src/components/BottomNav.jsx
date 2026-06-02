import { NavLink } from 'react-router-dom'
import { Users, Briefcase, Calendar, CreditCard, LayoutDashboard, Settings, Wallet, Package } from 'lucide-react'

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Ana Sayfa' },
  { to: '/musteriler', icon: Users,           label: 'Müşteri' },
  { to: '/isler',      icon: Briefcase,       label: 'İşler' },
  { to: '/takvim',     icon: Calendar,        label: 'Takvim' },
  { to: '/stok',       icon: Package,         label: 'Stok' },
  { to: '/odemeler',   icon: CreditCard,      label: 'Ödeme' },
  { to: '/kasa',       icon: Wallet,          label: 'Kasa' },
  { to: '/ayarlar',    icon: Settings,        label: 'Ayarlar' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="flex items-stretch max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 gap-0.5 font-medium transition-colors min-h-[50px] ${
                isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[9px] leading-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
