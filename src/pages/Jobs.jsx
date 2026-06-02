import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jobStore, customerStore, paymentStore, getEffectivePaid, deriveOdemeDurumu } from '../utils/store'
import { generateJobSummary, openWhatsApp } from '../utils/whatsapp'
import { Plus, Search, X, Trash2, MessageCircle, Send, ChevronDown, UserPlus, Users } from 'lucide-react'

function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const EMPTY_FORM = {
  musteriId: '', tarlaAdi: '', dekar: '', ilac: '', doz: '',
  tarih: localDateStr(), saat: '',
  isTipi: 'ilac', durum: 'planli', tutar: '', odemeDurumu: 'bekliyor', notlar: '',
}

const IS_TIPI_OPTIONS = [
  { value: 'tohumlama', label: 'Tohumlama', cls: 'bg-blue-100 text-blue-700',     activeCls: 'bg-blue-600 text-white border-blue-600' },
  { value: 'ilac',      label: 'İlaçlama',  cls: 'bg-green-100 text-green-700',   activeCls: 'bg-green-600 text-white border-green-600' },
  { value: 'gubreleme', label: 'Gübreleme', cls: 'bg-yellow-100 text-yellow-700', activeCls: 'bg-yellow-500 text-white border-yellow-500' },
]

// İş tipine göre form alan isimleri ve ikonları
const IS_TIPI_FIELDS = {
  tohumlama: { ilacLabel: 'Tohum Türü',  ilacPlaceholder: 'Buğday, arpa, mısır...', dozLabel: 'Miktar (kg/dönüm)', dozPlaceholder: '20', icon: '🌱' },
  ilac:      { ilacLabel: 'İlaç Adı',    ilacPlaceholder: 'Fungusit XYZ',            dozLabel: 'Doz / Karışım',      dozPlaceholder: '100ml/da', icon: '🌿' },
  gubreleme: { ilacLabel: 'Gübre Adı',   ilacPlaceholder: 'DAP, Üre, 20-20-0...',   dozLabel: 'Miktar (kg/dönüm)', dozPlaceholder: '25', icon: '🌾' },
}

const EMPTY_YENI_MUSTERI = { ad: '', telefon: '', koySemt: '' }
const EMPTY_PAYMENT = { tarih: localDateStr(), miktar: '', not: '' }

const DURUM_OPTIONS = [
  { value: 'planli',      label: 'Planlandı',    cls: 'bg-blue-100 text-blue-700' },
  { value: 'devamediyor', label: 'Devam Ediyor', cls: 'bg-yellow-100 text-yellow-700' },
  { value: 'tamamlandi',  label: 'Tamamlandı',   cls: 'bg-green-100 text-green-700' },
]

const ODEME_BADGE = {
  bekliyor: { label: 'Bekliyor', cls: 'bg-orange-100 text-orange-700' },
  kismi:    { label: 'Kısmi',    cls: 'bg-yellow-100 text-yellow-700' },
  odendi:   { label: 'Ödendi',   cls: 'bg-green-100 text-green-700' },
}

