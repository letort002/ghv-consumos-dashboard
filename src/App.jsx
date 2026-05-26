import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const DATA_URL = 'https://raw.githubusercontent.com/letort002/ghv-consumos-2/main/consumos.json'

const FINCA_COLORS = {
  'Bodega HV': '#5C6832',
  'Bodega FM': '#7a8a44',
  'Bodega JG': '#C8784A',
  'Bodega CM': '#e0a07a',
}
const CAT_COLORS = ['#5C6832','#7a8a44','#9aab55','#C8784A','#e0a07a','#383830','#b5c47a']

const fmt = (n) => '$' + Math.round(n).toLocaleString('es-EC')
const fmtK = (n) => n >= 1000 ? '$' + (n/1000).toFixed(1) + 'k' : fmt(n)

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mesFiltro, setMesFiltro] = useState('todos')
  const [fincaFiltro, setFincaFiltro] = useState('todas')

  useEffect(() => {
    fetch(DATA_URL + '?t=' + Date.now())
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('No se pudieron cargar los datos'); setLoading(false) })
  }, [])

  if (loading) return <div style={styles.loading}><div style={styles.spinner}/><p>Cargando datos...</p></div>
  if (error) return <div style={styles.loading}><p style={{color:'#c0392b'}}>{error}</p></div>
  if (!data) return null

  // Calcular datos filtrados
  const calcFiltrado = () => {
    if (mesFiltro === 'todos' && fincaFiltro === 'todas') {
      return {
        porFinca: data.por_finca,
        porCat: data.por_categoria,
        total: data.total_gasto,
        filas: data.total_filas
      }
    }

    let mesData = mesFiltro !== 'todos' ? data.por_mes[mesFiltro] : null

    const porFinca = {}
    Object.entries(data.por_finca).forEach(([b, v]) => {
      if (fincaFiltro !== 'todas' && b !== fincaFiltro) return
      if (mesData) {
        const mf = mesData.por_finca[b]
        if (mf) porFinca[b] = { ...v, total: mf.total, costo_x_hta: mf.costo_x_hta }
      } else {
        porFinca[b] = v
      }
    })

    let cats = mesData ? mesData.por_categoria : data.por_categoria
    if (fincaFiltro !== 'todas') {
      cats = (mesData ? mesData.por_finca[fincaFiltro]?.por_categoria : null) || cats
    }

    const total = Object.values(porFinca).reduce((s, v) => s + v.total, 0)
    const porcats = cats?.map(c => ({ ...c, pct: total > 0 ? Math.round(c.total / total * 100 * 10) / 10 : 0 })) || []

    return { porFinca, porCat: porcats, total, filas: data.total_filas }
  }

  const { porFinca, porCat, total, filas } = calcFiltrado()

  const fincasOrdenadas = Object.entries(porFinca).sort((a, b) => b[1].total - a[1].total)
  const htaData = Object.entries(porFinca).sort((a, b) => b[1].costo_x_hta - a[1].costo_x_hta)
  const lider = fincasOrdenadas[0]
  const topCats = (porCat || []).slice(0, 7)

  const barData = fincasOrdenadas.map(([b, v]) => ({
    name: b.replace('Bodega ', ''),
    total: Math.round(v.total),
    full: b
  }))

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>🌿 Consumos GHV</h1>
          <p style={styles.headerSub}>Actualizado: {data.updated} · {data.fecha_desde} → {data.fecha_hasta}</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={styles.filtros}>
        <select style={styles.select} value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}>
          <option value="todos">Todos los meses</option>
          {(data.meses_disponibles || []).map(m => (
            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
          ))}
        </select>
        <select style={styles.select} value={fincaFiltro} onChange={e => setFincaFiltro(e.target.value)}>
          <option value="todas">Todas las fincas</option>
          {Object.keys(data.por_finca).map(b => (
            <option key={b} value={b}>{b.replace('Bodega ', '')}</option>
          ))}
        </select>
      </div>

      {/* Métricas */}
      <div style={styles.metricGrid}>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>Gasto total</div>
          <div style={styles.metricValue}>{fmt(total)}</div>
          <div style={styles.metricSub}>{filas.toLocaleString()} registros</div>
        </div>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>Finca líder</div>
          <div style={{...styles.metricValue, fontSize: 16}}>{lider ? lider[0].replace('Bodega ','') : '—'}</div>
          <div style={styles.metricSub}>{lider ? fmtK(lider[1].total) : ''}</div>
        </div>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>Mayor $/HTA</div>
          <div style={styles.metricValue}>{htaData[0] ? fmtK(htaData[0][1].costo_x_hta) : '—'}</div>
          <div style={styles.metricSub}>{htaData[0] ? htaData[0][0].replace('Bodega ','') : ''}</div>
        </div>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>Categorías</div>
          <div style={styles.metricValue}>{(porCat||[]).length}</div>
          <div style={styles.metricSub}>tipos de insumo</div>
        </div>
      </div>

      {/* Gráfico barras por finca */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Gasto por finca</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{top:4,right:8,left:0,bottom:4}}>
            <XAxis dataKey="name" tick={{fontSize:12}} />
            <YAxis tick={{fontSize:11}} tickFormatter={v => '$'+Math.round(v/1000)+'k'} width={48} />
            <Tooltip formatter={(v) => [fmt(v), 'Total']} />
            <Bar dataKey="total" radius={[4,4,0,0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={FINCA_COLORS[entry.full] || '#5C6832'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* $ por Hectárea */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>$ por hectárea</h2>
        <div style={styles.htaGrid}>
          {htaData.map(([b, v]) => (
            <div key={b} style={{...styles.htaCard, borderLeft: `3px solid ${FINCA_COLORS[b]||'#5C6832'}`}}>
              <div style={styles.htaFinca}>{b.replace('Bodega ','')}</div>
              <div style={styles.htaVal}>{fmt(v.costo_x_hta)}</div>
              <div style={styles.htaSub}>{v.htas} htas</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top categorías */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Top categorías</h2>
        {topCats.map((c, i) => (
          <div key={c.categoria} style={styles.catRow}>
            <div style={{...styles.catDot, background: CAT_COLORS[i % CAT_COLORS.length]}} />
            <div style={styles.catName}>{c.categoria.charAt(0) + c.categoria.slice(1).toLowerCase()}</div>
            <div style={styles.catVal}>{fmtK(c.total)}</div>
            <div style={styles.catPct}>{c.pct}%</div>
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        Grupo Hoja Verde · Supply Chain Dashboard · {new Date().getFullYear()}
      </div>
    </div>
  )
}

const styles = {
  container: { maxWidth: 480, margin: '0 auto', padding: '0 0 24px', background: '#f5f5f0', minHeight: '100vh' },
  loading: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:12, color:'#666' },
  spinner: { width:32, height:32, border:'3px solid #eee', borderTop:'3px solid #5C6832', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  header: { background:'#5C6832', padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  headerTitle: { color:'#EEEDE2', fontSize:18, fontWeight:600 },
  headerSub: { color:'#c8d4a0', fontSize:11, marginTop:2 },
  filtros: { display:'flex', gap:8, padding:'12px 16px', background:'#fff', borderBottom:'1px solid #e0e0d8' },
  select: { flex:1, padding:'8px 10px', border:'1px solid #ddd', borderRadius:8, fontSize:13, background:'#fff', color:'#333' },
  metricGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, padding:'12px 16px' },
  metric: { background:'#fff', borderRadius:10, padding:'12px 14px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  metricLabel: { fontSize:11, color:'#888', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 },
  metricValue: { fontSize:20, fontWeight:700, color:'#1a1a1a' },
  metricSub: { fontSize:11, color:'#999', marginTop:2 },
  card: { background:'#fff', margin:'0 16px 12px', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize:13, fontWeight:600, color:'#444', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:12 },
  htaGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 },
  htaCard: { background:'#f9f9f6', borderRadius:8, padding:'10px 12px' },
  htaFinca: { fontSize:11, fontWeight:600, color:'#666', marginBottom:2 },
  htaVal: { fontSize:18, fontWeight:700, color:'#1a1a1a' },
  htaSub: { fontSize:10, color:'#999' },
  catRow: { display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid #f0f0eb' },
  catDot: { width:8, height:8, borderRadius:2, flexShrink:0 },
  catName: { flex:1, fontSize:13, color:'#333' },
  catVal: { fontSize:13, fontWeight:600, color:'#1a1a1a' },
  catPct: { fontSize:11, color:'#999', minWidth:32, textAlign:'right' },
  footer: { textAlign:'center', color:'#aaa', fontSize:11, padding:'16px', marginTop:8 }
}
