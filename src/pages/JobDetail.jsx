import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jobStore, customerStore, paymentStore, getEffectivePaid, deriveOdemeDurumu } from '../utils/store'
import { ArrowLeft, Edit2, Trash2, Phone, MapPin, X, Plus, MessageCircle } from 'lucide-react'
import { generateJobSummary, openWhatsApp } from '../utils/whatsapp'

function localDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0)
}

const IS_TIPI_OPTIONS = [
  { value: 'tohumlama', label: 'Tohumlama', activeCls: 'bg-blue-600 text-white border-blue-600' },
  { value: 'ilac',      label: 'İlaçlama',  activeCls: 'bg-green-600 text-white border-green-600' },
  { value: 'gubreleme', label: 'Gübreleme', activeCls: 'bg-yellow-500 text-white border-yellow-500' },
]

const IS_TIPI_FIELDS = {
  tohumlama: { ilacLabel: 'Tohum Türü',  ilacPlaceholder: 'Buğday, arpa, mısır...', dozLabel: 'Miktar (kg/dönüm)', dozPlaceholder: '20',       icon: '🌱' },
  ilac:      { ilacLabel: 'İlaç Adı',    ilacPlaceholder: 'Fungusit XYZ',            dozLabel: 'Doz / Karışım',      dozPlaceholder: '100ml/da', icon: '🌿' },
  gubreleme: { ilacLabel: 'Gübre Adı',   ilacPlaceholder: 'DAP, Üre, 20-20-0...',   dozLabel: 'Miktar (kg/dönüm)', dozPlaceholder: '25',       icon: '🌾' },
}

const IS_TIPI_BADGE = {
  tohumlama: { label: '🌱 Tohumlama', cls: 'bg-blue-100 text-blue-700' },
  ilac:      { label: '🌿 İlaçlama',  cls: 'bg-green-100 text-green-700' },
  gubreleme: { label: '🌾 Gübreleme', cls: 'bg-yellow-100 text-yellow-700' },
}

const DURUM_OPTIONS = [
  { value: 'planli',      label: 'Planlandı' },
  { value: 'devamediyor', label: 'Devam Ediyor' },
  { value: 'tamamlandi',  label: 'Tamamlandı' },
]

const DURUM_BADGE = {
  planli:      { label: 'Planlandı',    cls: 'bg-blue-100 text-blue-700' },
  devamediyor: { label: 'Devam Ediyor', cls: 'bg-yellow-100 text-yellow-700' },
  tamamlandi:  { label: 'Tamamlandı',   cls: 'bg-green-100 text-green-700' },
}

const ODEME_BADGE = {
  bekliyor: { label: 'Bekliyor', cls: 'bg-orange-100 text-orange-700' },
  kismi:    { label: 'Kısmi',    cls: 'bg-yellow-100 text-yellow-700' },
  odendi:   { label: 'Ödendi',   cls: 'bg-green-100 text-green-700' },
}

