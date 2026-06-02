// Veri erişim yardımcıları - tüm veriler localStorage'da saklanır

export const KEYS = {
  CUSTOMERS: 'drone_customers',
  JOBS:      'drone_jobs',
  PAYMENTS:  'drone_payments',
  EXPENSES:  'drone_expenses',
  STOCK:     'drone_stock',
}

export function getAll(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

export function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Müşteri işlemleri
export const customerStore = {
  getAll: () => getAll(KEYS.CUSTOMERS),
  add: (customer) => {
    const customers = getAll(KEYS.CUSTOMERS)
    const newCustomer = { ...customer, id: generateId(), createdAt: new Date().toISOString() }
    save(KEYS.CUSTOMERS, [...customers, newCustomer])
    return newCustomer
  },
  update: (id, updates) => {
    const customers = getAll(KEYS.CUSTOMERS)
    save(KEYS.CUSTOMERS, customers.map(c => c.id === id ? { ...c, ...updates } : c))
  },
  delete: (id) => {
    save(KEYS.CUSTOMERS, getAll(KEYS.CUSTOMERS).filter(c => c.id !== id))
  },
  getById: (id) => getAll(KEYS.CUSTOMERS).find(c => c.id === id),
}

// İş işlemleri
export const jobStore = {
  getAll: () => getAll(KEYS.JOBS),
  add: (job) => {
    const jobs = getAll(KEYS.JOBS)
    const newJob = { ...job, id: generateId(), createdAt: new Date().toISOString() }
    save(KEYS.JOBS, [...jobs, newJob])
    return newJob
  },
  update: (id, updates) => {
    const jobs = getAll(KEYS.JOBS)
    save(KEYS.JOBS, jobs.map(j => j.id === id ? { ...j, ...updates } : j))
  },
  delete: (id) => {
    save(KEYS.JOBS, getAll(KEYS.JOBS).filter(j => j.id !== id))
  },
  getById: (id) => getAll(KEYS.JOBS).find(j => j.id === id),
  getByCustomer: (customerId) => getAll(KEYS.JOBS).filter(j => j.musteriId === customerId),
  getByDate: (dateStr) => getAll(KEYS.JOBS).filter(j => j.tarih === dateStr),
}

// Ödeme kaydı işlemleri
export const paymentStore = {
  getAll: () => getAll(KEYS.PAYMENTS),
  getByJob: (jobId) => getAll(KEYS.PAYMENTS).filter(p => p.isId === jobId),
  add: (payment) => {
    const payments = getAll(KEYS.PAYMENTS)
    const newPayment = { ...payment, id: generateId(), createdAt: new Date().toISOString() }
    save(KEYS.PAYMENTS, [...payments, newPayment])
    return newPayment
  },
  delete: (id) => {
    save(KEYS.PAYMENTS, getAll(KEYS.PAYMENTS).filter(p => p.id !== id))
  },
  deleteByJob: (jobId) => {
    save(KEYS.PAYMENTS, getAll(KEYS.PAYMENTS).filter(p => p.isId !== jobId))
  },
  getTotalForJob: (jobId) => {
    return getAll(KEYS.PAYMENTS)
      .filter(p => p.isId === jobId)
      .reduce((s, p) => s + (Number(p.miktar) || 0), 0)
  },
}

// Gider işlemleri
export const expenseStore = {
  getAll: () => getAll(KEYS.EXPENSES),
  add: (expense) => {
    const all = getAll(KEYS.EXPENSES)
    const item = { ...expense, id: generateId(), createdAt: new Date().toISOString() }
    save(KEYS.EXPENSES, [...all, item])
    return item
  },
  delete: (id) => {
    save(KEYS.EXPENSES, getAll(KEYS.EXPENSES).filter(e => e.id !== id))
  },
}

// Geriye dönük uyumluluk: eski alinanOdeme veya odemeDurumu='odendi' alanlarını
// payment kaydı yoksa dönüşüm yapmadan okur
export function getEffectivePaid(job, paymentTotals) {
  const fromRecords = paymentTotals?.[job.id] ?? paymentStore.getTotalForJob(job.id)
  if (fromRecords > 0) return fromRecords
  if (job.alinanOdeme) return Number(job.alinanOdeme) || 0
  if (job.odemeDurumu === 'odendi') return Number(job.tutar) || 0
  return 0
}

export function deriveOdemeDurumu(tutar, totalPaid) {
  const t = Number(tutar) || 0
  const a = Number(totalPaid) || 0
  if (a <= 0) return 'bekliyor'
  if (t > 0 && a >= t) return 'odendi'
  return 'kismi'
}

// Stok işlemleri
export const stockStore = {
  getAll: () => getAll(KEYS.STOCK),
  getById: (id) => getAll(KEYS.STOCK).find(s => s.id === id),
  add: (item) => {
    const all = getAll(KEYS.STOCK)
    const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() }
    save(KEYS.STOCK, [...all, newItem])
    return newItem
  },
  update: (id, updates) => {
    const all = getAll(KEYS.STOCK)
    save(KEYS.STOCK, all.map(s => s.id === id ? { ...s, ...updates } : s))
  },
  delete: (id) => {
    save(KEYS.STOCK, getAll(KEYS.STOCK).filter(s => s.id !== id))
  },
  adjust: (id, delta) => {
    if (!id || !delta) return
    const all = getAll(KEYS.STOCK)
    save(KEYS.STOCK, all.map(s =>
      s.id === id ? { ...s, miktar: Math.max(0, (Number(s.miktar) || 0) + Number(delta)) } : s
    ))
  },
  getCritical: () => getAll(KEYS.STOCK).filter(s => Number(s.miktar) <= Number(s.minStok)),
}
