import { useState, useEffect, useRef } from 'react'
import { api } from './api'
import {
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Calendar,
  Loader2,
  FileQuestion,
  DollarSign,
  Send,
  UserCheck,
  ShieldCheck,
  Globe,
  PenTool,
  Clock,
  Layers,
  FileText
} from 'lucide-react'

type SubView = 'dictate' | 'rfis' | 'tmtickets' | 'copilot'

interface RfiItem {
  id?: string
  rfiNumber: string
  title: string
  question: string
  discipline?: string
  trade?: string
  drawingReference?: string
  suggestedSolution?: string
  scheduleImpact?: boolean
  costImpact?: boolean
  status: string
  officialResponse?: string
  createdAt?: string
}

interface TmTicketItem {
  id?: string
  ticketNumber: string
  title: string
  clientDirective?: string
  trade?: string
  laborHours?: string
  materialsUsed?: string
  estimatedCost: number
  status: string
  signedBy?: string
  customerSignature?: string
  signedAt?: string
  createdAt?: string
}

export function KonstruxioCopilotView({
  projectId,
  onDataChanged
}: {
  projectId: string
  onDataChanged: () => void
}) {
  const [subView, setSubView] = useState<SubView>('dictate')
  const [recording, setRecording] = useState(false)
  const [language, setLanguage] = useState('en')
  const [textInput, setTextInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [extraction, setExtraction] = useState<any>(null)
  const [transcript, setTranscript] = useState('')

  // Live RFIs & T&M Data
  const [rfis, setRfis] = useState<RfiItem[]>([])
  const [tmTickets, setTmTickets] = useState<TmTicketItem[]>([])
  const [rfiFilter, setRfiFilter] = useState<'ALL' | 'OPEN' | 'ANSWERED'>('ALL')
  const [selectedRfi, setSelectedRfi] = useState<RfiItem | null>(null)
  const [rfiResponseText, setRfiResponseText] = useState('')

  // T&M Sign modal
  const [signingTicket, setSigningTicket] = useState<TmTicketItem | null>(null)
  const [signerName, setSignerName] = useState('Mark Weber (Owner Representative)')

  // KONSTRUXIO Interactive Copilot Chat
  const [copilotPrompt, setCopilotPrompt] = useState('')
  const [copilotChatHistory, setCopilotChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: "Hello! I'm your KONSTRUXIO operational construction AI copilot. You can dictate site notes, capture RFIs, generate T&M tickets for extra work, or ask me to draft owner reports from today's field logs."
    }
  ])

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<BlobPart[]>([])

  useEffect(() => {
    if (projectId) {
      loadRfisAndTm()
    }
  }, [projectId])

  async function loadRfisAndTm() {
    try {
      const [rfiList, tmList] = await Promise.all([
        api.rfis(projectId),
        api.tmTickets(projectId)
      ])
      setRfis(rfiList)
      setTmTickets(tmList)
    } catch (e: any) {
      // ignore if empty
    }
  }

  // Audio Recording
  async function startRecording() {
    setError('')
    setSuccess('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      mediaRecorder.current = recorder
      audioChunks.current = []

      recorder.ondataavailable = e => {
        if (e.data.size) audioChunks.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunks.current, { type: mime })
        const file = new File([blob], `konstruxio-note-${Date.now()}.webm`, { type: mime })
        setBusy(true)
        try {
          const res = await api.analyzeVoiceAudio(file, language)
          setTranscript(res.transcript)
          setExtraction(res.extraction)
        } catch (err: any) {
          setError(err.message || 'Failed to process voice recording')
        } finally {
          setBusy(false)
        }
      }

      recorder.start()
      setRecording(true)
    } catch (err: any) {
      setError('Microphone access denied or unavailable in this browser.')
    }
  }

  function stopRecording() {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop()
      setRecording(false)
    }
  }

  async function analyzeTypedNote(customText?: string) {
    const textToAnalyze = (customText || textInput).trim()
    if (!textToAnalyze) return
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const res = await api.analyzeVoiceText(textToAnalyze)
      setTranscript(textToAnalyze)
      setExtraction(res.extraction)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze field note')
    } finally {
      setBusy(false)
    }
  }

  async function commitActions() {
    if (!projectId || !extraction) return
    setBusy(true)
    setError('')
    try {
      const res = await api.commitVoiceActions({
        projectId,
        ...extraction
      })
      const items = []
      if (res.rfisCreated) items.push(`${res.rfisCreated} RFI(s)`)
      if (res.tmTicketsCreated) items.push(`${res.tmTicketsCreated} T&M ticket(s)`)
      if (res.tasksCreated) items.push(`${res.tasksCreated} task(s)`)
      if (res.issuesCreated) items.push(`${res.issuesCreated} defect(s)`)
      if (res.reportSaved) items.push(`daily log updated`)

      setSuccess(`Committed to project successfully: ${items.join(', ') || 'All records saved'}!`)
      setExtraction(null)
      setTextInput('')
      setTranscript('')
      await loadRfisAndTm()
      onDataChanged()
    } catch (err: any) {
      setError(err.message || 'Failed to commit actions')
    } finally {
      setBusy(false)
    }
  }

  async function submitRfiResponse(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRfi?.id || !rfiResponseText.trim()) return
    setBusy(true)
    try {
      await api.respondRfi(projectId, selectedRfi.id, rfiResponseText.trim(), 'ANSWERED')
      setSuccess(`RFI ${selectedRfi.rfiNumber} answered and closed!`)
      setSelectedRfi(null)
      setRfiResponseText('')
      await loadRfisAndTm()
      onDataChanged()
    } catch (err: any) {
      setError(err.message || 'Failed to respond to RFI')
    } finally {
      setBusy(false)
    }
  }

  async function approveTmTicket() {
    if (!signingTicket?.id) return
    setBusy(true)
    try {
      await api.signTmTicket(projectId, signingTicket.id, signerName)
      setSuccess(`T&M Ticket ${signingTicket.ticketNumber} digitally signed & approved for billing ($${signingTicket.estimatedCost.toFixed(2)})!`)
      setSigningTicket(null)
      await loadRfisAndTm()
      onDataChanged()
    } catch (err: any) {
      setError(err.message || 'Failed to sign T&M ticket')
    } finally {
      setBusy(false)
    }
  }

  async function askCopilot(e: React.FormEvent) {
    e.preventDefault()
    if (!copilotPrompt.trim()) return
    const userMsg = copilotPrompt.trim()
    setCopilotPrompt('')
    setCopilotChatHistory(prev => [...prev, { role: 'user', text: userMsg }])
    setBusy(true)
    try {
      const res = await api.chat(`[KONSTRUXIO AI OPERATIONAL ASSISTANT] As the KONSTRUXIO field copilot for this project, answer this superintendent query clearly and actionably:\n${userMsg}`)
      setCopilotChatHistory(prev => [...prev, { role: 'assistant', text: res.answer }])
    } catch (err: any) {
      setCopilotChatHistory(prev => [...prev, { role: 'assistant', text: 'Error connecting to AI: ' + err.message }])
    } finally {
      setBusy(false)
    }
  }

  // Pre-configured live presets
  const presets = [
    {
      title: 'MEP vs Structural Clash (RFI)',
      badge: 'RFI Capture',
      color: '#0284c7',
      text: 'Supply air duct 600x400 clashes with structural steel primary beam flange at Grid C-4 on Level 2. Need architect confirmation on whether we can transition to twin 250mm low-profile rectangular ducts or sleeve the beam web.'
    },
    {
      title: 'Server Room Extra Work (T&M Ticket)',
      badge: 'T&M Extra Work',
      color: '#d97706',
      text: 'Client representative Mark Weber requested on-site that we relocate electrical conduit and install 4 dedicated 20A power drops in the Level 3 server room. Took 2 journeyman electricians 4.5 hours each, plus 65m of 1-inch EMT conduit and 4 industrial duplex receptacles.'
    },
    {
      title: 'Multilingual Field Log (Deutsch)',
      badge: 'Multi-Language',
      color: '#16a34a',
      text: 'Heute 14 Mann auf der Baustelle. Betonage für Stützen C1 bis C6 im 3. OG erfolgreich abgeschlossen. Lieferung von Trockenbauplatten verzögert sich bis Donnerstag wegen Straßensperrung. Sicherheitsbegehung ohne Mängel.'
    },
    {
      title: 'Firestop & Pipe Takeoff (Quantities)',
      badge: 'Voice Takeoff',
      color: '#9333ea',
      text: 'Counted 28 fire damper intumescent collars needed on Level 4 north corridor, 140 linear meters of 4-inch PVC drain pipe, and 45 acoustic baffle ceiling tiles for inspection signoff.'
    }
  ]

  const totalBillableTm = tmTickets.reduce((acc, t) => acc + (t.status === 'APPROVED' ? Number(t.estimatedCost || 0) : 0), 0)
  const totalPendingTm = tmTickets.reduce((acc, t) => acc + (t.status !== 'APPROVED' ? Number(t.estimatedCost || 0) : 0), 0)
  const openRfiCount = rfis.filter(r => r.status === 'OPEN').length

  const filteredRfis = rfis.filter(r => {
    if (rfiFilter === 'OPEN') return r.status === 'OPEN'
    if (rfiFilter === 'ANSWERED') return r.status === 'ANSWERED' || r.status === 'CLOSED'
    return true
  })

  return (
    <div className="panel konstruxioPanel" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* KONSTRUXIO Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        padding: '24px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: '#0ea5e9',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1px'
            }}>
              KONSTRUXIO AI SUITE
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Next-Generation Field Copilot</span>
          </div>
          <h2 style={{ margin: '8px 0 4px', font: '800 22px Manrope', letterSpacing: '-0.5px' }}>
            Voice Jobsite Capture &amp; Operational Agent
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
            Capture RFIs, T&amp;M Extra Work tickets, daily reports, and blueprint pins effortlessly by voice in any language.
          </p>
        </div>

        {/* Live Metrics Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>ACTIVE RFIs</span>
            <b style={{ color: openRfiCount > 0 ? '#f59e0b' : '#10b981', fontSize: '16px' }}>{openRfiCount} Open</b>
          </div>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>APPROVED T&amp;M REVENUE</span>
            <b style={{ color: '#10b981', fontSize: '16px' }}>${totalBillableTm.toLocaleString()}</b>
          </div>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>PENDING T&amp;M</span>
            <b style={{ color: '#38bdf8', fontSize: '16px' }}>${totalPendingTm.toLocaleString()}</b>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
        padding: '0 18px',
        gap: '8px'
      }}>
        {[
          { id: 'dictate', label: '🎙️ Voice Capture & Field Station', count: null },
          { id: 'rfis', label: '❓ Engineering RFIs', count: openRfiCount },
          { id: 'tmtickets', label: '💰 Time & Material (T&M) Extra Work', count: tmTickets.length },
          { id: 'copilot', label: '🤖 Ask KONSTRUXIO Copilot', count: null }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubView(tab.id as SubView)}
            style={{
              padding: '14px 18px',
              border: 0,
              background: 'transparent',
              font: subView === tab.id ? '700 13px Manrope' : '500 13px DM Sans',
              color: subView === tab.id ? '#0284c7' : '#64748b',
              borderBottom: subView === tab.id ? '3px solid #0284c7' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {tab.label}
            {tab.count !== null && (
              <span style={{
                background: subView === tab.id ? '#e0f2fe' : '#e2e8f0',
                color: subView === tab.id ? '#0284c7' : '#475569',
                padding: '2px 7px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Body */}
      <div style={{ padding: '24px' }}>
        {error && <div className="error banner">{error}<button onClick={() => setError('')}>×</button></div>}
        {success && <div className="success banner">{success}<button onClick={() => setSuccess('')}>×</button></div>}

        {/* SUBVIEW 1: DICTATE */}
        {subView === 'dictate' && (
          <div>
            {/* Quick Demo Presets */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Sparkles size={16} color="#0284c7" />
                <span style={{ font: '700 13px Manrope', color: '#1e293b' }}>
                  KONSTRUXIO Live Field Scenarios (Click to test extraction):
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {presets.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setTextInput(p.text)
                      analyzeTypedNote(p.text)
                    }}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = p.color)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <b style={{ fontSize: '13px', color: '#0f172a' }}>{p.title}</b>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: `${p.color}18`, color: p.color }}>
                        {p.badge}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      &ldquo;{p.text}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dictation Box */}
            <div style={{
              background: '#f1f5f9',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {!recording ? (
                    <button
                      type="button"
                      className="primary"
                      onClick={startRecording}
                      disabled={busy || !projectId}
                      style={{ background: '#0284c7' }}
                    >
                      <Mic size={18} /> Start Voice Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="danger pulsing"
                      onClick={stopRecording}
                      style={{ background: '#ef4444', color: 'white', padding: '12px 18px', borderRadius: '8px', border: 0, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Square size={18} /> Stop &amp; Analyze Speech
                    </button>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <Globe size={16} color="#64748b" />
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      disabled={recording}
                      style={{ border: 0, background: 'transparent', outline: 'none', font: '600 12px DM Sans', color: '#1e293b' }}
                    >
                      <option value="en">English (US/UK)</option>
                      <option value="de">Deutsch (German)</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="fr">Français (French)</option>
                      <option value="pl">Polski (Polish)</option>
                      <option value="ro">Română (Romanian)</option>
                      <option value="tr">Türkçe (Turkish)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>

                <small style={{ color: '#64748b', fontSize: '11px' }}>
                  ⚡ Auto-structures speech into RFIs, T&amp;M tickets, tasks, defects &amp; daily logs.
                </small>
              </div>

              {/* Text Input Fallback */}
              <div>
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Or type/paste raw field observations, clash notes, or client verbal requests here..."
                  rows={3}
                  disabled={recording || busy}
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="secondary compact"
                    onClick={() => analyzeTypedNote()}
                    disabled={busy || !textInput.trim() || !projectId}
                  >
                    <Sparkles size={15} /> Analyze Field Observation
                  </button>
                </div>
              </div>
            </div>

            {busy && (
              <div style={{ padding: '30px', textAlign: 'center', color: '#0284c7' }}>
                <Loader2 className="spinner" size={28} style={{ margin: '0 auto 10px' }} />
                <b>Transcribing &amp; Parsing with KONSTRUXIO Construction Agent...</b>
              </div>
            )}

            {/* Extraction Review Card */}
            {extraction && (
              <div style={{
                marginTop: '24px',
                border: '2px solid #0284c7',
                borderRadius: '14px',
                background: '#ffffff',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(2, 132, 199, 0.08)'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: 'white',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ font: '800 16px Manrope' }}>⚡ KONSTRUXIO AI Structured Extraction</div>
                    <small style={{ color: '#e0f2fe' }}>
                      Transcribed: &ldquo;{transcript}&rdquo;
                    </small>
                    {extraction.detectedLanguage && extraction.detectedLanguage !== 'en' && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#bae6fd' }}>
                        🌐 Auto-translated from {extraction.detectedLanguage.toUpperCase()} &rarr; Professional Contractor English
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="primary"
                    onClick={commitActions}
                    disabled={busy}
                    style={{ background: '#10b981', border: 0 }}
                  >
                    <CheckCircle2 size={18} /> Approve &amp; Commit All to Project
                  </button>
                </div>

                <div style={{ padding: '20px', display: 'grid', gap: '16px' }}>
                  {/* RFIs Detected */}
                  {extraction.rfis?.length > 0 && (
                    <div style={{ border: '1px solid #bae6fd', background: '#f0f9ff', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>
                        <FileQuestion size={16} /> Detected Engineering RFIs ({extraction.rfis.length})
                      </div>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {extraction.rfis.map((rfi: any, idx: number) => (
                          <div key={idx} style={{ background: 'white', border: '1px solid #e0f2fe', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <b style={{ color: '#0369a1', fontSize: '13px' }}>{rfi.rfiNumber || `RFI-${idx + 1}`}: {rfi.title}</b>
                              <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0284c7', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                {rfi.discipline || 'Engineering'}
                              </span>
                            </div>
                            <p style={{ margin: '6px 0', fontSize: '12px', color: '#334155' }}>{rfi.question}</p>
                            {rfi.suggestedSolution && (
                              <small style={{ display: 'block', color: '#0284c7', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px' }}>
                                💡 Suggested Fix: {rfi.suggestedSolution}
                              </small>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* T&M Extra Work Detected */}
                  {extraction.tmTickets?.length > 0 && (
                    <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>
                        <DollarSign size={16} /> Detected Time &amp; Material (T&amp;M) Extra Work ({extraction.tmTickets.length})
                      </div>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {extraction.tmTickets.map((tm: any, idx: number) => (
                          <div key={idx} style={{ background: 'white', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <b style={{ color: '#92400e', fontSize: '13px' }}>{tm.ticketNumber || `TM-${idx + 1}`}: {tm.title}</b>
                              <b style={{ color: '#16a34a', fontSize: '14px' }}>
                                ${Number(tm.estimatedCost || 0).toLocaleString()}
                              </b>
                            </div>
                            <small style={{ display: 'block', color: '#78350f', margin: '4px 0' }}>
                              <b>Directive:</b> {tm.clientDirective} · <b>Trade:</b> {tm.trade}
                            </small>
                            <p style={{ margin: '4px 0', fontSize: '11px', color: '#451a03' }}>
                              <b>Labor:</b> {tm.laborHours} | <b>Materials:</b> {tm.materialsUsed}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Daily Report Draft */}
                  {extraction.dailyReport && (
                    <div style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>
                        <Calendar size={16} /> Daily Site Log Draft
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px' }}>
                        <div><b>Weather:</b> {extraction.dailyReport.weather || 'Normal'}</div>
                        <div><b>Headcount:</b> {extraction.dailyReport.workersCount || 10} workers</div>
                        <div style={{ gridColumn: '1 / -1' }}><b>Work Completed:</b> {extraction.dailyReport.workCompleted}</div>
                        {extraction.dailyReport.blockers && (
                          <div style={{ gridColumn: '1 / -1', color: '#b91c1c' }}><b>Blockers:</b> {extraction.dailyReport.blockers}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tasks & Defects Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Tasks */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                      <b style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ClipboardList size={15} /> Action Tasks ({extraction.tasks?.length || 0})
                      </b>
                      <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                        {extraction.tasks?.map((t: any, i: number) => (
                          <div key={i} style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '11px' }}>
                            <b>{t.title}</b> <span className={`badge ${t.priority?.toLowerCase()}`}>{t.priority}</span>
                          </div>
                        ))}
                        {!extraction.tasks?.length && <small style={{ color: '#94a3b8' }}>None detected</small>}
                      </div>
                    </div>

                    {/* Defects */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                      <b style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={15} color="#ef4444" /> Defects &amp; Hazards ({extraction.issues?.length || 0})
                      </b>
                      <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                        {extraction.issues?.map((iss: any, i: number) => (
                          <div key={i} style={{ background: '#fef2f2', padding: '8px', borderRadius: '6px', fontSize: '11px' }}>
                            <b>{iss.title}</b> <span className={`badge ${iss.severity?.toLowerCase()}`}>{iss.severity}</span>
                          </div>
                        ))}
                        {!extraction.issues?.length && <small style={{ color: '#94a3b8' }}>None detected</small>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 2: RFIS HUB */}
        {subView === 'rfis' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, font: '800 18px Manrope' }}>Engineering RFIs (Requests for Information)</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Track technical questions, MEP/structural clashes, and architectural clarifications generated directly from field dictations.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['ALL', 'OPEN', 'ANSWERED'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRfiFilter(f)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: rfiFilter === f ? '#0284c7' : 'white',
                      color: rfiFilter === f ? 'white' : '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {filteredRfis.map(rfi => (
                <div
                  key={rfi.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: rfi.status === 'OPEN' ? '4px solid #f59e0b' : '4px solid #10b981',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ font: '800 13px Manrope', color: '#0369a1' }}>{rfi.rfiNumber}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: rfi.status === 'OPEN' ? '#fef3c7' : '#dcfce7',
                          color: rfi.status === 'OPEN' ? '#b45309' : '#15803d'
                        }}>
                          {rfi.status}
                        </span>
                        {rfi.trade && <span style={{ fontSize: '11px', color: '#64748b' }}>Trade: {rfi.trade}</span>}
                      </div>
                      <h4 style={{ margin: '6px 0 0', font: '700 15px Manrope', color: '#0f172a' }}>{rfi.title}</h4>
                    </div>

                    {rfi.status === 'OPEN' && (
                      <button
                        type="button"
                        className="secondary compact"
                        onClick={() => {
                          setSelectedRfi(rfi)
                          setRfiResponseText('')
                        }}
                      >
                        <PenTool size={14} /> Respond as Architect / Engineer
                      </button>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                    {rfi.question}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b', flexWrap: 'wrap' }}>
                    {rfi.drawingReference && <span><b>Drawing Ref:</b> {rfi.drawingReference}</span>}
                    {rfi.discipline && <span><b>Discipline:</b> {rfi.discipline}</span>}
                    {rfi.scheduleImpact && <span style={{ color: '#b91c1c' }}><b>⚠️ Schedule Impact:</b> Yes</span>}
                    {rfi.costImpact && <span style={{ color: '#b91c1c' }}><b>💰 Cost Impact:</b> Yes</span>}
                  </div>

                  {rfi.suggestedSolution && (
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#0369a1' }}>
                      <b>Suggested Contractor Solution:</b> {rfi.suggestedSolution}
                    </div>
                  )}

                  {rfi.officialResponse && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#166534' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, marginBottom: '4px' }}>
                        <ShieldCheck size={15} /> Official Architectural / Engineering Clarification:
                      </div>
                      <p style={{ margin: 0 }}>{rfi.officialResponse}</p>
                    </div>
                  )}
                </div>
              ))}
              {!filteredRfis.length && <p className="empty">No RFIs found in this category.</p>}
            </div>

            {/* Respond Modal */}
            {selectedRfi && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                display: 'grid',
                placeItems: 'center',
                zIndex: 9999,
                padding: '20px'
              }}>
                <div style={{ background: 'white', padding: '24px', borderRadius: '14px', width: 'min(100%, 540px)', display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, font: '800 16px Manrope' }}>
                      Official Engineering Response · {selectedRfi.rfiNumber}
                    </h3>
                    <button type="button" onClick={() => setSelectedRfi(null)} style={{ border: 0, background: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}><b>Question:</b> {selectedRfi.question}</p>
                  <form onSubmit={submitRfiResponse} style={{ display: 'grid', gap: '12px' }}>
                    <textarea
                      required
                      rows={4}
                      value={rfiResponseText}
                      onChange={e => setRfiResponseText(e.target.value)}
                      placeholder="Enter official architectural instruction or approved substitution..."
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="button" className="secondary compact" onClick={() => setSelectedRfi(null)}>Cancel</button>
                      <button type="submit" className="primary compact" disabled={busy}>
                        <ShieldCheck size={15} /> {busy ? 'Submitting…' : 'Approve & Close RFI'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 3: TIME & MATERIAL (T&M) EXTRA WORK */}
        {subView === 'tmtickets' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, font: '800 18px Manrope' }}>Time &amp; Material (T&amp;M) Extra Work Tickets</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Protect contractor revenue by instantly capturing out-of-scope work requested in the field, with labor, materials, and 1-click owner signoff.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {tmTickets.map(ticket => (
                <div
                  key={ticket.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: ticket.status === 'APPROVED' ? '4px solid #10b981' : '4px solid #f59e0b',
                    borderRadius: '10px',
                    padding: '18px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ font: '800 14px Manrope', color: '#b45309' }}>{ticket.ticketNumber}</span>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: ticket.status === 'APPROVED' ? '#dcfce7' : '#fef3c7',
                          color: ticket.status === 'APPROVED' ? '#15803d' : '#b45309'
                        }}>
                          {ticket.status === 'APPROVED' ? 'APPROVED FOR BILLING' : 'PENDING CLIENT SIGNOFF'}
                        </span>
                        {ticket.trade && <span style={{ fontSize: '11px', color: '#64748b' }}>Trade: {ticket.trade}</span>}
                      </div>
                      <h4 style={{ margin: '6px 0 0', font: '700 16px Manrope', color: '#0f172a' }}>{ticket.title}</h4>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Billable Amount</span>
                      <b style={{ fontSize: '18px', color: '#16a34a' }}>
                        ${Number(ticket.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </b>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', display: 'grid', gap: '6px' }}>
                    <div><b>Client Directive / Authority:</b> {ticket.clientDirective || 'Verbal on-site request'}</div>
                    <div><b>Labor Breakdown:</b> {ticket.laborHours || 'Standard rate applied'}</div>
                    <div><b>Materials Installed:</b> {ticket.materialsUsed || 'Standard site materials'}</div>
                  </div>

                  {ticket.status === 'APPROVED' ? (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '12px' }}>
                        <UserCheck size={16} />
                        <span><b>Digitally Approved &amp; Signed By:</b> {ticket.signedBy}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#15803d', fontFamily: 'monospace', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                        SIG: {ticket.customerSignature || 'VERIFIED'}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="primary compact"
                        onClick={() => setSigningTicket(ticket)}
                        style={{ background: '#0284c7' }}
                      >
                        <PenTool size={14} /> ✍️ Digital Owner Sign-Off (${ticket.estimatedCost})
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!tmTickets.length && <p className="empty">No T&amp;M tickets logged yet.</p>}
            </div>

            {/* Sign Modal */}
            {signingTicket && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                display: 'grid',
                placeItems: 'center',
                zIndex: 9999,
                padding: '20px'
              }}>
                <div style={{ background: 'white', padding: '26px', borderRadius: '16px', width: 'min(100%, 500px)', display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, font: '800 17px Manrope' }}>
                      Owner Digital Sign-Off · {signingTicket.ticketNumber}
                    </h3>
                    <button type="button" onClick={() => setSigningTicket(null)} style={{ border: 0, background: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>
                    By signing, the owner representative authorizes billing for: <br />
                    <b>{signingTicket.title}</b> for an amount of <b>${signingTicket.estimatedCost.toFixed(2)}</b>.
                  </p>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                      SIGNER NAME &amp; TITLE
                    </label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={e => setSignerName(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '16px', textAlign: 'center', background: '#f8fafc' }}>
                    <div style={{ font: 'italic 20px "DM Sans", cursive', color: '#0369a1' }}>
                      {signerName}
                    </div>
                    <small style={{ color: '#94a3b8', fontSize: '10px' }}>Digital Cryptographic Signature Stamp</small>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" className="secondary compact" onClick={() => setSigningTicket(null)}>Cancel</button>
                    <button type="button" className="primary compact" onClick={approveTmTicket} disabled={busy || !signerName.trim()}>
                      <ShieldCheck size={15} /> Confirm &amp; Sign Ticket
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBVIEW 4: "KONSTRUXIO" COPILOT CHAT */}
        {subView === 'copilot' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, font: '800 18px Manrope' }}>Operational Copilot KONSTRUXIO</h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                Your autonomous field assistant. Ask KONSTRUXIO to draft formal owner reports, catch unbilled extra work, or review engineering drawings.
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {[
                "Generate today's complete Daily Construction Report from all voice notes",
                'Audit project logs for any unbilled extra work and propose T&M claims',
                'What are the cold weather concrete pour limitations on this project?',
                'Draft formal RFI for structural engineer regarding beam clash'
              ].map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setCopilotPrompt(prompt)
                  }}
                >
                  💡 {prompt}
                </button>
              ))}
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px',
              minHeight: '280px',
              maxHeight: '440px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {copilotChatHistory.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: msg.role === 'user' ? '#0284c7' : '#ffffff',
                    color: msg.role === 'user' ? '#ffffff' : '#1e293b',
                    border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0284c7', fontWeight: 800, fontSize: '11px', marginBottom: '4px' }}>
                      <Sparkles size={13} /> KONSTRUXIO COPILOT
                    </div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={askCopilot} style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <input
                type="text"
                required
                value={copilotPrompt}
                onChange={e => setCopilotPrompt(e.target.value)}
                placeholder="Ask KONSTRUXIO… e.g. Check if we need customer approval for electrical conduit relocation"
                style={{ flex: 1 }}
                disabled={busy}
              />
              <button type="submit" className="primary" disabled={busy || !copilotPrompt.trim()}>
                <Send size={16} /> {busy ? 'Thinking…' : 'Send to Copilot'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
