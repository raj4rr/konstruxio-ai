import { useState, useEffect, useRef } from 'react'
import { api } from './api'
import { MapPin, Plus, CheckCircle2, AlertTriangle, Layers, Trash2, X } from 'lucide-react'

export function BlueprintView({ projectId }: { projectId: string }) {
  const [sheets, setSheets] = useState<any[]>([])
  const [selectedSheet, setSelectedSheet] = useState<any>(null)
  const [pins, setPins] = useState<any[]>([])
  const [activePin, setActivePin] = useState<any>(null)
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CRITICAL' | 'RESOLVED'>('ALL')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Pin form
  const [title, setTitle] = useState('')
  const [pinType, setPinType] = useState('ISSUE')
  const [severity, setSeverity] = useState('HIGH')
  const [trade, setTrade] = useState('Electrical')
  const [description, setDescription] = useState('')

  // New sheet modal
  const [newSheetTitle, setNewSheetTitle] = useState('')
  const [showAddSheet, setShowAddSheet] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  async function loadSheets() {
    if (!projectId) return
    try {
      const data = await api.drawings(projectId)
      setSheets(data)
      if (data.length && (!selectedSheet || !data.some(s => s.id === selectedSheet.id))) {
        setSelectedSheet(data[0])
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function loadPins(sheetId: string) {
    try {
      const p = await api.drawingPins(sheetId)
      setPins(p)
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadSheets()
  }, [projectId])

  useEffect(() => {
    if (selectedSheet) {
      loadPins(selectedSheet.id)
      setActivePin(null)
      setPendingCoords(null)
    }
  }, [selectedSheet])

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPendingCoords({ x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) })
    setActivePin(null)
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSheet || !pendingCoords || !title.trim()) return
    setBusy(true)
    try {
      await api.createPin(selectedSheet.id, {
        xPercent: pendingCoords.x,
        yPercent: pendingCoords.y,
        title: title.trim(),
        pinType,
        severity,
        trade,
        description
      })
      setTitle('')
      setDescription('')
      setPendingCoords(null)
      await loadPins(selectedSheet.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function togglePinStatus(pin: any) {
    const newStatus = pin.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED'
    try {
      await api.updatePin(pin.id, { status: newStatus })
      await loadPins(selectedSheet.id)
      setActivePin({ ...pin, status: newStatus })
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function deletePin(pinId: string) {
    if (!confirm('Remove this pin marker?')) return
    try {
      await api.deletePin(pinId)
      setActivePin(null)
      await loadPins(selectedSheet.id)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function createNewSheet(e: React.FormEvent) {
    e.preventDefault()
    if (!newSheetTitle.trim()) return
    try {
      const s = await api.createDrawing(projectId, {
        title: newSheetTitle.trim(),
        sheetNumber: `A-${100 + sheets.length + 1}`,
        imageUrl: '/blueprint-sample.svg'
      })
      setNewSheetTitle('')
      setShowAddSheet(false)
      await loadSheets()
      setSelectedSheet(s)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const visiblePins = pins.filter(p => {
    if (filter === 'OPEN') return p.status !== 'RESOLVED'
    if (filter === 'CRITICAL') return p.severity === 'CRITICAL' && p.status !== 'RESOLVED'
    if (filter === 'RESOLVED') return p.status === 'RESOLVED'
    return true
  })

  return (
    <div className="panel blueprintPanel">
      <div className="panelHead">
        <div>
          <h3>Interactive Blueprints &amp; Floor Plan Pinning</h3>
          <p>Click anywhere on the floor plan to pin tasks, defects, or safety hazards with precise spatial coordinates.</p>
        </div>
        <div className="blueprintHeadActions">
          <select value={selectedSheet?.id || ''} onChange={e => setSelectedSheet(sheets.find(s => s.id === e.target.value))}>
            {sheets.map(s => <option key={s.id} value={s.id}>{s.sheetNumber ? `[${s.sheetNumber}] ` : ''}{s.title}</option>)}
          </select>
          <button className="secondary compact" onClick={() => setShowAddSheet(true)}>
            <Plus size={16} /> Add Sheet
          </button>
        </div>
      </div>

      {error && <div className="error banner">{error}<button onClick={() => setError('')}>×</button></div>}

      {/* Filter toolbar */}
      <div className="pinFilterBar">
        <span>FILTER PINS:</span>
        <button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>All ({pins.length})</button>
        <button className={filter === 'OPEN' ? 'active' : ''} onClick={() => setFilter('OPEN')}>Open ({pins.filter(p => p.status !== 'RESOLVED').length})</button>
        <button className={filter === 'CRITICAL' ? 'active' : ''} onClick={() => setFilter('CRITICAL')}>Critical ({pins.filter(p => p.severity === 'CRITICAL' && p.status !== 'RESOLVED').length})</button>
        <button className={filter === 'RESOLVED' ? 'active' : ''} onClick={() => setFilter('RESOLVED')}>Resolved ({pins.filter(p => p.status === 'RESOLVED').length})</button>
      </div>

      {/* Interactive Blueprint Viewport */}
      <div className="canvasContainer">
        <div className="blueprintCanvas" ref={canvasRef} onClick={handleCanvasClick}>
          {selectedSheet && <img src={selectedSheet.imageUrl} alt={selectedSheet.title} className="blueprintImg" />}

          {/* Render Saved Pins */}
          {visiblePins.map(pin => {
            const isCritical = pin.severity === 'CRITICAL'
            const isResolved = pin.status === 'RESOLVED'
            return (
              <div
                key={pin.id}
                className={`pinMarker ${pin.pinType?.toLowerCase() || ''} ${pin.severity?.toLowerCase()} ${isResolved ? 'resolved' : ''} ${activePin?.id === pin.id ? 'active' : ''}`}
                style={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
                onClick={e => { e.stopPropagation(); setActivePin(pin); setPendingCoords(null) }}
                title={`${pin.title} (${pin.pinType || 'ISSUE'})`}
              >
                <MapPin size={22} />
                <span className="pinLabel">{pin.title}</span>
              </div>
            )
          })}

          {/* Pending Pin Placement */}
          {pendingCoords && (
            <div className="pinMarker pending" style={{ left: `${pendingCoords.x}%`, top: `${pendingCoords.y}%` }}>
              <MapPin size={26} />
              <div className="pulseRing" />
            </div>
          )}
        </div>

        {/* Pin Creation Sidebar / Popover */}
        {pendingCoords && (
          <div className="pinModal">
            <div className="pinModalHead">
              <b>Place Pin at {Math.round(pendingCoords.x)}%, {Math.round(pendingCoords.y)}%</b>
              <button className="iconBtn" onClick={() => setPendingCoords(null)}><X size={16} /></button>
            </div>
            <form onSubmit={submitPin}>
              <label>Pin Title
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Unsealed electrical junction box" />
              </label>
              <div className="formRow">
                <label>Type
                  <select value={pinType} onChange={e => setPinType(e.target.value)}>
                    <option value="ISSUE">Defect / Issue</option>
                    <option value="RFI">❓ Engineering RFI (KONSTRUXIO)</option>
                    <option value="TM_TICKET">💰 T&amp;M Extra Work (KONSTRUXIO)</option>
                    <option value="TASK">Field Task</option>
                    <option value="SAFETY">Safety Hazard</option>
                    <option value="NOTE">Site Note</option>
                  </select>
                </label>
                <label>Severity
                  <select value={severity} onChange={e => setSeverity(e.target.value)}>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </label>
              </div>
              <label>Subcontractor / Trade
                <select value={trade} onChange={e => setTrade(e.target.value)}>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Structural">Structural</option>
                  <option value="Safety">Safety / OSHA</option>
                  <option value="Finishes">Finishes &amp; Drywall</option>
                </select>
              </label>
              <label>Notes / Description
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Explain remediation required or specs..." />
              </label>
              <button className="primary" disabled={busy || !title.trim()}><Plus size={16} /> Save Pin to Drawing</button>
            </form>
          </div>
        )}

        {/* Active Pin Detail Popover */}
        {activePin && (
          <div className="pinModal activePinModal">
            <div className="pinModalHead">
              <b>{activePin.title}</b>
              <button className="iconBtn" onClick={() => setActivePin(null)}><X size={16} /></button>
            </div>
            <div className="pinMeta">
              <span className={`badge ${activePin.severity?.toLowerCase()}`}>{activePin.severity}</span>
              <span className="tradeBadge">{activePin.trade || 'General'}</span>
              <span className={`statusBadge ${activePin.status?.toLowerCase()}`}>{activePin.status}</span>
            </div>
            {activePin.description && <p className="pinDesc">{activePin.description}</p>}
            <div className="pinActions">
              <button className="secondary compact" onClick={() => togglePinStatus(activePin)}>
                <CheckCircle2 size={16} /> {activePin.status === 'RESOLVED' ? 'Reopen Defect' : 'Mark as Resolved'}
              </button>
              <button className="danger compact" onClick={() => deletePin(activePin.id)}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddSheet && (
        <div className="dialogOverlay">
          <form className="dialogCard" onSubmit={createNewSheet}>
            <h4>Add New Drawing Sheet</h4>
            <label>Sheet Title
              <input required value={newSheetTitle} onChange={e => setNewSheetTitle(e.target.value)} placeholder="e.g. Level 3 HVAC Duct Layout" />
            </label>
            <div className="dialogBtns">
              <button type="button" className="secondary" onClick={() => setShowAddSheet(false)}>Cancel</button>
              <button className="primary" disabled={!newSheetTitle.trim()}>Create Sheet</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
