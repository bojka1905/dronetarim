import { useState, useRef } from 'react'
import { customerStore, jobStore, paymentStore, expenseStore, KEYS } from '../utils/store'
import { getPin, setPin } from '../components/PinScreen'
import { Download, Upload, AlertTriangle, CheckCircle, XCircle, Lock } from 'lucide-react'

function buildBackup() {
  return {
    appVersion: '2',
    exportedAt: new Date().toISOString(),
    customers: customerStore.getAll(),
    jobs: jobStore.getAll(),
    payments: paymentStore.getAll(),
    expenses: expenseStore.getAll(),
  }
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function restoreBackup(data) {
  if (!Array.isArray(data.customers) || !Array.isArray(data.jobs) || !Array.isArray(data.payments)) {
    throw new Error('Geçersiz yedek dosyası — beklenen alanlar eksik.')
  }
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(data.customers))
  localStorage.setItem(KEYS.JOBS,      JSON.stringify(data.jobs))
  localStorage.setItem(KEYS.PAYMENTS,  JSON.stringify(data.payments))
  localStorage.setItem(KEYS.EXPENSES,  JSON.stringify(data.expenses || []))
  return {
    customers: data.customers.length,
    jobs:      data.jobs.length,
    payments:  data.payments.length,
    expenses:  (data.expenses || []).length,
  }
}

export default function Settings() {
  const [status, setStatus] = useState(null) // { ok: bool, msg: string }
  const [restoreConfirm, setRestoreConfirm] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const fileRef = useRef(null)

  // PIN değiştirme state'leri
  const [curPin, setCurPin]     = useState('')
  const [newPin, setNewPin]     = useState('')
  const [pinMsg, setPinMsg]     = useState(null) // { ok, msg }

  const handlePinChange = () => {
    setPinMsg(null)
    if (curPin !== getPin()) {
      setPinMsg({ ok: false, msg: 'Mevcut PIN yanlış.' }); return
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinMsg({ ok: false, msg: 'Yeni PIN tam 4 rakam olmalı.' }); return
    }
    setPin(newPin)
    setCurPin(''); setNewPin('')
    setPinMsg({ ok: true, msg: 'PIN başarıyla güncellendi.' })
  }

  const counts = {
    customers: customerStore.getAll().length,
    jobs:      jobStore.getAll().length,
    payments:  paymentStore.getAll().length,
    expenses:  expenseStore.getAll().length,
  }

  const handleExport = () => {
    const backup = buildBackup()
    const date = new Date().toISOString().slice(0, 10)
    downloadJSON(backup, `tarimjet-yedek-${date}.json`)
    setStatus({ ok: true, msg: `Yedek indirildi: ${counts.customers} müşteri, ${counts.jobs} iş, ${counts.payments} ödeme, ${counts.expenses} gider kaydı.` })
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPendingFile(file)
    setRestoreConfirm(true)
    setStatus(null)
  }

  const handleRestoreConfirm = () => {
    if (!pendingFile) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        const counts = restoreBackup(data)
        setStatus({ ok: true, msg: `Geri yüklendi: ${counts.customers} müşteri, ${counts.jobs} iş, ${counts.payments} ödeme, ${counts.expenses} gider. Sayfa yenileniyor…` })
        setTimeout(() => window.location.reload(), 1800)
      } catch (err) {
        setStatus({ ok: false, msg: err.message || 'Dosya okunamadı.' })
      }
      setRestoreConfirm(false)
      setPendingFile(null)
    }
    reader.onerror = () => {
      setStatus({ ok: false, msg: 'Dosya okunamadı.' })
      setRestoreConfirm(false)
      setPendingFile(null)
    }
    reader.readAsText(pendingFile)
  }

  return (
    <div className="p-4 space-y-5 pb-6">
      {/* Başlık */}
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Veri yedekleme ve geri yükleme</p>
      </div>

      {/* Mevcut veri özeti */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Mevcut Veri</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-gray-800">{counts.customers}</div>
            <div className="text-xs text-gray-500 mt-0.5">Müşteri</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-800">{counts.jobs}</div>
            <div className="text-xs text-gray-500 mt-0.5">İş</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-800">{counts.payments}</div>
            <div className="text-xs text-gray-500 mt-0.5">Ödeme</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-800">{counts.expenses}</div>
            <div className="text-xs text-gray-500 mt-0.5">Gider</div>
          </div>
        </div>
      </div>

      {/* Yedek Al */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download size={20} className="text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Yedek Al</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Tüm veriler <code className="bg-gray-100 px-1 rounded text-xs">tarimjet-yedek-TARIH.json</code> olarak indirilir.
              WhatsApp ile kolayca paylaşabilirsiniz.
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="w-full bg-primary-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:bg-primary-700 transition-colors"
        >
          <Download size={18} /> Yedek Al
        </button>
      </div>

      {/* Geri Yükle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Upload size={20} className="text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Geri Yükle</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Daha önce alınan yedek dosyasını seçin. Mevcut tüm veriler yedektekiyle değiştirilir.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4">
          <AlertTriangle size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-700 leading-relaxed">
            Bu işlem <strong>geri alınamaz.</strong> Önce mevcut verinizin yedeğini alın.
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-3 font-semibold flex items-center justify-center gap-2 active:bg-gray-50 transition-colors"
        >
          <Upload size={18} /> Yedek Dosyası Seç
        </button>
      </div>

      {/* PIN Değiştir */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lock size={20} className="text-gray-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">PIN Değiştir</h2>
            <p className="text-sm text-gray-500 mt-0.5">4 haneli giriş PIN'inizi güncelleyin.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mevcut PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={curPin}
              onChange={e => { setCurPin(e.target.value.replace(/\D/g,'')); setPinMsg(null) }}
              placeholder="••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 tracking-[0.5em] text-center"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Yeni PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={e => { setNewPin(e.target.value.replace(/\D/g,'')); setPinMsg(null) }}
              placeholder="••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 tracking-[0.5em] text-center"
            />
          </div>
          <button
            onClick={handlePinChange}
            className="w-full bg-gray-800 text-white rounded-xl py-3 font-semibold active:bg-gray-900 transition-colors"
          >
            PIN'i Güncelle
          </button>
          {pinMsg && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border ${pinMsg.ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              {pinMsg.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {pinMsg.msg}
            </div>
          )}
        </div>
      </div>

      {/* Durum mesajı */}
      {status && (
        <div className={`rounded-xl p-4 flex items-start gap-2.5 border ${status.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          {status.ok
            ? <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            : <XCircle    size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          }
          <p className={`text-sm font-medium ${status.ok ? 'text-green-700' : 'text-red-700'}`}>{status.msg}</p>
        </div>
      )}

      {/* Uygulama bilgisi */}
      <div className="text-center text-xs text-gray-400 pt-2">
        <p className="font-medium">TarımJet v1.0</p>
        <p className="mt-0.5">Drone İlaçlama Yönetim Sistemi</p>
      </div>

      {/* Onay modalı */}
      {restoreConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setRestoreConfirm(false); setPendingFile(null) }} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={28} className="text-orange-500" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Emin misiniz?</h3>
            <p className="text-sm text-gray-600 text-center mb-1">
              <strong>{pendingFile?.name}</strong>
            </p>
            <p className="text-sm text-gray-500 text-center mb-6">
              Mevcut tüm veriler silinecek ve yedekteki veriler yüklenecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setRestoreConfirm(false); setPendingFile(null) }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleRestoreConfirm}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold active:bg-orange-600"
              >
                Geri Yükle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
