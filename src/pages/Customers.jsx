import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerStore, jobStore } from '../utils/store'
import { Plus, Search, Phone, MapPin, ChevronRight, X } from 'lucide-react'

const EMPTY_FORM = { ad: '', telefon: '', il: '', ilce: '', notlar: '' }

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState(() => customerStore.getAll())
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const filtered = useMemo(() =>
    customers.filter(c =>
      c.ad.toLowerCase().includes(search.toLowerCase()) ||
      c.telefon?.includes(search)
    ), [customers, search])

  const handleSave = () => {
    if (!form.ad.trim()) return
    customerStore.add(form)
    setCustomers(customerStore.getAll())
    setShowAdd(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">Müşteriler</h1>
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowAdd(true) }}
            className="bg-primary-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1"
          >
            <Plus size={16} /> Ekle
          </button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad veya telefon ara..."
            className="w-full bg-gray-100 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <UsersIcon size={40} className="mx-auto mb-2 opacity-30" />
            <p>Müşteri bulunamadı</p>
          </div>
        )}
        {filtered.map(c => {
          const jobs = jobStore.getByCustomer(c.id)
          return (
            <button
              key={c.id}
              onClick={() => navigate('/musteriler/' + c.id)}
              className="w-full bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 text-left active:bg-gray-50"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-bold text-sm">{c.ad.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{c.ad}</div>
                <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                  {c.telefon && <span className="flex items-center gap-1"><Phone size={11} />{c.telefon}</span>}
                  {c.il && <span className="flex items-center gap-1"><MapPin size={11} />{c.il}{c.ilce ? ` / ${c.ilce}` : ''}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-medium text-gray-700">{jobs.length} iş</div>
                <ChevronRight size={16} className="text-gray-400 ml-auto" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Yeni Müşteri Modalı */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative w-full bg-white rounded-t-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Yeni Müşteri</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              <Field label="Ad Soyad *" value={form.ad} onChange={v => setForm(f => ({ ...f, ad: v }))} placeholder="Ahmet Yılmaz" />
              <Field label="Telefon" value={form.telefon} onChange={v => setForm(f => ({ ...f, telefon: v }))} placeholder="0555 123 4567" type="tel" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="İl" value={form.il} onChange={v => setForm(f => ({ ...f, il: v }))} placeholder="Konya" />
                <Field label="İlçe" value={form.ilce} onChange={v => setForm(f => ({ ...f, ilce: v }))} placeholder="Çumra" />
              </div>
              <Field label="Notlar" value={form.notlar} onChange={v => setForm(f => ({ ...f, notlar: v }))} placeholder="Arazi bilgileri..." multiline />
            </div>
            <div className="flex gap-2 p-5 pt-3 border-t border-gray-100 bg-white">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium">İptal</button>
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

// eslint-disable-next-line no-unused-vars
function UsersIcon({ size, className }) {
  return <svg width={size} height={size} className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
}
