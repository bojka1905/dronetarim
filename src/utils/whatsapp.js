export function generateJobSummary(job, customer, totalPaid = 0) {
  const durum = job.durum === 'tamamlandi' ? '✅ Tamamlandı' :
                job.durum === 'planli'     ? '📅 Planlandı' : '⏳ Devam Ediyor'

  const tutar = Number(job.tutar) || 0
  const kalan = Math.max(0, tutar - totalPaid)
  const odeme = totalPaid >= tutar && tutar > 0
    ? `✅ Ödendi (${formatCurrency(tutar)})`
    : totalPaid > 0
    ? `◑ Kısmi — Alınan: ${formatCurrency(totalPaid)} / Kalan: ${formatCurrency(kalan)}`
    : `⏳ Bekliyor (${formatCurrency(tutar)})`

  const text = `🚁 *DroneTarım - İŞ BİLGİSİ*

👤 *Müşteri:* ${customer.ad}
📍 *Tarla:* ${job.tarlaAdi}
📐 *Alan:* ${job.dekar} dönüm
🔧 *İş Tipi:* ${{ tohumlama: 'Tohumlama', ilac: 'İlaçlama', gubreleme: 'Gübreleme' }[job.isTipi] || 'İlaçlama'}
${{ tohumlama: '🌱 *Tohum Türü:*', ilac: '🌿 *İlaç Adı:*', gubreleme: '🌾 *Gübre Adı:*' }[job.isTipi] || '🌿 *İlaç Adı:*'} ${job.ilac}${job.doz ? ` (${job.doz})` : ''}
📅 *Tarih:* ${formatDate(job.tarih)}${job.saat ? ` · ${job.saat}` : ''}
📊 *Durum:* ${durum}
💰 *Ödeme:* ${odeme}
${job.notlar ? `\n📝 *Not:* ${job.notlar}` : ''}
_DroneTarım - Drone İlaçlama Yönetim_`

  return text.trim()
}

export function generateCustomerSummary(customer, jobs, financials) {
  const IS_TIPI_LABEL = { tohumlama: '🌱 Tohumlama', ilac: '🌿 İlaçlama', gubreleme: '🌾 Gübreleme' }
  const DURUM_ICON = { tamamlandi: '✅', devamediyor: '⏳', planli: '📅' }

  let text = `🚁 *DroneTarım - MÜŞTERİ ÖZETİ*\n\n`
  text += `👤 *${customer.ad}*`
  if (customer.telefon) text += `\n📞 ${customer.telefon}`
  if (customer.il) text += `\n📍 ${customer.il}${customer.ilce ? ` / ${customer.ilce}` : ''}`

  if (jobs.length > 0) {
    text += `\n\n*İŞLER (${jobs.length} iş)*`
    jobs.forEach((job, i) => {
      const icon = DURUM_ICON[job.durum] || '📅'
      text += `\n${i + 1}. ${icon} ${IS_TIPI_LABEL[job.isTipi] || '🌿 İlaçlama'}`
      text += `\n   📍 ${job.tarlaAdi} · ${job.dekar} dönüm`
      text += `\n   📅 ${formatDate(job.tarih)}`
      if (job.ilac) text += `\n   ${job.ilac}${job.doz ? ` (${job.doz})` : ''}`
    })
  }

  text += `\n\n*💰 FİNANSAL ÖZET*`
  text += `\nToplam Alacak: ${formatCurrency(financials.totalAlacak)}`
  text += `\nTahsil Edilen: ${formatCurrency(financials.totalTahsil)}`
  text += `\nKalan Borç: ${formatCurrency(financials.kalan)}`
  text += '\n\n_DroneTarım - Drone İlaçlama Yönetim_'
  return text.trim()
}

export function openWhatsApp(phone, text) {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('0') ? '90' + cleaned.slice(1) : cleaned
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank')
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}
