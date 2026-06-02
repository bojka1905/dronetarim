import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobStore, customerStore } from '../utils/store'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

// Takvim nokta renkleri iş tipine göre
const IS_TIPI_DOT = {
  tohumlama: 'bg-blue-500',
  ilac:      'bg-green-500',
  gubreleme: 'bg-yellow-500',
}

const IS_TIPI_BADGE = {
  tohumlama: { label: 'Tohumlama', cls: 'bg-blue-100 text-blue-700' },
  ilac:      { label: 'İlaçlama',  cls: 'bg-green-100 text-green-700' },
  gubreleme: { label: 'Gübreleme', cls: 'bg-yellow-100 text-yellow-700' },
}

const DURUM_BADGE = {
  planli:      { label: 'Planlandı',    cls: 'bg-blue-100 text-blue-700' },
  devamediyor: { label: 'Devam Ediyor', cls: 'bg-yellow-100 text-yellow-700' },
  tamamlandi:  { label: 'Tamamlandı',   cls: 'bg-green-100 text-green-700' },
}

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(toDateStr(today))

  const jobs = useMemo(() => jobStore.getAll(), [])

  const jobsByDate = useMemo(() => {
    const map = {}
    jobs.forEach(j => {
      if (!map[j.tarih]) map[j.tarih] = []
      map[j.tarih].push(j)
    })
    return map
  }, [jobs])

  const daysInMonth = useMemo(() => {
    const year = current.getFullYear()
    const month = current.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysCount = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysCount; d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }, [current])

  const selectedJobs = useMemo(() => {
    return [...(jobsByDate[selected] || [])].sort((a, b) => {
      if (!a.saat && !b.saat) return 0
      if (!a.saat) return 1
      if (!b.saat) return -1
      return a.saat.localeCompare(b.saat)
    })
  }, [jobsByDate, selected])

  const prevMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  return (
    <div className="flex flex-col">
      {/* Calendar header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} /></button>
          <h2 className="font-bold text-gray-900">{MONTHS_TR[current.getMonth()]} {current.getFullYear()}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={20} /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_TR.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {daysInMonth.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />
            const ds = toDateStr(date)
            const isToday = ds === toDateStr(today)
            const isSelected = ds === selected
            const hasJobs = jobsByDate[ds]?.length > 0
            const jobColors = (jobsByDate[ds] || []).map(j => IS_TIPI_DOT[j.isTipi] || 'bg-gray-400')

            return (
              <button key={ds} onClick={() => setSelected(ds)}
                className={`flex flex-col items-center py-1.5 rounded-lg transition-colors ${isSelected ? 'bg-primary-600' : isToday ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                <span className={`text-sm font-medium ${isSelected ? 'text-white' : isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                  {date.getDate()}
                </span>
                {hasJobs && (
                  <div className="flex gap-0.5 mt-0.5">
                    {jobColors.slice(0, 3).map((cls, idx) => (
                      <span key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : cls}`} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day jobs */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-3">
          {new Date(selected + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        {selectedJobs.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">Bu gün için planlanmış iş yok</div>
        ) : (
          <div className="space-y-2">
            {selectedJobs.map(job => {
              const customer = customerStore.getById(job.musteriId)
              const durum      = DURUM_BADGE[job.durum]   || DURUM_BADGE.planli
              const isTipi     = IS_TIPI_BADGE[job.isTipi] || IS_TIPI_BADGE.ilac
              const tipiIcon   = { tohumlama: '🌱', ilac: '🌿', gubreleme: '🌾' }[job.isTipi] || '🌿'
              const ilacLabel  = { tohumlama: 'Tohum', ilac: 'İlaç', gubreleme: 'Gübre' }[job.isTipi] || 'İlaç'

              return (
                <button key={job.id} onClick={() => navigate(`/isler/${job.id}`)}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 active:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {job.saat && (
                        <div className="text-xs font-semibold text-primary-600 mb-1">🕐 {job.saat}</div>
                      )}
                      <div className="font-semibold text-gray-900">{customer?.ad || 'Müşteri'}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{job.tarlaAdi} · {job.dekar} dönüm</div>
                      <div className="text-xs text-gray-500 mt-1">{tipiIcon} {job.ilac} {job.doz && `· ${job.doz}`}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isTipi.cls}`}>{isTipi.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${durum.cls}`}>{durum.label}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
