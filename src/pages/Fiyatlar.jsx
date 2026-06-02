import { useState, useMemo } from 'react'
import { fiyatStore } from '../utils/store'
import { Plus, X, Trash2, Edit2, TrendingUp, Tag } from 'lucide-react'

const KATEGORI_OPTIONS = [
  { value: 'ilac',         label: '🌿 İlaç' },
  { value: 'gubre',        label: '🌾 Gübre' },
  { value: 'tohum',        label: '🌱 Tohum' },
  { value: 'yedek-parca',  label: '🔧 Yedek Parça' },
]

const BIRIM_OPTIONS = ['litre', 'kg', 'adet', 'ton', 'gram', 'metre']

const EMPTY_FORM = {
  ad: '', kategori: 'ilac', birim: 'litre', alisF: '', satisF: '',
}

function kar(alis, satis) {
  const a = Number(alis)
  const s = Number(satis)
  if (!a || !s) return null
  return ((s - a) / a) * 100
}

function formatTL(n) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n || 0)
}

function MarjBadge({ alis, satis }) {
  const pct = kar(alis, satis)
  if (pct === null) return <span className="text-xs text-gray-400">—</span>
  const cls =
    pct >= 20 ? 'bg-green-100 text-green-700' :
    pct >= 5  ? 'bg-yellow-100 text-yellow-700' :
    pct >= 0  ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cls}`}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

export default function Fiyatlar() {
  const [items, setItems]       = useState(() => fiyatStore.getAll())
  const [modal, setModal]       = useState(null)   // null | 'add' | item
  const [form, setForm]         = useState(EMPTY_FORM)
  const [filterKat, setFilterKat] = useState('hepsi')
  const [search, setSearch]     = useState('')

  const refresh = () => setItems(fiyatStore.getAll())

  const filtered = useMemo(() => {
    return items.filter(it => {
      const matchKat = filterKat === 'hepsi' || it.kategori === filterKat
      const q = search.toLowerCase()
      const matchQ  = !q || it.ad.toLowerCase().includes(q)
      return matchKat && matchQ
    })
  }, [items, filterKat, search])

  const openAdd  = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (item) => { setForm(item); setModal(item) }

  const handleSave = () => {
    if (!form.ad.trim()) return
    const data = {
      ad:       form.ad.trim(),
      kategori: form.kategori,
      birim:    form.birim,
      alisF:    Number(form.alisF)  || 0,
      satisF:   Number(form.satisF) || 0,
    }
    if (modal === 'add') fiyatStore.add(data)
    else fiyatStore.update(modal.id, data)
    refresh()
    setModal(null)
  }

  const handleDelete = (id) => {
    if (!confirm('Bu fiyat kaydını silmek istediğinize emin misiniz?')) return
    fiyatStore.delete(id)
    refresh()
    setModal(null)
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Her kategoride özet istatistikler
  const summary = useMemo(() => {
    const total = filtered.length
    const withMargin = filtered.filter(it => Number(it.alisF) > 0 && Number(it.satisF) > 0)
    const avgMargin  = withMargin.length
      ? withMargin.reduce((s, it) => s + kar(it.alisF, it.satisF), 0) / withMargin.length
      : null
    return { total, avgMargin }
  }, [filtered])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Alış / Satış Fiyatları</h1>
            {summary.avgMargin !== null && (
              <p className="text-xs text-gray-500 mt-0.5">
                Ort. kâr marjı: <span className="font-semibold text-green-600">%{summary.avgMargin.toFixed(1)}</span>
              </p>
            )}
          </div>
          <button onClick={openAdd}
            className="bg-primary-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1 active:bg-primary-700">
            <Plus size={16} /> Ekle
          </button>
        </div>

        {/* Kategori filtreleri */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[{ value: 'hepsi', label: 'Tümü' }, ...KATEGORI_OPTIONS].map(k => (
            <button key={k.value} onClick={() => setFilterKat(k.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterKat === k.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {k.label}
            </button>
          ))}
        </div>

        {/* Arama */}
        <div className="relative">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ürün adı ara..."
            className="w-full bg-gray-100 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-16 text-sm">
            <Tag size={36} className="mx-auto mb-3 opacity-25" />
            {search || filterKat !== 'hepsi' ? 'Eşleşen kayıt bulunamadı' : 'Henüz fiyat kaydı yok'}
          </div>
        )}

        {filtered.map(item => {
          const kat    = KATEGORI_OPTIONS.find(k => k.value === item.kategori)
          const marj   = kar(item.alisF, item.satisF)
          const kazanc = Number(item.satisF) - Number(item.alisF)
          return (
            <button key={item.id} onClick={() => openEdit(item)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 active:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{item.ad}</span>
                    <span className="text-xs text-gray-400">{kat?.label || item.kategori}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-400 mb-0.5">Alış</p>
                      <p className="text-sm font-bold text-gray-800">{formatTL(item.alisF)}</p>
                      <p className="text-xs text-gray-400">/{item.birim}</p>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-primary-500 mb-0.5">Satış</p>
                      <p className="text-sm font-bold text-primary-700">{formatTL(item.satisF)}</p>
                      <p className="text-xs text-primary-400">/{item.birim}</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${
                      marj === null ? 'bg-gray-50' :
                      marj >= 20    ? 'bg-green-50' :
                      marj >= 5     ? 'bg-yellow-50' :
                      marj >= 0     ? 'bg-orange-50' : 'bg-red-50'
                    }`}>
                      <p className="text-xs text-gray-400 mb-0.5">Kâr</p>
                      {marj !== null ? (
                        <>
                          <p className={`text-sm font-bold ${
                            marj >= 20 ? 'text-green-700' :
                            marj >= 5  ? 'text-yellow-700' :
                            marj >= 0  ? 'text-orange-700' : 'text-red-700'
                          }`}>{marj >= 0 ? '+' : ''}{marj.toFixed(1)}%</p>
                          <p className={`text-xs ${kazanc >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {kazanc >= 0 ? '+' : ''}{formatTL(kazanc)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-bold text-gray-400">—</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Ekle / Düzenle modal */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative w-full bg-white rounded-t-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === 'add' ? 'Yeni Fiyat Kaydı' : 'Fiyat Düzenle'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              <Field label="Ürün / Hizmet Adı *" value={form.ad} onChange={v => setField('ad', v)}
                placeholder="Fungusit XYZ, DAP, Fren Diski..." />

              {/* Kategori */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Kategori</label>
                <div className="grid grid-cols-2 gap-2">
                  {KATEGORI_OPTIONS.map(k => (
                    <button key={k.value} onClick={() => setField('kategori', k.value)}
                      className={`py-2 rounded-lg text-xs font-medium border transition-colors ${form.kategori === k.value ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600'}`}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Birim */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Birim</label>
                <div className="flex gap-2 flex-wrap">
                  {BIRIM_OPTIONS.map(b => (
                    <button key={b} onClick={() => setField('birim', b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.birim === b ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600'}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fiyatlar */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Alış Fiyatı (₺/${form.birim})`} value={form.alisF}
                  onChange={v => setField('alisF', v)} placeholder="0.00" type="number" />
                <Field label={`Satış Fiyatı (₺/${form.birim})`} value={form.satisF}
                  onChange={v => setField('satisF', v)} placeholder="0.00" type="number" />
              </div>

              {/* Canlı kâr önizlemesi */}
              {(Number(form.alisF) > 0 || Number(form.satisF) > 0) && (
                <div className={`rounded-xl p-3 border flex items-center justify-between ${
                  kar(form.alisF, form.satisF) === null ? 'bg-gray-50 border-gray-100' :
                  (kar(form.alisF, form.satisF) ?? 0) >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Kâr Marjı</span>
                  </div>
                  <div className="text-right">
                    <MarjBadge alis={form.alisF} satis={form.satisF} />
                    {Number(form.alisF) > 0 && Number(form.satisF) > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTL(Number(form.satisF) - Number(form.alisF))} / {form.birim}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 bg-white">
              {modal !== 'add' && (
                <button onClick={() => handleDelete(modal.id)}
                  className="p-2.5 rounded-lg border border-red-200 text-red-500 active:bg-red-50">
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium">İptal</button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white font-medium active:bg-primary-700">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white"
      />
    </div>
  )
}
