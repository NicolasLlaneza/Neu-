export default function Logo({ className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, letterSpacing: '0.05em' }}>
        <span style={{ color: '#cccccc', fontSize: '3.5rem', lineHeight: 1 }}>NEU</span>
        <span style={{ color: '#910000', fontSize: '3.5rem', lineHeight: 1 }}>+</span>
      </div>
      <span style={{
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 500,
        color: '#666666',
        fontSize: '0.65rem',
        letterSpacing: '0.35em',
      }}>
        NEUMÁTICOS
      </span>
    </div>
  )
}