function formatCurrency(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const IS_TIPI_LABEL_TR = { tohumlama: '🌱 Tohumlama', ilac: '🌿 İlaçlama', gubreleme: '🌾 Gübreleme' }
const URUN_LABEL_TR    = { tohumlama: '🌱 Tohum',     ilac: '🌿 İlaç',     gubreleme: '🌾 Gübre' }

function generateBulkMessage(date, plannedJobs) {
  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  let text = `📅 *${dateStr} - İş Planı*`
  plannedJobs.forEach((job, i) => {
    const customer = customerStore.getById(job.musteriId)
    const koySemt  = customer?.il || ''
    text += `\n\n${i + 1}. 👤 *${customer?.ad || 'Müşteri'}*`
    text += `\n   📍 ${koySemt ? koySemt + ' - ' : ''}${job.tarlaAdi}`
    text += `\n   ${IS_TIPI_LABEL_TR[job.isTipi] || '🌿 İlaçlama'} | ${job.dekar} dönüm`
    if (job.saat) text += `\n   🕐 ${job.saat}`
    if (job.ilac) text += `\n   ${URUN_LABEL_TR[job.isTipi] || '🌿 İlaç'}: ${job.ilac}${job.doz ? ` (${job.doz})` : ''}`
  })
  text += '\n\n_DroneTarım - Drone İlaçlama Yönetim_'
  return text.trim()
}

export default function Jobs() {
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState(() => jobStore.getAll())
  const [customers, setCustomers] = useState(() => customerStore.getAll())
  const [allPayments, setAllPayments] = useState(() => paymentStore.getAll())
  const [search, setSearch] = useState('')
  const [filterDurum, setFilterDurum] = useState('hepsi')
  const [filterDate, setFilterDate] = useState(null) // null | 'week' | 'YYYY-MM-DD'
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [musteriMod, setMusteriMod] = useState('mevcut')
  const [yeniMusteri, setYeniMusteri] = useState(EMPTY_YENI_MUSTERI)
  // Ödeme kaydı state'leri
  const [jobPayments, setJobPayments] = useState([])
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [newPayment, setNewPayment] = useState(EMPTY_PAYMENT)
  // Toplu WhatsApp state'leri
  const [showBulkWA, setShowBulkWA] = useState(false)
  const [bulkDate, setBulkDate] = useState(() => localDateStr())
  const todayStr    = localDateStr()
  const tomorrowStr = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return localDateStr(d) })()

  useEffect(() => {
    if (searchParams.get('yeni') === '1') openAdd()
  }, [])

  // Her iş için toplam ödeme tutarı haritası
  const paymentTotals = useMemo(() => {
    const map = {}
    allPayments.forEach(p => {
      map[p.isId] = (map[p.isId] || 0) + (Number(p.miktar) || 0)
    })
    return map
  }, [allPayments])

  const bulkJobs = useMemo(() => {
    if (!showBulkWA) return []
    return jobs
      .filter(j => j.durum === 'planli' && j.tarih === bulkDate)
      .sort((a, b) => {
        if (!a.saat && !b.saat) return 0
        if (!a.saat) return 1
        if (!b.saat) return -1
        return a.saat.localeCompare(b.saat)
      })
  }, [jobs, bulkDate, showBulkWA])

  const handleBulkWhatsApp = () => {
    if (bulkJobs.length === 0) return
    const text = generateBulkMessage(bulkDate, bulkJobs)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const weekBounds = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const start = new Date(now)
    start.setDate(now.getDate() + mondayOffset)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start: localDateStr(start), end: localDateStr(end) }
  }, [])

  const filtered = useMemo(() => {
    return jobs
      .filter(j => {
        const c = customerStore.getById(j.musteriId)
        const text = `${c?.ad || ''} ${j.tarlaAdi} ${j.ilac}`.toLowerCase()
        const matchText  = text.includes(search.toLowerCase())
        const matchDurum = filterDurum === 'hepsi' || j.durum === filterDurum
        let matchDate = true
        if (filterDate === 'week') {
          matchDate = j.tarih >= weekBounds.start && j.tarih <= weekBounds.end
        } else if (filterDate) {
          matchDate = j.tarih === filterDate
        }
        return matchText && matchDurum && matchDate
      })
      .sort((a, b) => new Date(b.tarih) - new Date(a.tarih))
  }, [jobs, search, filterDurum, filterDate, weekBounds])

  const refresh = () => {
    setJobs(jobStore.getAll())
    setCustomers(customerStore.getAll())
    setAllPayments(paymentStore.getAll())
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setMusteriMod('mevcut')
    setYeniMusteri(EMPTY_YENI_MUSTERI)
    setJobPayments([])
    setShowPaymentForm(false)
    setNewPayment(EMPTY_PAYMENT)
    setModal('add')
  }

  const openEdit = (j) => {
    setForm(j)
    setMusteriMod('mevcut')
    setYeniMusteri(EMPTY_YENI_MUSTERI)
    setJobPayments(paymentStore.getByJob(j.id))
    setShowPaymentForm(false)
    setNewPayment(EMPTY_PAYMENT)
    setModal(j)
  }

  const handleSave = () => {
    if (!form.tarlaAdi) return

    let musteriId = form.musteriId
    if (musteriMod === 'yeni') {
      if (!yeniMusteri.ad.trim()) return
      const created = customerStore.add({
        ad: yeniMusteri.ad.trim(), telefon: yeniMusteri.telefon,
        il: yeniMusteri.koySemt, ilce: '', notlar: ''
      })
      musteriId = created.id
    } else {
      if (!musteriId) return
    }

    const totalPaid = modal !== 'add' ? (paymentTotals[modal.id] || 0) : 0
    const odemeDurumu = deriveOdemeDurumu(form.tutar, totalPaid)
    // alinanOdeme artık kullanılmıyor, temiz veri kaydet
    const { alinanOdeme: _removed, ...cleanForm } = form
    const jobData = { ...cleanForm, musteriId, odemeDurumu }

    if (modal === 'add') jobStore.add(jobData)
    else jobStore.update(modal.id, jobData)
    refresh()
    setModal(null)
  }

  const handleDelete = (id) => {
    if (!confirm('Bu işi ve tüm ödeme kayıtlarını silmek istiyor musunuz?')) return
    paymentStore.deleteByJob(id)
    jobStore.delete(id)
    refresh()
    setModal(null)
  }

  const syncJobPayments = (jobId) => {
    const updated = paymentStore.getByJob(jobId)
    setJobPayments(updated)
    const totalPaid = updated.reduce((s, p) => s + (Number(p.miktar) || 0), 0)
    jobStore.update(jobId, { odemeDurumu: deriveOdemeDurumu(form.tutar, totalPaid) })
    setAllPayments(paymentStore.getAll())
    setJobs(jobStore.getAll())
  }

  const handleAddPayment = () => {
    if (!newPayment.miktar || !newPayment.tarih || modal === 'add') return
    paymentStore.add({ isId: modal.id, ...newPayment })
    syncJobPayments(modal.id)
    setNewPayment(EMPTY_PAYMENT)
    setShowPaymentForm(false)
  }

  const handleDeletePayment = (paymentId) => {
    paymentStore.delete(paymentId)
    syncJobPayments(modal.id)
  }

  const handleWhatsApp = (job) => {
    const customer = customerStore.getById(job.musteriId)
    if (!customer?.telefon) { alert('Müşteri telefon numarası yok'); return }
    const totalPaid = getEffectivePaid(job, paymentTotals)
    const text = generateJobSummary(job, customer, totalPaid)
    openWhatsApp(customer.telefon, text)
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setYMField = (k, v) => setYeniMusteri(f => ({ ...f, [k]: v }))
  const setNPField = (k, v) => setNewPayment(p => ({ ...p, [k]: v }))

  // Modal içi ödeme özeti
  const modalTotalPaid = jobPayments.reduce((s, p) => s + (Number(p.miktar) || 0), 0)
  const modalKalan = Math.max(0, (Number(form.tutar) || 0) - modalTotalPaid)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">İşler</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBulkWA(true)}
              className="border border-green-200 text-green-700 bg-green-50 rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1 active:bg-green-100">
              <Send size={15} /> Toplu
            </button>
            <button onClick={openAdd} className="bg-primary-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1">
              <Plus size={16} /> Ekle
            </button>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Müşteri, tarla, ilaç ara..."
            className="w-full bg-gray-100 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {[{ value: 'hepsi', label: 'Tümü' }, ...DURUM_OPTIONS].map(d => (
            <button key={d.value} onClick={() => setFilterDurum(d.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterDurum === d.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {d.label}
            </button>
          ))}
        </div>
        {/* Tarih filtresi */}
        <div className="flex gap-2 items-center overflow-x-auto no-scrollbar pb-0.5">
          {[
            { label: 'Bugün', value: todayStr },
            { label: 'Yarın', value: tomorrowStr },
            { label: 'Bu Hafta', value: 'week' },
          ].map(opt => (
            <button key={opt.value}
              onClick={() => setFilterDate(prev => prev === opt.value ? null : opt.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterDate === opt.value ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>
              {opt.label}
            </button>
          ))}
          <input
            type="date"
            value={filterDate && filterDate !== 'week' ? filterDate : ''}
            onChange={e => setFilterDate(e.target.value || null)}
            className="flex-shrink-0 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary-500 bg-white text-gray-600"
          />
          {filterDate && (
            <button onClick={() => setFilterDate(null)}
              className="flex-shrink-0 p-1 rounded-full bg-gray-100 text-gray-500 active:bg-gray-200">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* İş listesi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">İş bulunamadı</div>
        )}
        {filtered.map(job => {
          const customer = customerStore.getById(job.musteriId)
          const durum      = DURUM_OPTIONS.find(d => d.value === job.durum)   || DURUM_OPTIONS[0]
          const isTipi     = IS_TIPI_OPTIONS.find(t => t.value === job.isTipi) || IS_TIPI_OPTIONS[1]
          const tipiFields = IS_TIPI_FIELDS[job.isTipi] || IS_TIPI_FIELDS.ilac
          const totalPaid = getEffectivePaid(job, paymentTotals)
          const kalan = Math.max(0, (Number(job.tutar) || 0) - totalPaid)
          const odemeDurum = deriveOdemeDurumu(job.tutar, totalPaid)
          const odemeBadge = ODEME_BADGE[odemeDurum] || ODEME_BADGE.bekliyor
          return (
            <div key={job.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={() => openEdit(job)} className="w-full p-4 text-left active:bg-gray-50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{customer?.ad || 'Müşteri'}</div>
                    <div className="text-sm text-gray-600">{job.tarlaAdi} · {job.dekar} dönüm</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${durum.cls}`}>{durum.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isTipi.cls}`}>{isTipi.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{tipiFields.icon} {job.ilac} {job.doz && `(${job.doz})`}</span>
                  <span>📅 {formatDate(job.tarih)}{job.saat ? ` · ${job.saat}` : ''}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${odemeBadge.cls}`}>{odemeBadge.label}</span>
                  <span className="text-xs text-gray-500">{formatCurrency(job.tutar)}</span>
                  {kalan > 0 && <span className="text-xs text-orange-600 font-medium">· Kalan {formatCurrency(kalan)}</span>}
                </div>
              </button>
              <div className="border-t border-gray-100 px-4 py-2">
                <button onClick={() => handleWhatsApp(job)} className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <MessageCircle size={15} /> WhatsApp'a Gönder
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Toplu WhatsApp Modalı */}
      {showBulkWA && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulkWA(false)} />
          <div className="relative w-full bg-white rounded-t-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Toplu WhatsApp Gönder</h2>
              <button onClick={() => setShowBulkWA(false)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Tarih seçimi */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Tarih</label>
                <div className="flex gap-2 mb-2">
                  {[{ label: 'Bugün', date: todayStr }, { label: 'Yarın', date: tomorrowStr }].map(({ label, date }) => (
                    <button key={date} onClick={() => setBulkDate(date)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${bulkDate === date ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 bg-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 bg-white" />
              </div>

              {/* Planlandı işleri listesi */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  {new Date(bulkDate + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' '}— {bulkJobs.length} planlanmış iş
                </p>
                {bulkJobs.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm bg-gray-50 rounded-xl border border-gray-100">
                    Bu tarihte "Planlandı" durumunda iş yok
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bulkJobs.map((job, i) => {
                      const customer = customerStore.getById(job.musteriId)
                      return (
                        <div key={job.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex gap-2">
                          <span className="text-sm font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">👤 {customer?.ad || 'Müşteri'}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              📍 {customer?.il ? `${customer.il} - ` : ''}{job.tarlaAdi} · {job.dekar} dönüm
                            </div>
                            <div className="text-xs text-gray-500">
                              {IS_TIPI_LABEL_TR[job.isTipi] || '🌿 İlaçlama'}
                              {job.saat ? ` · 🕐 ${job.saat}` : ''}
                            </div>
                            {job.ilac && (
                              <div className="text-xs text-gray-400">{URUN_LABEL_TR[job.isTipi] || '🌿 İlaç'}: {job.ilac}{job.doz ? ` (${job.doz})` : ''}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Mesaj önizlemesi */}
              {bulkJobs.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Mesaj Önizlemesi</label>
                  <pre className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 border border-gray-100 whitespace-pre-wrap font-sans leading-relaxed">
                    {generateBulkMessage(bulkDate, bulkJobs)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 bg-white">
              <button onClick={() => setShowBulkWA(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium">
                İptal
              </button>
              <button onClick={handleBulkWhatsApp} disabled={bulkJobs.length === 0}
                className="flex-1 py-2.5 rounded-lg bg-green-600 text-white font-semibold active:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-2">
                <MessageCircle size={18} /> WhatsApp'ta Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative w-full bg-white rounded-t-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{modal === 'add' ? 'Yeni İş' : 'İşi Düzenle'}</h2>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {/* Müşteri seçimi */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Müşteri *</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-2">
                  <button onClick={() => setMusteriMod('mevcut')}
                    className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${musteriMod === 'mevcut' ? 'bg-primary-600 text-white' : 'text-gray-600 bg-white'}`}>
                    <Users size={13} /> Mevcut Müşteri
                  </button>
                  <button onClick={() => setMusteriMod('yeni')}
                    className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${musteriMod === 'yeni' ? 'bg-primary-600 text-white' : 'text-gray-600 bg-white'}`}>
                    <UserPlus size={13} /> Yeni Müşteri
                  </button>
                </div>
                {musteriMod === 'mevcut' ? (
                  <div className="relative">
                    <select value={form.musteriId} onChange={e => setField('musteriId', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 appearance-none bg-white pr-8">
                      <option value="">Müşteri seçin...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                ) : (
                  <div className="space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <Field label="Ad Soyad *" value={yeniMusteri.ad} onChange={v => setYMField('ad', v)} placeholder="Ahmet Yılmaz" />
                    <Field label="Telefon" value={yeniMusteri.telefon} onChange={v => setYMField('telefon', v)} placeholder="0555 123 4567" type="tel" />
                    <Field label="Köy / İlçe" value={yeniMusteri.koySemt} onChange={v => setYMField('koySemt', v)} placeholder="Çumra / Konya" />
                  </div>
                )}
              </div>

              {/* İş Tipi */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">İş Tipi</label>
                <div className="flex gap-2">
                  {IS_TIPI_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setField('isTipi', t.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${form.isTipi === t.value ? t.activeCls : 'border-gray-200 text-gray-600'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Tarla Adı *" value={form.tarlaAdi} onChange={v => setField('tarlaAdi', v)} placeholder="Kuzey Tarla" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dönüm" value={form.dekar} onChange={v => setField('dekar', v)} placeholder="50" type="number" />
                <Field label="Tarih" value={form.tarih} onChange={v => setField('tarih', v)} type="date" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Başlangıç Saati" value={form.saat} onChange={v => setField('saat', v)} type="time" />
                <div />
              </div>
              {(() => {
                const f = IS_TIPI_FIELDS[form.isTipi] || IS_TIPI_FIELDS.ilac
                return <>
                  <Field label={f.ilacLabel} value={form.ilac} onChange={v => setField('ilac', v)} placeholder={f.ilacPlaceholder} />
                  <Field label={f.dozLabel}  value={form.doz}  onChange={v => setField('doz', v)}  placeholder={f.dozPlaceholder} />
                </>
              })()}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
                <div className="flex gap-2">
                  {DURUM_OPTIONS.map(d => (
                    <button key={d.value} onClick={() => setField('durum', d.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${form.durum === d.value ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Toplam Ücret (₺)" value={form.tutar} onChange={v => setField('tutar', v)} placeholder="1500" type="number" />
              <Field label="Notlar" value={form.notlar} onChange={v => setField('notlar', v)} placeholder="Ek bilgiler..." multiline />

              {/* ── Ödeme Geçmişi (sadece düzenleme modunda) ── */}
              {modal !== 'add' && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">Ödeme Geçmişi</span>
                    <button onClick={() => { setShowPaymentForm(v => !v); setNewPayment(EMPTY_PAYMENT) }}
                      className="text-xs text-primary-600 font-medium flex items-center gap-1">
                      <Plus size={13} /> Ödeme Ekle
                    </button>
                  </div>

                  {/* Özet şeridi */}
                  {Number(form.tutar) > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-gray-500">Toplam</div>
                        <div className="text-sm font-bold text-gray-800">{formatCurrency(form.tutar)}</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2 text-center border border-green-100">
                        <div className="text-xs text-green-600">Alınan</div>
                        <div className="text-sm font-bold text-green-700">{formatCurrency(modalTotalPaid)}</div>
                      </div>
                      <div className={`rounded-lg p-2 text-center border ${modalKalan > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                        <div className={`text-xs ${modalKalan > 0 ? 'text-orange-600' : 'text-green-600'}`}>Kalan</div>
                        <div className={`text-sm font-bold ${modalKalan > 0 ? 'text-orange-700' : 'text-green-700'}`}>{formatCurrency(modalKalan)}</div>
                      </div>
                    </div>
                  )}

                  {/* Ödeme ekleme formu */}
                  {showPaymentForm && (
                    <div className="bg-green-50 rounded-xl border border-green-200 p-3 mb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Tarih" value={newPayment.tarih} onChange={v => setNPField('tarih', v)} type="date" />
                        <Field label="Miktar (₺)" value={newPayment.miktar} onChange={v => setNPField('miktar', v)} placeholder="500" type="number" />
                      </div>
                      <Field label="Not (opsiyonel)" value={newPayment.not} onChange={v => setNPField('not', v)} placeholder="Nakit, havale..." />
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setShowPaymentForm(false)}
                          className="flex-1 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 bg-white">İptal</button>
                        <button onClick={handleAddPayment}
                          className="flex-1 py-2 text-xs rounded-lg bg-primary-600 text-white font-medium active:bg-primary-700">Ekle</button>
                      </div>
                    </div>
                  )}

                  {/* Ödeme listesi */}
                  {jobPayments.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-3">Henüz ödeme kaydı yok</p>
                  ) : (
                    <div className="space-y-2">
                      {[...jobPayments].sort((a, b) => b.tarih.localeCompare(a.tarih)).map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800">{formatCurrency(p.miktar)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {formatDate(p.tarih)}{p.not ? ` · ${p.not}` : ''}
                            </div>
                          </div>
                          <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 text-red-400 active:text-red-600 flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 bg-white">
              {modal !== 'add' && (
                <button onClick={() => handleDelete(modal.id)} className="p-2.5 rounded-lg border border-red-200 text-red-500 active:bg-red-50">
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium">İptal</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white font-medium active:bg-primary-700">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', multiline }) {
  const cls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white"
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} className={cls} />
      }
    </div>
  )
}
