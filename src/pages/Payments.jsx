import { useState, useMemo } from 'react'
import { paymentStore, jobStore, customerStore, getEffectivePaid, deriveOdemeDurumu } from '../utils/store'

function formatCurrency(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0)
}

function formatDateLong(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatDateShort(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const THIS_MONTH = new Date().toISOString().slice(0, 7)
const THIS_YEAR  = new Date().toISOString().slice(0, 4)

export default function Payments() {
  const [period, setPeriod] = useState('hepsi') // 'hepsi' | 'buay' | 'buyil'

  const allPayments = useMemo(() => paymentStore.getAll(), [])
  const allJobs     = useMemo(() => jobStore.getAll(), [])

  // Toplam istatistikler (tüm zamanlar)
  const stats = useMemo(() => {
    const paymentTotals = {}
    allPayments.forEach(p => {
      paymentTotals[p.isId] = (paymentTotals[p.isId] || 0) + (Number(p.miktar) || 0)
    })

    let toplam = 0, alinan = 0
    allJobs.forEach(j => {
      toplam += Number(j.tutar) || 0
      alinan += getEffectivePaid(j, paymentTotals)
    })

    const buAy = allPayments
      .filter(p => p.tarih?.slice(0, 7) === THIS_MONTH)
      .reduce((s, p) => s + (Number(p.miktar) || 0), 0)

    return { toplam, alinan, kalan: toplam - alinan, buAy }
  }, [allPayments, allJobs])

  // Filtreli ödeme hareketleri
  const payments = useMemo(() => {
    return allPayments
      .filter(p => {
        if (period === 'buay') return p.tarih?.slice(0, 7) === THIS_MONTH
        if (period === 'buyil') return p.tarih?.slice(0, 4) === THIS_YEAR
        return true
      })
      .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.createdAt?.localeCompare(a.createdAt || '') || 0)
  }, [allPayments, period])

  // Günlere göre grupla
  const grouped = useMemo(() => {
    const map = {}
    payments.forEach(p => {
      if (!map[p.tarih]) map[p.tarih] = []
      map[p.tarih].push(p)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [payments])

  // Aylara göre toplam (tüm ödemelerden)
  const monthlyTotals = useMemo(() => {
    const map = {}
    allPayments.forEach(p => {
      const m = p.tarih?.slice(0, 7)
      if (m) map[m] = (map[m] || 0) + (Number(p.miktar) || 0)
    })
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6) // son 6 ay
  }, [allPayments])

  const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900 mb-3">Ödeme Hareketleri</h1>

        {/* Özet kartlar */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-xs text-gray-500 mb-0.5">Toplam Ciro</div>
            <div className="text-sm font-bold text-gray-900">{formatCurrency(stats.toplam)}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
            <div className="text-xs text-green-600 mb-0.5">Tahsil</div>
            <div className="text-sm font-bold text-green-700">{formatCurrency(stats.alinan)}</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
            <div className="text-xs text-orange-600 mb-0.5">Kalan</div>
            <div className="text-sm font-bold text-orange-700">{formatCurrency(stats.kalan)}</div>
          </div>
        </div>

        {/* Tahsilat barı */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Tahsilat oranı</span>
            <span className="font-medium">{stats.toplam > 0 ? Math.round((stats.alinan / stats.toplam) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${stats.toplam > 0 ? Math.min(100, (stats.alinan / stats.toplam) * 100) : 0}%` }} />
          </div>
        </div>

        {/* Bu ay kartı */}
        <div className="bg-primary-50 rounded-xl px-4 py-2.5 flex items-center justify-between mb-3 border border-primary-100">
          <span className="text-xs text-primary-700 font-medium">Bu Ay Tahsilat</span>
          <span className="text-base font-bold text-primary-700">{formatCurrency(stats.buAy)}</span>
        </div>

        {/* Dönem filtresi */}
        <div className="flex gap-1.5">
          {[
            { value: 'hepsi', label: 'Tümü' },
            { value: 'buay',  label: 'Bu Ay' },
            { value: 'buyil', label: 'Bu Yıl' },
          ].map(f => (
            <button key={f.value} onClick={() => setPeriod(f.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${period === f.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aylık özet şeridi */}
      {period === 'hepsi' && monthlyTotals.length > 1 && (
        <div className="px-4 pt-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Aylık Tahsilat</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {monthlyTotals.map(([month, total]) => {
              const [y, m] = month.split('-')
              const isThis = month === THIS_MONTH
              return (
                <div key={month} className={`flex-shrink-0 rounded-xl px-3 py-2 text-center border ${isThis ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-100'}`}>
                  <div className={`text-xs font-medium ${isThis ? 'text-primary-600' : 'text-gray-500'}`}>{MONTH_NAMES[parseInt(m) - 1]} {y}</div>
                  <div className={`text-sm font-bold mt-0.5 ${isThis ? 'text-primary-700' : 'text-gray-800'}`}>{formatCurrency(total)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hareket listesi — güne göre gruplu */}
      <div className="p-4 space-y-4">
        {grouped.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">
            {period === 'hepsi' ? 'Henüz ödeme hareketi yok' : 'Bu dönemde ödeme hareketi yok'}
          </div>
        )}
        {grouped.map(([day, dayPayments]) => {
          const dayTotal = dayPayments.reduce((s, p) => s + (Number(p.miktar) || 0), 0)
          return (
            <div key={day}>
              {/* Gün başlığı */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">{formatDateLong(day)}</span>
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{formatCurrency(dayTotal)}</span>
              </div>
              {/* O günün ödemeleri */}
              <div className="space-y-2">
                {dayPayments.map(p => {
                  const job      = jobStore.getById(p.isId)
                  const customer = job ? customerStore.getById(job.musteriId) : null
                  return (
                    <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{customer?.ad || '—'}</div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {job?.tarlaAdi || '—'}{job?.dekar ? ` · ${job.dekar} dön` : ''}
                          </div>
                          {p.not && <div className="text-xs text-gray-400 mt-0.5 italic">{p.not}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-green-700">{formatCurrency(p.miktar)}</div>
                          {job?.tutar && (
                            <div className="text-xs text-gray-400 mt-0.5">/ {formatCurrency(job.tutar)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
