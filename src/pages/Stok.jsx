import { useState, useMemo } from 'react'
import { stockStore } from '../utils/store'
import { Plus, X, Trash2, Edit2, AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react'

const KATEGORI_OPTIONS = [
  { value: 'ilac',   label: '🌿 İlaç',   cls: 'bg-green-100 text-green-700' },
  { value: 'gubre',  label: '🌾 Gübre',  cls: 'bg-yellow-100 text-yellow-700' },
  { value: 'tohum',  label: '🌱 Tohum',  cls: 'bg-blue-100 text-blue-700' },
]

const BIRIM_OPTIONS = ['litre', 'kg', 'adet', 'ton', 'gram']

const EMPTY_FORM = { ad: '', kategori: 'ilac', miktar: '', birim: 'litre', minStok: '' }

function StokBadge({ kategori }) {
  const k = KATEGORI_OPTIONS.find(o => o.value === kategori) || KATEGORI_OPTIONS[0]
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${k.cls}`}>{k.label}</span>
}

export default function Stok() {
  const [items, setItems] = useState(() => stockStore.getAll())
  const [modal, setModal] = useState(null) // null | 'add' | item
  const [form, setForm] = useState(EMPTY_FORM)
  const [adjustTarget, setAdjustTarget] = useState(null) // item being adjusted
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustDir, setAdjustDir] = useState('giris') // 'giris' | 'cikis'
  const [filterKat, setFilterKat] = useState('hepsi')

  const refresh = () => setItems(stockStore.getAll())

  const criticalCount = useMemo(
    () => items.filter(s => Number(s.miktar) <= Number(s.minStok)).length,
    [items]
  )

  const filtered = useMemo(() => {
    if (filterKat === 'hepsi') return items
    return items.filter(s => s.kategori === filterKat)
  }, [items, filterKat])

  const openAdd = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (item) => { setForm(item); setModal(item) }

  const handleSave = () => {
    if (!form.ad.trim() || !form.birim) return
    if (modal === 'add') {
      stockStore.add({
        ad: form.ad.trim(), kategori: form.kategori,
        miktar: Number(form.miktar) || 0, birim: form.birim,
        minStok: Number(form.minStok) || 0,
      })
    } else {
      stockStore.update(modal.id, {
        ad: form.ad.trim(), kategori: form.kategori,
        miktar: Number(form.miktar) || 0, birim: form.birim,
        minStok: Number(form.minStok) || 0,
      })
    }
    refresh()
    setModal(null)
  }

  const handleDelete = (id) => {
    if (!confirm('Bu stok kaydını silmek istediğinize emin misiniz?')) return
    stockStore.delete(id)
    refresh()
    setModal(null)
  }

  const handleAdjust = () => {
    if (!adjustDelta || Number(adjustDelta) <= 0) return
    const delta = adjustDir === 'giris' ? Number(adjustDelta) : -Number(adjustDelta)
    stockStore.adjust(adjustTarget.id, delta)
    refresh()
    setAdjustTarget(null)
    setAdjustDelta('')
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Stok</h1>
            {criticalCount > 0 && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-0.5">
                <AlertTriangle size={11} /> {criticalCount} ürün kritik seviyede
              </p>
            )}
          </div>
          <button onClick={openAdd}
            className="bg-primary-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1">
            <Plus size={16} /> Ekle
          </button>
        </div>

        {/* Kategori filtresi */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[{ value: 'hepsi', label: 'Tümü' }, ...KATEGORI_OPTIONS].map(k => (
            <button key={k.value} onClick={() => setFilterKat(k.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterKat === k.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-16 text-sm">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            Stok kaydı yok
          </div>
        )}
        {filtered.map(item => {
          const isCritical = Number(item.miktar) <= Number(item.minStok)
          const isLow = !isCritical && Number(item.minStok) > 0 && Number(item.miktar) <= Number(item.minStok) * 2
          return (
            <div key={item.id}
              className={`bg-white rounded-xl border p-4 ${isCritical ? 'border-red-200 bg-red-50' : isLow ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{item.ad}</span>
                    <StokBadge kategori={item.kategori} />
                    {isCritical && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle size={10} /> Kritik
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${isCritical ? 'text-red-600' : 'text-gray-800'}`}>
                      {Number(item.miktar).toLocaleString('tr-TR')}
                    </span>
                    <span className="text-sm text-gray-500">{item.birim}</span>
                  </div>
                  {Number(item.minStok) > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Min uyarı: {item.minStok} {item.birim}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setAdjustTarget(item); setAdjustDelta(''); setAdjustDir('giris') }}
                    className="p-2 rounded-lg border border-gray-200 text-primary-600 active:bg-primary-50">
                    <TrendingUp size={16} />
                  </button>
                  <button onClick={() => openEdit(item)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 active:bg-gray-50">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stok güncelleme bottom sheet */}
      {adjustTarget && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAdjustTarget(null)} />
          <div className="relative w-full bg-white rounded-t-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{adjustTarget.ad} Güncelle</h2>
              <button onClick={() => setAdjustTarget(null)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setAdjustDir('giris')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border flex items-center justify-center gap-1.5 transition-colors ${adjustDir === 'giris' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600'}`}>
                <TrendingUp size={15} /> Stok Girişi
              </button>
              <button onClick={() => setAdjustDir('cikis')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border flex items-center justify-center gap-1.5 transition-colors ${adjustDir === 'cikis' ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-gray-600'}`}>
                <TrendingDown size={15} /> Stok Çıkışı
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Miktar ({adjustTarget.birim}) — Mevcut: {adjustTarget.miktar} {adjustTarget.birim}
              </label>
              <input type="number" value={adjustDelta} onChange={e => setAdjustDelta(e.target.value)}
                placeholder="0" min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 bg-white" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdjustTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium">İptal</button>
              <button onClick={handleAdjust}
                className={`flex-1 py-2.5 rounded-lg text-white font-medium ${adjustDir === 'giris' ? 'bg-green-600 active:bg-green-700' : 'bg-red-500 active:bg-red-600'}`}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ekle / Düzenle modal */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative w-full bg-white rounded-t-2xl flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{modal === 'add' ? 'Yeni Stok' : 'Stok Düzenle'}</h2>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              <Field label="Ürün Adı *" value={form.ad} onChange={v => setField('ad', v)} placeholder="Fungusit XYZ, DAP, Buğday..." />

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                <div className="flex gap-2">
                  {KATEGORI_OPTIONS.map(k => (
                    <button key={k.value} onClick={() => setField('kategori', k.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${form.kategori === k.value ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600'}`}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Mevcut Miktar" value={form.miktar} onChange={v => setField('miktar', v)} placeholder="100" type="number" />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Birim</label>
                  <select value={form.birim} onChange={e => setField('birim', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 bg-white">
                    {BIRIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <Field label="Min. Uyarı Seviyesi" value={form.minStok} onChange={v => setField('minStok', v)}
                placeholder={`20 (${form.birim || 'birim'})`} type="number" />
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
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        type={type} min={type === 'number' ? '0' : undefined}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white" />
    </div>
  )
}
