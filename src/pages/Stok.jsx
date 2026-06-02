import { useState, useMemo } from 'react'
import { stockStore } from '../utils/store'
import { Plus, X, Trash2, Edit2, AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react'

const EMPTY_FORM = { ad: '', parcaKodu: '', miktar: '', minStok: '', alisF: '', satisF: '' }

function formatTL(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function karMarji(alis, satis) {
  const a = Number(alis), s = Number(satis)
  if (!a || !s) return null
  return ((s - a) / a) * 100
}

function MarjCell({ alis, satis }) {
  const pct = karMarji(alis, satis)
  if (pct === null) return <span className="text-gray-300">—</span>
  const cls =
    pct >= 20 ? 'text-green-600' :
    pct >= 5  ? 'text-yellow-600' :
    pct >= 0  ? 'text-orange-500' : 'text-red-600'
  return <span className={`font-semibold ${cls}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</span>
}

export default function Stok() {
  const [items, setItems]           = useState(() => stockStore.getAll())
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [adjustTarget, setAdjustTarget] = useState(null)
  const [adjustDelta, setAdjustDelta]   = useState('')
  const [adjustDir, setAdjustDir]       = useState('giris')
  const [search, setSearch]         = useState('')

  const refresh = () => setItems(stockStore.getAll())

  const criticalCount = useMemo(
    () => items.filter(s => Number(s.minStok) > 0 && Number(s.miktar) <= Number(s.minStok)).length,
    [items]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? items.filter(s => s.ad.toLowerCase().includes(q) || (s.parcaKodu || '').toLowerCase().includes(q))
      : items
  }, [items, search])

  const toplamDeger = useMemo(
    () => items.reduce((sum, s) => sum + (Number(s.miktar) || 0) * (Number(s.alisF) || 0), 0),
    [items]
  )

  const toplamSatisDeger = useMemo(
    () => items.reduce((sum, s) => sum + (Number(s.miktar) || 0) * (Number(s.satisF) || 0), 0),
    [items]
  )

  const openAdd  = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (item) => { setForm(item); setModal(item) }

  const handleSave = () => {
    if (!form.ad.trim()) return
    const data = {
      ad:        form.ad.trim(),
      parcaKodu: (form.parcaKodu || '').trim(),
      miktar:    Number(form.miktar)  || 0,
      birim:     'adet',
      minStok:   Number(form.minStok) || 0,
      alisF:     Number(form.alisF)   || 0,
      satisF:    Number(form.satisF)  || 0,
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

      {/* Tablo */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm">
            <Package size={36} className="mx-auto mb-3 opacity-25" />
            {search ? 'Eşleşen parça bulunamadı' : 'Henüz parça kaydı yok'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 sticky left-0 bg-gray-50 min-w-[130px]">Parça Adı</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-2 py-2.5 min-w-[72px]">Kodu</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-2 py-2.5 min-w-[56px]">Adet</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-2 py-2.5 min-w-[80px]">Alış</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-2 py-2.5 min-w-[80px]">Satış</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-2 py-2.5 min-w-[60px]">Kâr%</th>
                  <th className="px-3 py-2.5 min-w-[72px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => {
                  const isCritical = Number(item.minStok) > 0 && Number(item.miktar) <= Number(item.minStok)
                  const isLow = !isCritical && Number(item.minStok) > 0 && Number(item.miktar) <= Number(item.minStok) * 2
                  const rowCls = isCritical ? 'bg-red-50' : isLow ? 'bg-yellow-50' : 'bg-white'
                  return (
                    <tr key={item.id} className={`${rowCls} hover:bg-gray-50 transition-colors`}>
                      {/* Parça Adı */}
                      <td className={`px-4 py-3 sticky left-0 ${rowCls}`}>
                        <div className="font-semibold text-sm text-gray-900 leading-tight">{item.ad}</div>
                        {isCritical && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-medium mt-0.5">
                            <AlertTriangle size={10} /> Kritik
                          </span>
                        )}
                      </td>

                      {/* Kodu */}
                      <td className="px-2 py-3">
                        <span className="font-mono text-xs text-gray-500">{item.parcaKodu || <span className="text-gray-300">—</span>}</span>
                      </td>

                      {/* Adet */}
                      <td className="px-2 py-3 text-right">
                        <span className={`text-base font-bold ${isCritical ? 'text-red-600' : 'text-gray-800'}`}>
                          {Number(item.miktar).toLocaleString('tr-TR')}
                        </span>
                        {Number(item.minStok) > 0 && (
                          <div className="text-xs text-gray-400 leading-none mt-0.5">min {item.minStok}</div>
                        )}
                      </td>

                      {/* Alış */}
                      <td className="px-2 py-3 text-right text-xs text-gray-600">
                        {Number(item.alisF) > 0 ? formatTL(item.alisF) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Satış */}
                      <td className="px-2 py-3 text-right text-xs font-medium text-primary-600">
                        {Number(item.satisF) > 0 ? formatTL(item.satisF) : <span className="text-gray-300 font-normal">—</span>}
                      </td>

                      {/* Kâr Marjı */}
                      <td className="px-2 py-3 text-right text-xs">
                        <MarjCell alis={item.alisF} satis={item.satisF} />
                      </td>

                      {/* Aksiyonlar */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setAdjustTarget(item); setAdjustDelta(''); setAdjustDir('giris') }}
                            className="p-1.5 rounded-lg border border-gray-200 text-primary-600 active:bg-primary-50"
                            title="Stok güncelle"
                          >
                            <TrendingUp size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 active:bg-gray-50"
                            title="Düzenle"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toplam değer */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-end justify-between">
            <p className="text-xs text-gray-400">{items.length} parça kayıtlı</p>
            <div className="text-right space-y-0.5">
              <div className="flex items-center gap-3 justify-end">
                <span className="text-xs text-gray-400">Alış değeri:</span>
                <span className="text-sm font-bold text-gray-800">{formatTL(toplamDeger)}</span>
              </div>
              {toplamSatisDeger > 0 && (
                <div className="flex items-center gap-3 justify-end">
                  <span className="text-xs text-gray-400">Satış değeri:</span>
                  <span className="text-sm font-bold text-primary-600">{formatTL(toplamSatisDeger)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                Adet — Mevcut: <strong>{adjustTarget.miktar} adet</strong>
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
          <div className="relative w-full bg-white rounded-t-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{modal === 'add' ? 'Yeni Parça' : 'Parça Düzenle'}</h2>
              <button onClick={() => setModal(null)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              <Field label="Parça Adı *" value={form.ad} onChange={v => setField('ad', v)} placeholder="Fren Diski, Motor Filtresi..." />
              <Field label="Parça Kodu (opsiyonel)" value={form.parcaKodu} onChange={v => setField('parcaKodu', v)} placeholder="SKU-001" />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Mevcut Adet" value={form.miktar} onChange={v => setField('miktar', v)} placeholder="0" type="number" />
                <Field label="Min. Uyarı (adet)" value={form.minStok} onChange={v => setField('minStok', v)} placeholder="5" type="number" />
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">Fiyatlar</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Alış Fiyatı (₺/adet)" value={form.alisF} onChange={v => setField('alisF', v)} placeholder="0.00" type="number" />
                  <Field label="Satış Fiyatı (₺/adet)" value={form.satisF} onChange={v => setField('satisF', v)} placeholder="0.00" type="number" />
                </div>

                {/* Canlı marj önizlemesi */}
                {(Number(form.alisF) > 0 || Number(form.satisF) > 0) && (() => {
                  const pct = karMarji(form.alisF, form.satisF)
                  const kazanc = (Number(form.satisF) || 0) - (Number(form.alisF) || 0)
                  return (
                    <div className="mt-2 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      <span className="text-xs text-gray-500">Kâr Marjı</span>
                      <div className="text-right">
                        {pct !== null ? (
                          <>
                            <span className={`text-sm font-bold ${pct >= 20 ? 'text-green-600' : pct >= 5 ? 'text-yellow-600' : pct >= 0 ? 'text-orange-500' : 'text-red-600'}`}>
                              {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-400 ml-2">({kazanc >= 0 ? '+' : ''}{formatTL(kazanc)})</span>
                          </>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </div>
                  )
                })()}
              </div>
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
