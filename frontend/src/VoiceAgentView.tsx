import { useState, useRef } from 'react'
import { api } from './api'
import { Mic, Square, Sparkles, CheckCircle2, AlertTriangle, ClipboardList, Calendar, Loader2, RefreshCw } from 'lucide-react'

export function VoiceAgentView({ projectId, onActionsCommitted }: { projectId: string; onActionsCommitted: () => void }) {
  const [recording, setRecording] = useState(false)
  const [language, setLanguage] = useState('en')
  const [textInput, setTextInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [extraction, setExtraction] = useState<any>(null)
  const [transcript, setTranscript] = useState('')

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<BlobPart[]>([])

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
        const file = new File([blob], `field-note-${Date.now()}.webm`, { type: mime })
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

  async function analyzeTypedNote() {
    if (!textInput.trim()) return
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const res = await api.analyzeVoiceText(textInput.trim())
      setTranscript(textInput.trim())
      setExtraction(res.extraction)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze text note')
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
      setSuccess(`Committed successfully! ${res.tasksCreated} tasks, ${res.issuesCreated} issues created${res.reportSaved ? ', and daily log updated' : ''}.`)
      setExtraction(null)
      setTextInput('')
      setTranscript('')
      onActionsCommitted()
    } catch (err: any) {
      setError(err.message || 'Failed to commit actions')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel voiceAgentPanel">
      <div className="panelHead">
        <div>
          <h3>Voice-to-Action Field Agent</h3>
          <p>Dictate your site observations naturally. AI extracts daily logs, tasks, and safety issues for your review.</p>
        </div>
      </div>

      {error && <div className="error banner">{error}<button onClick={() => setError('')}>×</button></div>}
      {success && <div className="success banner">{success}<button onClick={() => setSuccess('')}>×</button></div>}

      <div className="dictateControls">
        <div className="recButtonRow">
          {!recording ? (
            <button className="primary recordBtn" onClick={startRecording} disabled={busy || !projectId}>
              <Mic size={20} /> Start Field Dictation
            </button>
          ) : (
            <button className="danger recordBtn pulsing" onClick={stopRecording}>
              <Square size={20} /> Stop &amp; Analyze Dictation
            </button>
          )}

          <select className="voiceLanguage" value={language} onChange={e => setLanguage(e.target.value)} disabled={recording}>
            <option value="en">English (US/UK)</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>

        <div className="orDivider"><span>OR TYPE / PASTE FIELD OBSERVATION</span></div>

        <div className="textNoteRow">
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="e.g. Poured Level 2 slab today, 12 workers on site. Drywall delivery delayed until Thursday. Safety issue: missing guardrails around elevator core."
            rows={3}
            disabled={recording || busy}
          />
          <button className="secondary compact" onClick={analyzeTypedNote} disabled={busy || !textInput.trim() || !projectId}>
            <Sparkles size={16} /> Analyze Field Note
          </button>
        </div>
      </div>

      {busy && (
        <div className="busyBox">
          <Loader2 className="spinner" size={26} />
          <p>Transcribing &amp; extracting structured construction actions with AI...</p>
        </div>
      )}

      {extraction && (
        <div className="reviewActionCard">
          <div className="reviewHead">
            <div>
              <h4>AI Field Extraction Review</h4>
              <small>Original Dictation: &ldquo;{transcript}&rdquo;</small>
            </div>
            <button className="primary" onClick={commitActions} disabled={busy}>
              <CheckCircle2 size={18} /> Approve &amp; Commit to Project
            </button>
          </div>

          <div className="extractionGrid">
            {/* Daily Log Review */}
            {extraction.dailyReport && (
              <div className="extractSection">
                <h5><Calendar size={16} /> Daily Site Log Draft</h5>
                <div className="fieldGroup">
                  <label>Weather: <span>{extraction.dailyReport.weather || 'Normal'}</span></label>
                  <label>Headcount: <span>{extraction.dailyReport.workersCount || 8} workers</span></label>
                  <label>Work Completed: <p>{extraction.dailyReport.workCompleted || 'None reported'}</p></label>
                  {extraction.dailyReport.blockers && <label>Blockers: <p className="warnText">{extraction.dailyReport.blockers}</p></label>}
                  {extraction.dailyReport.safetyNotes && <label>Safety: <p className="safeText">{extraction.dailyReport.safetyNotes}</p></label>}
                </div>
              </div>
            )}

            {/* Tasks Review */}
            <div className="extractSection">
              <h5><ClipboardList size={16} /> Detected Tasks ({extraction.tasks?.length || 0})</h5>
              {extraction.tasks?.length ? (
                <div className="itemList">
                  {extraction.tasks.map((t: any, i: number) => (
                    <div key={i} className="extractItem">
                      <b>{t.title}</b>
                      <span className={`badge ${t.priority?.toLowerCase()}`}>{t.priority}</span>
                      {t.description && <small>{t.description}</small>}
                    </div>
                  ))}
                </div>
              ) : <p className="emptySmall">No action tasks detected in dictation.</p>}
            </div>

            {/* Issues Review */}
            <div className="extractSection">
              <h5><AlertTriangle size={16} /> Detected Defects &amp; Hazards ({extraction.issues?.length || 0})</h5>
              {extraction.issues?.length ? (
                <div className="itemList">
                  {extraction.issues.map((iss: any, i: number) => (
                    <div key={i} className="extractItem hazard">
                      <b>{iss.title}</b>
                      <span className={`badge ${iss.severity?.toLowerCase()}`}>{iss.severity}</span>
                      <small>Trade: {iss.trade || 'General'} · Loc: {iss.locationReference || 'Site'}</small>
                    </div>
                  ))}
                </div>
              ) : <p className="emptySmall">No safety or defect items flagged.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
