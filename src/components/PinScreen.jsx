import { useState, useEffect } from 'react'
import { Delete } from 'lucide-react'

const PIN_KEY       = 'tj_pin'
const AUTH_DATE_KEY = 'tj_auth_date'
const LOCKED_KEY    = 'tj_locked_until'
const ATTEMPTS_KEY  = 'tj_pin_attempts'
const DEFAULT_PIN   = '1905'
const MAX_ATTEMPTS  = 3
const LOCKOUT_MS    = 60_000

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function getPin()        { return localStorage.getItem(PIN_KEY) || DEFAULT_PIN }
export function setPin(pin)     { localStorage.setItem(PIN_KEY, pin) }
export function isPinRequired() { return localStorage.getItem(AUTH_DATE_KEY) !== todayStr() }
export function clearAuth()     { localStorage.removeItem(AUTH_DATE_KEY) }

function markAuth() {
  localStorage.setItem(AUTH_DATE_KEY, todayStr())
  localStorage.removeItem(ATTEMPTS_KEY)
  localStorage.removeItem(LOCKED_KEY)
}

const NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export default function PinScreen({ onUnlock }) {
  const [input, setInput]         = useState('')
  const [error, setError]         = useState(false)
  const [shake, setShake]         = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(
    () => parseInt(localStorage.getItem(LOCKED_KEY) || '0')
  )
  const [attempts, setAttempts] = useState(
    () => parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0')
  )

  const isLocked = lockedUntil > Date.now()

  // Kilit geri sayımı
  useEffect(() => {
    if (!isLocked) return
    const tick = () => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (left <= 0) {
        setLockedUntil(0)
        setAttempts(0)
        localStorage.removeItem(LOCKED_KEY)
        localStorage.setItem(ATTEMPTS_KEY, '0')
        setRemaining(0)
      } else {
        setRemaining(left)
      }
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [lockedUntil])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => { setShake(false); setInput('') }, 550)
  }

  const handlePress = (digit) => {
    if (isLocked || shake) return
    const next = input + digit
    setInput(next)
    setError(false)

    if (next.length < 4) return

    if (next === getPin()) {
      markAuth()
      onUnlock()
    } else {
      const na = attempts + 1
      localStorage.setItem(ATTEMPTS_KEY, String(na))
      setAttempts(na)

      if (na >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS
        localStorage.setItem(LOCKED_KEY, String(until))
        setLockedUntil(until)
      }
      setError(true)
      triggerShake()
    }
  }

  const handleDelete = () => {
    if (isLocked || shake) return
    setInput(i => i.slice(0, -1))
    setError(false)
  }

  const left = MAX_ATTEMPTS - attempts

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center px-8 select-none z-[100]">
      {/* Logo + başlık */}
      <img src="/icon-192x192.png" alt="DroneTarım" className="w-16 h-16 rounded-2xl mb-3 shadow-lg" />
      <h1 className="text-white text-xl font-bold mb-1">DroneTarım</h1>
      <p className="text-gray-400 text-sm mb-10">PIN kodunuzu girin</p>

      {/* Nokta göstergesi */}
      <div className={`flex gap-5 mb-6 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i < input.length
                ? error ? 'bg-red-500 scale-110' : 'bg-primary-500 scale-110'
                : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Durum mesajı */}
      <div className="h-8 mb-6 flex items-center">
        {isLocked ? (
          <p className="text-red-400 text-sm text-center">
            Çok fazla hatalı giriş — {remaining}s bekleyin
          </p>
        ) : error ? (
          <p className="text-red-400 text-sm">
            Yanlış PIN.{' '}
            {left > 0
              ? `${left} deneme hakkınız kaldı.`
              : 'Hesap kilitlendi.'}
          </p>
        ) : null}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {NUMS.map(n => (
          <NumKey key={n} label={String(n)} onPress={() => handlePress(String(n))} disabled={isLocked} />
        ))}

        {/* Alt satır: boş | 0 | sil */}
        <div />
        <NumKey label="0" onPress={() => handlePress('0')} disabled={isLocked} />
        <button
          onClick={handleDelete}
          disabled={isLocked || input.length === 0}
          className="h-16 rounded-2xl bg-gray-800 text-gray-300 flex items-center justify-center active:bg-gray-700 disabled:opacity-30 transition-colors"
        >
          <Delete size={22} />
        </button>
      </div>
    </div>
  )
}

function NumKey({ label, onPress, disabled }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className="h-16 rounded-2xl bg-gray-800 text-white text-2xl font-semibold flex items-center justify-center active:bg-gray-700 disabled:opacity-30 transition-colors"
    >
      {label}
    </button>
  )
}