const EMPTY_PAYMENT = { tarih: localDateStr(), miktar: '', not: '' }

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(() => jobStore.getById(id))
  const [allPayments, setAllPayments] = useState(() => paymentStore.getAll())
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState(() => job || {})
  const [jobPayments, setJobPayments] = useState(() => paymentStore.getByJob(id))
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [newPayment, setNewPayment] = useState(EMPTY_PAYMENT)

  const customer = useMemo(() => job ? customerStore.getById(job.musteriId) : null, [job])

  const paymentTotals = useMemo(() => {
    const map = {}
    allPayments.forEach(p => { map[p.isId] = (map[p.isId] || 0) + (Number(p.miktar) || 0) })
    return map
  }, [allPayments])

  const totalPaid = job ? getEffectivePaid(job, paymentTotals) : 0
  const kalan = Math.max(0, (Number(job?.tutar) || 0) - totalPaid)
  const odemeDurum = job ? deriveOdemeDurumu(job.tutar, totalPaid) : 'bekliyor'

  const modalTotalPaid = jobPayments.reduce((s, p) => s + (Number(p.miktar) || 0), 0)
  const modalKalan = Math.max(0, (Number(form.tutar) || 0) - modalTotalPaid)

  if (!job) {
    return (
      <div className="p-4 text-center text-gray-400 py-20">
        <p>İş bulunamadı</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-medium">← Geri Dön</button>
      </div>
    )
  }

  const refresh = () => {
    const updated = jobStore.getById(id)
    setJob(updated)
    setAllPayments(paymentStore.getAll())
    setJobPayments(paymentStore.getByJob(id))
    if (updated) setForm(updated)
  }

  const handleSave = () => {
    if (!form.tarlaAdi) return
    const totalPaidNow = paymentTotals[id] || 0
    const odemeDurumu = deriveOdemeDurumu(form.tutar, totalPaidNow)
    const { alinanOdeme: _removed, ...cleanForm } = form
    jobStore.update(id, { ...cleanForm, odemeDurumu })
    refresh()
    setShowEdit(false)
  }

  const handleDelete = () => {
    if (!confirm('Bu işi ve tüm ödeme kayıtlarını silmek istediğinize emin misiniz?')) return
    paymentStore.deleteByJob(id)
    jobStore.delete(id)
    navigate(-1)
  }

  const syncPayments = () => {
    const updated = paymentStore.getByJob(id)
    setJobPayments(updated)
    const totalPaidNow = updated.reduce((s, p) => s + (Number(p.miktar) || 0), 0)
    jobStore.update(id, { odemeDurumu: deriveOdemeDurumu(form.tutar, totalPaidNow) })
    setAllPayments(paymentStore.getAll())
    setJob(jobStore.getById(id))
  }

  const handleAddPayment = () => {
    if (!newPayment.miktar || !newPayment.tarih) return
    paymentStore.add({ isId: id, ...newPayment })
    syncPayments()
    setNewPayment(EMPTY_PAYMENT)
    setShowPaymentForm(false)
  }

  const handleDeletePayment = (paymentId) => {
    paymentStore.delete(paymentId)
    syncPayments()
  }

  const handleWhatsApp = () => {
    if (!customer?.telefon) { alert('Müşteri telefon numarası yok'); return }
    const text = generateJobSummary(job, customer, totalPaid)
    openWhatsApp(customer.telefon, text)
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setNPField = (k, v) => setNewPayment(p => ({ ...p, [k]: v }))

  const tipiInfo = IS_TIPI_BADGE[job.isTipi] || IS_TIPI_BADGE.ilac
  const tipiFields = IS_TIPI_FIELDS[job.isTipi] || IS_TIPI_FIELDS.ilac
  const durumBadge = DURUM_BADGE[job.durum] || DURUM_BADGE.planli
  const odemeBadge = ODEME_BADGE[odemeDurum] || ODEME_BADGE.bekliyor

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-500 active:text-gray-700">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{job.tarlaAdi}</h1>
            <p className="text-xs text-gray-500">{formatDate(job.tarih)}{job.saat ? ` · ${job.saat}` : ''}</p>
          </div>
          <button
            onClick={() => { setForm(job); setJobPayments(paymentStore.getByJob(id)); setShowEdit(true) }}
            className="p-2 text-gray-500 border border-gray-200 rounded-lg active:bg-gray-50"
          >
            <Edit2 size={18} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1">
        {/* Müşteri kartı */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Müşteri</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-bold">{(customer?.ad || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{customer?.ad || 'Bilinmiyor'}</div>
              {customer?.telefon && (
                <a href={`tel:${customer.telefon}`} className="text-sm text-primary-600 flex items-center gap-1 mt-0.5">
                  <Phone size={12} /> {customer.telefon}
                </a>
              )}
              {(customer?.il || customer?.ilce) && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} />{customer.il}{customer.ilce ? ` / ${customer.ilce}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* İş detayları */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">İş Detayları</p>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tipiInfo.cls}`}>{tipiInfo.label}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${durumBadge.cls}`}>{durumBadge.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Tarla</p>
              <p className="font-medium text-gray-800">{job.tarlaAdi}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Alan</p>
              <p className="font-medium text-gray-800">{job.dekar} dönüm</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{tipiFields.ilacLabel}</p>
              <p className="font-medium text-gray-800">{job.ilac || '-'}</p>
            </div>
            {job.doz && (
              <div>
                <p className="text-xs text-gray-400">{tipiFields.dozLabel}</p>
                <p className="font-medium text-gray-800">{job.doz}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Tarih</p>
              <p className="font-medium text-gray-800">{formatDate(job.tarih)}</p>
            </div>
            {job.saat && (
              <div>
                <p className="text-xs text-gray-400">Saat</p>
                <p className="font-medium text-gray-800">{job.saat}</p>
              </div>
            )}
          </div>
          {job.notlar && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Notlar</p>
              <p className="text-sm text-gray-700">{job.notlar}</p>
            </div>
          )}
        </div>

        {/* Ödeme özeti */}
        {Number(job.tutar) > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ödeme</p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${odemeBadge.cls}`}>{odemeBadge.label}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                <p className="text-xs text-gray-500">Toplam</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{formatCurrency(job.tutar)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2.5 text-center border border-green-100">
                <p className="text-xs text-green-600">Alınan</p>
                <p className="text-sm font-bold text-green-700 mt-0.5">{formatCurrency(totalPaid)}</p>
              </div>
              <div className={`rounded-lg p-2.5 text-center border ${kalan > 0 ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                <p className={`text-xs ${kalan > 0 ? 'text-orange-600' : 'text-green-600'}`}>Kalan</p>
                <p className={`text-sm font-bold mt-0.5 ${kalan > 0 ? 'text-orange-700' : 'text-green-700'}`}>{formatCurrency(kalan)}</p>
              </div>
            </div>
            {jobPayments.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                {[...jobPayments].sort((a, b) => b.tarih.localeCompare(a.tarih)).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{formatDate(p.tarih)}{p.not ? ` · ${p.not}` : ''}</span>
                    <span className="font-semibold text-green-700">{formatCurrency(p.miktar)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aksiyon butonları */}
        <button
          onClick={handleWhatsApp}
          className="w-full bg-green-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:bg-green-700"
        >
          <MessageCircle size={18} /> WhatsApp'a Özet Gönder
        </button>

        <button
          onClick={handleDelete}
          className="w-full border border-red-200 text-red-500 rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:bg-red-50"
        >
          <Trash2 size={18} /> İşi Sil
        </button>
      </div>

      {/* Düzenle bottom sheet */}
      {showEdit && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEdit(false)} />
          <div className="relative w-full bg-white rounded-t-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">İşi Düzenle</h2>
              <button onClick={() => setShowEdit(false)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
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

              {/* Ödeme geçmişi */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Ödeme Geçmişi</span>
                  <button onClick={() => { setShowPaymentForm(v => !v); setNewPayment(EMPTY_PAYMENT) }}
                    className="text-xs text-primary-600 font-medium flex items-center gap-1">
                    <Plus size={13} /> Ödeme Ekle
                  </button>
                </div>

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

                {jobPayments.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-3">Henüz ödeme kaydı yok</p>
                ) : (
                  <div className="space-y-2">
                    {[...jobPayments].sort((a, b) => b.tarih.localeCompare(a.tarih)).map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800">{formatCurrency(p.miktar)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{formatDate(p.tarih)}{p.not ? ` · ${p.not}` : ''}</div>
                        </div>
                        <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 text-red-400 active:text-red-600 flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 bg-white">
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
