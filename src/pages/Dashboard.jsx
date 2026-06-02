import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerStore, jobStore, stockStore } from '../utils/store'
import { Users, Briefcase, CreditCard, TrendingUp, Plus, ChevronRight, AlertTriangle } from 'lucide-react'
import { DroneIcon } from '../components/DroneIcon'

const STATUS_LABEL = {
  planli: { label: 'Planlandı', cls: 'bg-blue-100 text-blue-700' },
  devamediyor: { label: 'Devam Ediyor', cls: 'bg-yellow-100 text-yellow-700' },
  tamamlandi: { label: 'Tamamlandı', cls: 'bg-green-100 text-green-700' },
}

function formatCurrency(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0)
}

export default function Dashboard() {
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const customers = customerStore.getAll()
    const jobs = jobStore.getAll()
    const totalRevenue = jobs.reduce((s, j) => s + (Number(j.tutar) || 0), 0)
    const pendingRevenue = jobs.filter(j => j.odemeDurumu !== 'odendi').reduce((s, j) => s + (Number(j.tutar) || 0), 0)
    const d = new Date()
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const todayJobs = jobs.filter(j => j.tarih === todayStr)
    const criticalStock = stockStore.getCritical()
    return { customers: customers.length, jobCount: jobs.length, totalRevenue, pendingRevenue, todayJobs, jobs, criticalStock }
  }, [])

  const recentJobs = useMemo(() => {
    return [...stats.jobs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  }, [stats.jobs])

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <DroneIcon size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">DroneTarım</h1>
            <p className="text-xs text-gray-500">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
      </div>

      {/* Kritik stok uyarısı */}
      {stats.criticalStock.length > 0 && (
        <button onClick={() => navigate('/stok')}
          className="w-full bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 text-left active:bg-red-100">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">Kritik Stok Uyarısı</p>
            <p className="text-xs text-red-500 truncate">
              {stats.criticalStock.map(s => s.ad).join(', ')}
            </p>
          </div>
          <ChevronRight size={16} className="text-red-400 flex-shrink-0" />
        </button>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users size={20} />} label="Müşteri" value={stats.customers} color="bg-blue-50 text-blue-600" onClick={() => navigate('/musteriler')} />
        <StatCard icon={<Briefcase size={20} />} label="Toplam İş" value={stats.jobCount} color="bg-green-50 text-green-600" onClick={() => navigate('/isler')} />
        <StatCard icon={<TrendingUp size={20} />} label="Toplam Ciro" value={formatCurrency(stats.totalRevenue)} color="bg-purple-50 text-purple-600" onClick={() => navigate('/odemeler')} />
        <StatCard icon={<CreditCard size={20} />} label="Bekleyen" value={formatCurrency(stats.pendingRevenue)} color="bg-orange-50 text-orange-600" onClick={() => navigate('/odemeler')} />
      </div>

      {/* Bugünkü işler */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800">Bugünkü İşler</h2>
          <button onClick={() => navigate('/takvim')} className="text-primary-600 text-sm font-medium">Takvim →</button>
        </div>
        {stats.todayJobs.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm border border-gray-100">
            Bugün planlanmış iş yok
          </div>
        ) : (
          <div className="space-y-2">
            {stats.todayJobs.map(job => <JobCard key={job.id} job={job} onClick={() => navigate('/isler')} />)}
          </div>
        )}
      </section>

      {/* Son işler */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800">Son İşler</h2>
          <button onClick={() => navigate('/isler')} className="text-primary-600 text-sm font-medium">Tümü →</button>
        </div>
        {recentJobs.length === 0 ? (
          <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm border border-gray-100">
            Henüz iş kaydı yok
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map(job => <JobCard key={job.id} job={job} onClick={() => navigate('/isler')} />)}
          </div>
        )}
      </section>

      {/* Hızlı ekle */}
      <button
        onClick={() => navigate('/isler?yeni=1')}
        className="w-full bg-primary-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:bg-primary-700 transition-colors"
      >
        <Plus size={18} /> Yeni İş Ekle
      </button>
    </div>
  )
}

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <button onClick={onClick} className="bg-white rounded-xl p-4 border border-gray-100 text-left active:scale-95 transition-transform">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-2`}>{icon}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </button>
  )
}

function JobCard({ job, onClick }) {
  const s = STATUS_LABEL[job.durum] || STATUS_LABEL.planli
  const customer = customerStore.getById(job.musteriId)
  return (
    <button onClick={onClick} className="w-full bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3 text-left active:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 text-sm truncate">{customer?.ad || 'Müşteri'}</div>
        <div className="text-xs text-gray-500 truncate">{job.tarlaAdi} · {job.dekar} dön</div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
    </button>
  )
}
