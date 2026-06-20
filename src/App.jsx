import { useEffect, useRef, useState } from 'react'
import { createStompClient, subscribeBlueprint } from './lib/stompClient.js'
import { createSocket } from './lib/socketIoClient.js'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'
const IO_BASE  = import.meta.env.VITE_IO_BASE  ?? 'http://localhost:3001'

export default function App() {
  const [tech, setTech] = useState('stomp')
  const [author, setAuthor] = useState('juan')
  const [name, setName] = useState('plano-1')
  const [mode, setMode] = useState('click')
  const [color, setColor] = useState('#1e40af')

  const [planList, setPlanList] = useState([])
  const [newPlanName, setNewPlanName] = useState('')

  const canvasRef = useRef(null)
  const stompRef = useRef(null)
  const unsubRef = useRef(null)
  const unsubClearRef = useRef(null)
  const socketRef = useRef(null)

  const pointsRef = useRef([])
  const drawingRef = useRef(false)
  const lastSentRef = useRef(null)
  const colorRef = useRef(color)

  useEffect(() => { colorRef.current = color }, [color])


  function loadPlans() {
    fetch(`${API_BASE}/api/blueprints?author=${author}`)
        .then(r => r.json())
        .then(data => setPlanList(Array.isArray(data) ? data : []))
        .catch(err => console.error('Error cargando planos', err))
  }

  function loadCanvas() {
    fetch(`${API_BASE}/api/blueprints/${author}/${name}`)
        .then(r => r.json())
        .then(bp => {
          pointsRef.current = Array.isArray(bp?.points) ? bp.points : []
          redraw()
        })
        .catch(() => { pointsRef.current = []; redraw() })
  }

  useEffect(() => {
    loadPlans()
    loadCanvas()
  }, [author, name])

  function createBlueprint() {
    const planName = newPlanName.trim()
    if (!planName) return
    fetch(`${API_BASE}/api/blueprints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, name: planName })
    })
        .then(() => {
          setNewPlanName('')
          setName(planName)
          loadPlans()
        })
        .catch(err => console.error('Error creando plano', err))
  }

  function saveBlueprint() {
    fetch(`${API_BASE}/api/blueprints/${author}/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pointsRef.current)
    })
        .then(() => loadPlans())
        .catch(err => console.error('Error guardando plano', err))
  }

  function deleteBlueprint() {
    fetch(`${API_BASE}/api/blueprints/${author}/${name}`, { method: 'DELETE' })
        .then(() => {
          pointsRef.current = []
          redraw()
          loadPlans()
        })
        .catch(err => console.error('Error eliminando plano', err))
  }

  function selectBlueprint(planName) {
    setName(planName)
  }


  function redraw() {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 600, 400)
    const pts = pointsRef.current
    for (let i = 1; i < pts.length; i++) {
      ctx.beginPath()
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
      ctx.lineTo(pts[i].x, pts[i].y)
      ctx.strokeStyle = pts[i].color || '#1e40af'
      ctx.stroke()
    }
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = p.color || '#1e40af'
      ctx.fill()
    })
  }

  function onRemotePoints(incoming) {
    if (!incoming) return
    incoming.forEach(p => pointsRef.current.push(p))
    redraw()
  }

  function onRemoteClear() {
    pointsRef.current = []
    redraw()
  }


  useEffect(() => {
    unsubRef.current?.(); unsubRef.current = null
    unsubClearRef.current?.(); unsubClearRef.current = null
    stompRef.current?.deactivate?.(); stompRef.current = null
    socketRef.current?.disconnect?.(); socketRef.current = null

    if (tech === 'stomp') {
      const client = createStompClient(API_BASE)
      stompRef.current = client
      client.onConnect = () => {
        console.log('STOMP conectado')
        unsubRef.current = subscribeBlueprint(client, author, name, (upd) => {
          onRemotePoints(upd.points)
        })
        unsubClearRef.current = client.subscribe(
            `/topic/blueprints.${author}.${name}.clear`,
            () => onRemoteClear()
        )
      }
      client.activate()
    } else {
      const s = createSocket(IO_BASE)
      socketRef.current = s
      const room = `blueprints.${author}.${name}`
      s.on('connect', () => {
        console.log('Socket.IO conectado')
        s.emit('join-room', room)
      })
      s.on('blueprint-update', (upd) => onRemotePoints(upd.points))
      s.on('blueprint-clear', () => onRemoteClear())
    }
    return () => {
      if (typeof unsubRef.current === 'function') unsubRef.current()
      unsubRef.current = null
      if (typeof unsubClearRef.current === 'function') unsubClearRef.current()
      unsubClearRef.current = null
      stompRef.current?.deactivate?.()
      socketRef.current?.disconnect?.()
    }
  }, [tech, author, name])

  function getPoint(e) {
    const rect = e.target.getBoundingClientRect()
    return { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) }
  }

  function sendPoint(pos) {
    const point = { x: pos.x, y: pos.y, color: colorRef.current }
    if (tech === 'stomp' && stompRef.current?.connected) {
      stompRef.current.publish({ destination: '/app/draw', body: JSON.stringify({ author, name, point }) })
    } else if (tech === 'socketio' && socketRef.current?.connected) {
      const room = `blueprints.${author}.${name}`
      socketRef.current.emit('draw-event', { room, author, name, point })
    } else {
      console.warn('No conectado todavía, espera un momento')
    }
  }

  function onClick(e) {
    if (mode !== 'click') return
    sendPoint(getPoint(e))
  }
  function onMouseDown(e) {
    if (mode !== 'drag') return
    drawingRef.current = true
    const p = getPoint(e)
    lastSentRef.current = p
    sendPoint(p)
  }
  function onMouseMove(e) {
    if (mode !== 'drag' || !drawingRef.current) return
    const p = getPoint(e)
    const last = lastSentRef.current
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 10) {
      lastSentRef.current = p
      sendPoint(p)
    }
  }
  function onMouseUp() {
    drawingRef.current = false
    lastSentRef.current = null
  }

  function clearAll() {
    if (tech === 'stomp' && stompRef.current?.connected) {
      stompRef.current.publish({ destination: '/app/clear', body: JSON.stringify({ author, name, point: null }) })
    } else if (tech === 'socketio' && socketRef.current?.connected) {
      const room = `blueprints.${author}.${name}`
      socketRef.current.emit('clear-event', { room, author, name })
    }
  }

  const totalPoints = planList.reduce((acc, bp) => acc + (bp.points?.length ?? 0), 0)

  return (
      <div style={{ fontFamily: 'Inter, system-ui', padding: 16, maxWidth: 980 }}>
        <h2>BluePrints RT – Socket.IO vs STOMP</h2>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <label>Tecnología:</label>
          <select value={tech} onChange={e => setTech(e.target.value)}>
            <option value="stomp">STOMP (Spring)</option>
            <option value="socketio">Socket.IO (Node)</option>
          </select>
          <label>Modo:</label>
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="click">Clic (por puntos)</option>
            <option value="drag">Arrastrar (continuo)</option>
          </select>
          <label>Color:</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="autor" />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="plano" />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="nombre nuevo plano" />
          <button onClick={createBlueprint}>Create</button>
          <button onClick={saveBlueprint}>Save/Update</button>
          <button onClick={deleteBlueprint}>Delete</button>
          <button onClick={clearAll}>Limpiar todo</button>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <canvas
              ref={canvasRef}
              width={600}
              height={400}
              style={{ border: '1px solid #ddd', borderRadius: 12, cursor: 'crosshair' }}
              onClick={onClick}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
          />

          <div style={{ minWidth: 260 }}>
            <h3 style={{ marginTop: 0 }}>Planos de {author}</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 4 }}>Plano</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: 4 }}>Puntos</th>
              </tr>
              </thead>
              <tbody>
              {planList.map(bp => (
                  <tr
                      key={bp.name}
                      onClick={() => selectBlueprint(bp.name)}
                      style={{ cursor: 'pointer', background: bp.name === name ? '#e0e7ff' : 'transparent' }}
                  >
                    <td style={{ padding: 4 }}>{bp.name}</td>
                    <td style={{ padding: 4, textAlign: 'right' }}>{bp.points?.length ?? 0}</td>
                  </tr>
              ))}
              </tbody>
              <tfoot>
              <tr>
                <td style={{ padding: 4, fontWeight: 'bold', borderTop: '1px solid #ccc' }}>Total</td>
                <td style={{ padding: 4, textAlign: 'right', fontWeight: 'bold', borderTop: '1px solid #ccc' }}>{totalPoints}</td>
              </tr>
              </tfoot>
            </table>
            <button onClick={loadPlans} style={{ marginTop: 8 }}>Refrescar lista</button>
          </div>
        </div>

        <p style={{ opacity: .7, marginTop: 8 }}>Tip: abre 2 pestañas y dibuja alternando para ver la colaboración.</p>
      </div>
  )
}