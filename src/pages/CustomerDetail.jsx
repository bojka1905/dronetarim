import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { customerStore, jobStore, paymentStore, getEffectivePaid, deriveOdemeDurumu } from '../utils/store'
import { generateCustomerSummary, openWhatsApp } from '../utils/whatsapp'
import { ArrowLeft, Edit2, Phone, MapPin, MessageCircle, Briefcase, X, Trash2 } from 'lucide-react'

const DURUM_BADGE = {
  planli:      { label: 'Planlandı',    cls: 'bg-blue-100 text-blue-700' },
  devamediyor: { label: 'Devam Ediyor', cls: 'bg-yellow-100 text-yellow-700' },
  tamamlandi:  { label: 'Tamamlandı',   cls: 'bg-green-100 text-green-700' },
}

const IS_TIPI_BADGE = {
  tohumlama: { label: '🌱 Tohumlama', cls: 'bg-blue-50 text-blue-600' },
  ilac:      { label: '🌿 İlaçlama',  cls: 'bg-green-50 text-green-600' },
  gubreleme: { label: '🌾 Gübreleme', cls: 'bg-yellow-50 text-yellow-600' },
}

function formatCurrency(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(() => customerStore.getById(id))
  const [jobs, setJobs] = useState(() => jobStore.getByCustomer(id))
  const [allPayments, setAllPayments] = useState(() => paymentStore.getAll())
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState(() => customer || { ad: '', telefon: '', il: '', ilce: '', notlar: '' })

  const paymentTotals = useMemo(() => {
    const map = {}
    allPayments.forEach(p => { map[p.isId] = (map[p.isId] || 0) + (Number(p.miktar) || 0) })
    return map
  }, [allPayments])

  const financials = useMemo(() => {
    const totalAlacak = jobs.reduce((s, j) => s + (Number(j.tutar) || 0), 0)
    const totalTahsil = jobs.reduce((s, j) => s + getEffectivePaid(j, paymentTotals), 0)
    const kalan = Math.max(0, totalAlacak - totalTahsil)
    return { totalAlacak, totalTahsil, kalan }
  }, [jobs, paymentTotals])

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.tarih) - new Date(a.tarih)),
    [jobs]
  )

  if (!customer) {
    return (
      <div className="p-4 text-center text-gray-400 py-20">
        <p>Müşteri bulunamadı</p>
        <button onClick={() => navigate('/musteriler')} className="mt-4 text-primary-600 font-medium">← Geri Dön</button>
      </div>
    )
  }

  const refresh = () => {
    const updated = customerStore.getById(id)
    setCustomer(updated)
    setJobs(jobStore.getByCustomer(id))
    setAllPayments(paymentStore.getAll())
    if (updated) setForm(updated)
  }

  const handleSave = () => {
    if (!form.ad?.trim()) return
    customerStore.update(id, form)
    refresh()
    setShowEdit(false)
  }

  const handleDelete = () => {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return
    customerStore.delete(id)
    navigate('/musteriler')
  }

  const handleWhatsApp = () => {
    if (!customer.telefon) { alert('Müşteri telefon numarası yok'); return }
    const text = generateCustomerSummary(customer, sortedJobs, financials)
    openWhatsApp(customer.telefon, text)
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/musteriler')} className="p-1 -ml-1 text-gray-500 active:text-gray-700">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{customer.ad}</h1>
            {(customer.il || customer.ilce) && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin size={11} />{customer.il}{customer.ilce ? ` / ${customer.ilce}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => { setForm(customer); setShowEdit(true) }}
            className="p-2 text-gray-500 border border-gray-200 rounded-lg active:bg-gray-50"
          >
            <Edit2 size={18} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Müşteri bilgi kartı */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-bold text-lg">{customer.ad.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900">{customer.ad}</div>
              {customer.telefon && (
                <a href={`tel:${customer.telefon}`} className="text-sm text-primary-600 flex items-center gap-1 mt-0.5">
                  <Phone size={13} />{customer.telefon}
                </a>
              )}
            </div>
          </div>
          {customer.notlar && (
            <p className="text-sm text-gray-500 pt-2 border-t border-gray-100">{customer.notlar}</p>
          )}
        </div>

        {/* Finansal özet */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Toplam</div>
            <div className="text-sm font-bold text-gray-800">{formatCurrency(financials.totalAlacak)}</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
            <div className="text-xs text-green-600 mb-1">Tahsil</div>
            <div className="text-sm font-bold text-green-700">{formatCurrency(financials.totalTahsil)}</div>
          </div>
          <div className={`rounded-xl border p-3 text-center ${financials.kalan > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
            <div className={`text-xs mb-1 ${financials.kalan > 0 ? 'text-orange-600' : 'text-green-600'}`}>Kalan</div>
            <div className={`text-sm font-bold ${financials.kalan > 0 ? 'text-orange-700' : 'text-green-700'}`}>{formatCurrency(financials.kalan)}</div>
          </div>
        </div>

        {/* WhatsApp butonu */}
        <button
          onClick={handleWhatsApp}
          className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:bg-green-700 transition-colors"
        >
          <MessageCircle size={18} /> WhatsApp'a Özet Gönder
        </button>

        {/* İşler listesi */}
        <div>
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
            <Briefcase size={16} /> İşler ({jobs.length})
          </h2>
          {sortedJobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
              Bu müşteriye ait iş kaydı yok
            </div>
          ) : (
            <div className="space-y-2">
              {sortedJobs.map(job => {
                const durumBadge = DURUM_BADGE[job.durum] || DURUM_BADGE.planli
                const tipiInfo   = IS_TIPI_BADGE[job.isTipi] || IS_TIPI_BADGE.ilac
                const totalPaid  = getEffectivePaid(job, paymentTotals)
                const kalan      = Math.max(0, (Number(job.tutar) || 0) - totalPaid)
                const odemeDurum = deriveOdemeDurumu(job.tutar, totalPaid)
                return (
                  <div key={job.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{job.tarlaAdi}</div>
                        <div className="text-xs text-gray-500">
                          {job.dekar} dönüm · {formatDate(job.tarih)}{job.saat ? ` · ${job.saat}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${durumBadge.cls}`}>{durumBadge.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipiInfo.cls}`}>{tipiInfo.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      {Number(job.tutar) > 0 && <span className="text-gray-500">{formatCurrency(job.tutar)}</span>}
                      {odemeDurum === 'odendi'   && <span className="text-green-600 font-medium">✓ Ödendi</span>}
                      {odemeDurum === 'kismi'    && <span className="text-yellow-600 font-medium">Kısmi · Kalan {formatCurrency(kalan)}</span>}
                      {odemeDurum === 'bekliyor' && Number(job.tutar) > 0 && <span className="text-orange-600 font-medium">Bekliyor</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Düzenle Modalı */}
      {showEdit && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEdit(false)} />
          <div className="relative w-full bg-white rounded-t-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Müşteri Düzenle</h2>
              <button onClick={() => setShowEdit(false)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              <Field label="Ad Soyad *" value={form.ad} onChange={v => setField('ad', v)} placeholder="Ahmet Yılmaz" />
              <Field label="Telefon" value={form.telefon} onChange={v => setField('telefon', v)} placeholder="0555 123 4567" type="tel" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="İl" value={form.il} onChange={v => setField('il', v)} placeholder="Konya" />
                <Field label="İlçe" value={form.ilce} onChange={v => setField('ilce', v)} placeholder="Çumra" />
              </div>
              <Field label="Notlar" value={form.notlar} onChange={v => setField('notlar', v)} placeholder="Arazi bilgileri..." multiline />
            </div>
            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 bg-white">
              <button onClick={handleDelete} className="p-2.5 rounded-lg border border-red-200 text-red-500 active:bg-red-50">
                <Trash2 size={18} />
              </button>
              <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium">İptal</button>
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
