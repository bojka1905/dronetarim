import { useState, useMemo } from 'react'
import { paymentStore, expenseStore } from '../utils/store'
import { Plus, X, Trash2 } from 'lucide-react'

const KATEGORI = {
  yakit:      { label: 'Yakıt',        cls: 'bg-orange-100 text-orange-700', icon: '⛽' },
  ilac_alimi: { label: 'İlaç Alımı',   cls: 'bg-green-100 text-green-700',   icon: '🧪' },
  bakim:      { label: 'Bakım/Onarım', cls: 'bg-blue-100 text-blue-700',     icon: '🔧' },
  personel:   { label: 'Personel',     cls: 'bg-purple-100 text-purple-700', icon: '👷' },
  diger:      { label: 'Diğer',        cls: 'bg-gray-100 text-gray-600',     icon: '📦' },
}

const KATEGORI_OPTIONS = Object.entries(KATEGORI).map(([value, meta]) => ({ value, ...meta }))

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

function formatCurrency(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function monthLabel(ym) {
  const [y, m] = ym.split('-')
  return `${MONTHS_TR[parseInt(m) - 1]} ${y}`
}

const EMPTY_EXPENSE = {
  tarih: new Date().toISOString().slice(0, 10),
  kategori: 'yakit',
  aciklama: '',
  tutar: '',
}

export default function Kasa() {
  const [period, setPeriod] = useState('buay')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_EXPENSE)
  const [expenses, setExpenses] = useState(() => expenseStore.getAll())
  const [payments] = useState(() => paymentStore.getAll())

  const todayStr     = new Date().toISOString().slice(0, 10)
  const currentMonth = todayStr.slice(0, 7)
  const currentYear  = todayStr.slice(0, 4)

  const inPeriod = (dateStr) => {
    if (period === 'buay')  return dateStr?.startsWith(currentMonth)
    if (period === 'buyil') return dateStr?.startsWith(currentYear)
    return true
  }

  const filteredPayments = useMemo(() => payments.filter(p => inPeriod(p.tarih)), [payments, period])
  const filteredExpenses = useMemo(() => expenses.filter(e => inPeriod(e.tarih)), [expenses, period])

  const totalGelir = useMemo(() => filteredPayments.reduce((s, p) => s + (Number(p.miktar) || 0), 0), [filteredPayments])
  const totalGider = useMemo(() => filteredExpenses.reduce((s, e) => s + (Number(e.tutar)  || 0), 0), [filteredExpenses])
  const netBakiye  = totalGelir - totalGider

  // Son 6 ayın aylık gelir/gider tablosu (tüm veriden)
  const monthlyData = useMemo(() => {
    const map = {}
    payments.forEach(p => {
      const mk = p.tarih?.slice(0, 7)
      if (!mk) return
      if (!map[mk]) map[mk] = { gelir: 0, gider: 0 }
      map[mk].gelir += Number(p.miktar) || 0
    })
    expenses.forEach(e => {
      const mk = e.tarih?.slice(0, 7)
      if (!mk) return
      if (!map[mk]) map[mk] = { gelir: 0, gider: 0 }
      map[mk].gider += Number(e.tutar) || 0
    })
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([ym, d]) => ({ ym, label: monthLabel(ym), ...d, net: d.gelir - d.gider }))
  }, [payments, expenses])

  const sortedExpenses = useMemo(
    () => [...filteredExpenses].sort((a, b) => b.tarih.localeCompare(a.tarih)),
    [filteredExpenses]
  )

  const handleSave = () => {
    if (!form.tutar || !form.tarih) return
    expenseStore.add({ ...form, tutar: Number(form.tutar) })
    setExpenses(expenseStore.getAll())
    setForm(EMPTY_EXPENSE)
    setShowModal(false)
  }

  const handleDelete = (id) => {
    if (!confirm('Bu gider kaydını silmek istiyor musunuz?')) return
    expenseStore.delete(id)
    setExpenses(expenseStore.getAll())
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Kasa</h1>
          <button
            onClick={() => { setForm(EMPTY_EXPENSE); setShowModal(true) }}
            className="bg-red-500 text-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1 active:bg-red-600"
          >
            <Plus size={16} /> Gider Ekle
          </button>
        </div>
        <div className="flex gap-2">
          {[
            { value: 'buay',  label: 'Bu Ay' },
            { value: 'buyil', label: 'Bu Yıl' },
            { value: 'hepsi', label: 'Tümü' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                period === opt.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-6">
        {/* Özet kartlar */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="text-xs font-medium text-green-600 mb-1">Toplam Gelir</div>
              <div className="text-lg font-bold text-green-700">{formatCurrency(totalGelir)}</div>
              <div className="text-xs text-green-500 mt-0.5">{filteredPayments.length} tahsilat</div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="text-xs font-medium text-red-500 mb-1">Toplam Gider</div>
              <div className="text-lg font-bold text-red-600">{formatCurrency(totalGider)}</div>
              <div className="text-xs text-red-400 mt-0.5">{filteredExpenses.length} kalem</div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border flex items-center justify-between ${
            netBakiye >= 0 ? 'bg-primary-50 border-primary-100' : 'bg-red-50 border-red-100'
          }`}>
            <div>
              <div className={`text-xs font-medium mb-0.5 ${netBakiye >= 0 ? 'text-primary-600' : 'text-red-500'}`}>Net Bakiye</div>
              <div className={`text-2xl font-bold ${netBakiye >= 0 ? 'text-primary-700' : 'text-red-600'}`}>
                {formatCurrency(netBakiye)}
              </div>
            </div>
            <span className="text-3xl">{netBakiye >= 0 ? '📈' : '📉'}</span>
          </div>
        </div>

        {/* Aylık döküm tablosu */}
        {monthlyData.length > 0 && (
          <section>
            <h2 className="font-semibold text-gray-800 text-sm mb-2">Aylık Döküm</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500">Ay</span>
                <span className="text-xs font-semibold text-green-600 text-right">Gelir</span>
                <span className="text-xs font-semibold text-red-500 text-right">Gider</span>
                <span className="text-xs font-semibold text-gray-500 text-right">Net</span>
              </div>
              {monthlyData.map((row, i) => (
                <div key={row.ym}
                  className={`grid grid-cols-4 px-4 py-3 items-center ${i < monthlyData.length - 1 ? 'border-b border-gray-50' : ''} ${row.ym === currentMonth ? 'bg-primary-50/40' : ''}`}>
                  <span className="text-xs font-medium text-gray-700">{row.label}</span>
                  <span className="text-xs text-right text-green-600 font-medium">{formatCurrency(row.gelir)}</span>
                  <span className="text-xs text-right text-red-500 font-medium">{formatCurrency(row.gider)}</span>
                  <span className={`text-xs text-right font-bold ${row.net >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
                    {formatCurrency(row.net)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gider listesi */}
        <section>
          <h2 className="font-semibold text-gray-800 text-sm mb-2">
            Giderler{' '}
            {sortedExpenses.length > 0 && (
              <span className="text-gray-400 font-normal">({sortedExpenses.length})</span>
            )}
          </h2>
          {sortedExpenses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              Bu dönemde gider kaydı yok
            </div>
          ) : (
            <div className="space-y-2">
              {sortedExpenses.map(exp => {
                const kat = KATEGORI[exp.kategori] || KATEGORI.diger
                return (
                  <div key={exp.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                      {kat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${kat.cls}`}>{kat.label}</span>
                        <span className="text-xs text-gray-400">{formatDate(exp.tarih)}</span>
                      </div>
                      {exp.aciklama && (
                        <div className="text-sm text-gray-600 truncate">{exp.aciklama}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-bold text-red-600 text-sm">{formatCurrency(exp.tutar)}</span>
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-gray-300 active:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Gider Ekleme Modalı */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full bg-white rounded-t-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Gider Ekle</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Kategori */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Kategori</label>
                <div className="grid grid-cols-3 gap-2">
                  {KATEGORI_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setField('kategori', opt.value)}
                      className={`py-3 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition-colors ${
                        form.kategori === opt.value
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-200 text-gray-600 bg-white'
                      }`}>
                      <span className="text-lg">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarih + Tutar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tarih</label>
                  <input type="date" value={form.tarih} onChange={e => setField('tarih', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tutar (₺) *</label>
                  <input type="number" value={form.tutar} onChange={e => setField('tutar', e.target.value)}
                    placeholder="500"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 bg-white" />
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
                <input type="text" value={form.aciklama} onChange={e => setField('aciklama', e.target.value)}
                  placeholder="Kısa açıklama..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 bg-white" />
              </div>
            </div>

            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 bg-white">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium">
                İptal
              </button>
              <button onClick={handleSave} disabled={!form.tutar}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-semibold active:bg-red-600 disabled:opacity-40">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
