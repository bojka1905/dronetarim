import { useState, useMemo } from 'react'
import { stockStore } from '../utils/store'
import { Plus, X, Trash2, Edit2, AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react'

const BIRIM_OPTIONS = ['adet', 'kg', 'litre', 'metre', 'gram', 'ton']

const EMPTY_FORM = { ad: '', parcaKodu: '', miktar: '', birim: 'adet', minStok: '' }

export default function Stok() {
  const [items, setItems] = useState(() => stockStore.getAll())
  const [modal, setModal] = useState(null)       // null | 'add' | item
  const [form, setForm] = useState(EMPTY_FORM)
  const [adjustTarget, setAdjustTarget] = useState(null)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustDir, setAdjustDir] = useState('giris') // 'giris' | 'cikis'
  const [search, setSearch] = useState('')

  const refresh = () => setItems(stockStore.getAll())

  const criticalCount = useMemo(
    () => items.filter(s => Number(s.miktar) <= Number(s.minStok)).length,
    [items]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? items.filter(s => s.ad.toLowerCase().includes(q) || (s.parcaKodu || '').toLowerCase().includes(q))
      : items
  }, [items, search])

  const openAdd  = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (item) => { setForm(item); setModal(item) }

  const handleSave = () => {
    if (!form.ad.trim()) return
    const data = {
      ad: form.ad.trim(),
      parcaKodu: form.parcaKodu?.trim() || '',
      miktar: Number(form.miktar) || 0,
      birim: form.birim || 'adet',
      minStok: Number(form.minStok) || 0,
    }
    if (modal === 'add') stockStore.add(data)
    else stockStore.update(modal.id, data)
    refresh()
    setModal(null)
  }

  const handleDelete = (id) => {
    if (!confirm('Bu parçayı silmek istediğinize emin misiniz?')) return
    stockStore.delete(id)
    refresh()
    setModal(null)
  }

  const handleAdjust = () => {
    const val = Number(adjustDelta)
    if (!val || val <= 0) return
    stockStore.adjust(adjustTarget.id, adjustDir === 'giris' ? val : -val)
    refresh()
    setAdjustTarget(null)
    setAdjustDelta('')
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Yedek Parça Stok</h1>
            {criticalCount > 0 && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-0.5">
                <AlertTriangle size={11} /> {criticalCount} parça kritik seviyede
              </p>
            )}
          </div>
          <button onClick={openAdd}
            className="bg-primary-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1 active:bg-primary-700">
            <Plus size={16} /> Ekle
          </button>
        </div>

        <div className="relative">
          <Package size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Parça adı veya kodu ara..."
            className="w-full bg-gray-100 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-16 text-sm">
            <Package size={36} className="mx-auto mb-3 opacity-25" />
            {search ? 'Eşleşen parça bulunamadı' : 'Henüz parça kaydı yok'}
          </div>
        )}
        {filtered.map(item => {
          const isCritical = Number(item.miktar) <= Number(item.minStok)
          const isLow = !isCritical && Number(item.minStok) > 0 && Number(item.miktar) <= Number(item.minStok) * 2
          return (
            <div key={item.id}
              className={`bg-white rounded-xl border p-4 ${isCritical ? 'border-red-200 bg-red-50' : isLow ? 'border-yellow-200' : 'border-gray-100'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{item.ad}</span>
                    {item.parcaKodu && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-gray-100 text-gray-600">{item.parcaKodu}</span>
                    )}
                    {isCritical && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle size={10} /> Kritik
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className={`text-2xl font-bold ${isCritical ? 'text-red-600' : 'text-gray-800'}`}>
                      {Number(item.miktar).toLocaleString('tr-TR')}
                    </span>
                    <span className="text-sm text-gray-500">{item.birim}</span>
                  </div>

                  {Number(item.minStok) > 0 && (
                    <p className={`text-xs mt-0.5 ${isCritical ? 'text-red-500' : 'text-gray-400'}`}>
                      Min. uyarı: {item.minStok} {item.birim}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                  <button
                    onClick={() => { setAdjustTarget(item); setAdjustDelta(''); setAdjustDir('giris') }}
                    className="p-2 rounded-lg border border-gray-200 text-primary-600 active:bg-primary-50"
                    title="Stok güncelle"
                  >
                    <TrendingUp size={16} />
                  </button>
                  <button onClick={() => openEdit(item)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 active:bg-gray-50"
                    title="Düzenle"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stok giriş/çıkış bottom sheet */}
      {adjustTarget && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAdjustTarget(null)} />
          <div className="relative w-full bg-white rounded-t-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{adjustTarget.ad}</h2>
                {adjustTarget.parcaKodu && (
                  <p className="text-xs font-mono text-gray-400">{adjustTarget.parcaKodu}</p>
                )}
              </div>
              <button onClick={() => setAdjustTarget(null)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setAdjustDir('giris')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border flex items-center justify-center gap-1.5 transition-colors ${adjustDir === 'giris' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600'}`}>
                <TrendingUp size={15} /> Giriş
              </button>
              <button onClick={() => setAdjustDir('cikis')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border flex items-center justify-center gap-1.5 transition-colors ${adjustDir === 'cikis' ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-gray-600'}`}>
                <TrendingDown size={15} /> Çıkış
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Miktar ({adjustTarget.birim}) — Mevcut: <strong>{adjustTarget.miktar} {adjustTarget.birim}</strong>
              </label>
              <input type="number" value={adjustDelta} onChange={e => setAdjustDelta(e.target.value)}
                placeholder="0" min="0" autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 bg-white" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setAdjustTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium">İptal</button>
              <button onClick={handleAdjust}
                className={`flex-1 py-2.5 rounded-lg text-white font-medium ${adjustDir === 'giris' ? 'bg-green-600 active:bg-green-700' : 'bg-red-500 active:bg-red-600'}`}>
                {adjustDir === 'giris' ? 'Giriş Kaydet' : 'Çıkış Kaydet'}
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
              <h2 className="text-lg font-bold text-gray-900">{modal === 'add' ? 'Yeni Parça' : 'Parça Düzenle'}</h2>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              <Field label="Parça Adı *" value={form.ad} onChange={v => setField('ad', v)} placeholder="Fren Diski, Motor Filtresi..." />
              <Field label="Parça Kodu (opsiyonel)" value={form.parcaKodu} onChange={v => setField('parcaKodu', v)} placeholder="SKU-001" />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Mevcut Miktar" value={form.miktar} onChange={v => setField('miktar', v)} placeholder="0" type="number" />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Birim</label>
                  <select value={form.birim} onChange={e => setField('birim', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 bg-white">
                    {BIRIM_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <Field label="Min. Uyarı Seviyesi" value={form.minStok} onChange={v => setField('minStok', v)}
                placeholder={`5 ${form.birim || 'adet'}`} type="number" />
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
      <input value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        type={type} min={type === 'number' ? '0' : undefined}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white" />
    </div>
  )
}
