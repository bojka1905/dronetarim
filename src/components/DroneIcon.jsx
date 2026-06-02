export function DroneIcon({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DroneTarım"
    >
      {/* Kollar – diyagonal X konfigürasyonu */}
      <line x1="50" y1="50" x2="21" y2="21" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
      <line x1="50" y1="50" x2="79" y2="21" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
      <line x1="50" y1="50" x2="21" y2="79" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
      <line x1="50" y1="50" x2="79" y2="79" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>

      {/* Pervane diskleri */}
      <circle cx="21" cy="21" r="14" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.12"/>
      <circle cx="79" cy="21" r="14" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.12"/>
      <circle cx="21" cy="79" r="14" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.12"/>
      <circle cx="79" cy="79" r="14" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.12"/>

      {/* Motor yuvaları */}
      <circle cx="21" cy="21" r="5" fill="currentColor"/>
      <circle cx="79" cy="21" r="5" fill="currentColor"/>
      <circle cx="21" cy="79" r="5" fill="currentColor"/>
      <circle cx="79" cy="79" r="5" fill="currentColor"/>

      {/* Merkez gövde */}
      <rect x="40" y="40" width="20" height="20" rx="5" fill="currentColor"/>

      {/* Kamera */}
      <circle cx="50" cy="50" r="5"   fill="currentColor" fillOpacity="0.25"/>
      <circle cx="50" cy="50" r="2.5" fill="currentColor" fillOpacity="0.65"/>
    </svg>
  )
}
