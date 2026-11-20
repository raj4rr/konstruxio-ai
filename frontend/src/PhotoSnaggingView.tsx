import { useState, useEffect } from 'react'
import { api } from './api'
import { Camera, Sparkles, CheckCircle2, AlertTriangle, Plus, Loader2 } from 'lucide-react'

export function PhotoSnaggingView({ projectId }: { projectId: string }) {
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [tradeHint, setTradeHint] = useState('Safety')
  const [userNotes, setUserNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [issues, setIssues] = useState<any[]>([])

  async function loadIssues() {
    if (!projectId) return
    try {
      const data = await api.issues(projectId)
      setIssues(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadIssues()
  }, [projectId])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setDiagnosis(null)
    }
  }

  async function analyzePhoto() {
    if (!photoFile && !userNotes.trim()) return
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const result = await api.analyzeInspectionPhoto(photoFile, tradeHint, userNotes)
      setDiagnosis(result)
    } catch (err: any) {
      setError(err.message || 'Inspection analysis failed')
    } finally {
      setBusy(false)
    }
  }

  async function logIssue() {
    if (!projectId || !diagnosis) return
    setBusy(true)
    setError('')
    try {
      await api.createInspectionIssue({
        projectId,
        title: diagnosis.title,
        description: diagnosis.description,
        severity: diagnosis.severity || 'MEDIUM',
        trade: diagnosis.trade || tradeHint,
        locationReference: diagnosis.locationReference || 'Site',
        photoData: diagnosis.photoData || previewUrl,
        aiSuggestion: diagnosis.suggestedRemediation
      })
      setSuccess('Inspection defect logged to site punch list!')
      setDiagnosis(null)
      setPhotoFile(null)
      setPreviewUrl('')
      setUserNotes('')
      await loadIssues()
    } catch (err: any) {
      setError(err.message || 'Failed to log defect')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel photoSnagPanel">
      <div className="panelHead">
        <div>
          <h3>Smart Photo Snagging &amp; AI Inspection</h3>
          <p>Snap or upload photos of site conditions. AI analyzes defect severity, trade responsibility, and corrective remediation.</p>
        </div>
      </div>

      {error && <div className="error banner">{error}<button onClick={() => setError('')}>×</button></div>}
      {success && <div className="success banner">{success}<button onClick={() => setSuccess('')}>×</button></div>}

      <div className="snagInputContainer">
        <div className="snagUploadBox">
          {previewUrl ? (
            <div className="photoPreview">
              <img src={previewUrl} alt="Inspection capture" />
              <button className="changePhotoBtn" onClick={() => { setPhotoFile(null); setPreviewUrl('') }}>Change Photo</button>
            </div>
          ) : (
            <label className="uploadDropzone">
              <Camera size={38} />
              <b>Snap or Upload Inspection Photo</b>
              <span>Supports JPEG, PNG, or Camera Capture (under 12 MB)</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
            </label>
          )}
        </div>

        <div className="snagForm">
          <label>Responsible Trade / Category
            <select value={tradeHint} onChange={e => setTradeHint(e.target.value)}>
              <option value="Safety">Safety / OSHA</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="HVAC">HVAC &amp; Mechanical</option>
              <option value="Structural">Concrete &amp; Structural</option>
              <option value="Finishes">Drywall &amp; Finishes</option>
              <option value="Carpentry">Carpentry &amp; Framing</option>
            </select>
          </label>

          <label>Field Observation / Location Hint
            <textarea
              value={userNotes}
              onChange={e => setUserNotes(e.target.value)}
              placeholder="e.g. Unprotected edge on 3rd floor balcony, no tie-off point or guardrails installed."
              rows={3}
            />
          </label>

          <button className="primary" onClick={analyzePhoto} disabled={busy || (!photoFile && !userNotes.trim()) || !projectId}>
            <Sparkles size={16} /> Run AI Defect Analysis
          </button>
        </div>
      </div>

      {busy && (
        <div className="busyBox">
          <Loader2 className="spinner" size={26} />
          <p>Running OCR and safety compliance diagnostics on inspection photo...</p>
        </div>
      )}

      {diagnosis && (
        <div className="diagnosisCard">
          <div className="diagHead">
            <div>
              <span className={`badge ${diagnosis.severity?.toLowerCase()}`}>{diagnosis.severity}</span>
              <h4>{diagnosis.title}</h4>
              <small>Trade: {diagnosis.trade} · Area: {diagnosis.locationReference}</small>
            </div>
            <button className="primary" onClick={logIssue} disabled={busy}>
              <Plus size={16} /> Add to Project Punch List
            </button>
          </div>

          <p className="diagDesc">{diagnosis.description}</p>

          {diagnosis.suggestedRemediation && (
            <div className="remediationBox">
              <b>Recommended Remediation:</b>
              <p>{diagnosis.suggestedRemediation}</p>
            </div>
          )}
        </div>
      )}

      {/* Logged issues showcase */}
      <div className="loggedIssuesSection">
        <h4>Project Inspection Log ({issues.length} items)</h4>
        <div className="snagCardGrid">
          {issues.map(iss => (
            <div key={iss.id} className="snagCard">
              {iss.photoData ? (
                <img src={iss.photoData} alt={iss.title} className="snagThumb" />
              ) : (
                <div className="noPhotoThumb"><AlertTriangle size={24} /></div>
              )}
              <div className="snagCardBody">
                <div className="cardBadgeRow">
                  <span className={`badge ${iss.severity?.toLowerCase()}`}>{iss.severity}</span>
                  <span className="tradeBadge">{iss.trade || 'General'}</span>
                </div>
                <b>{iss.title}</b>
                <small>{iss.locationReference || 'Site'}</small>
                {iss.aiSuggestion && <p className="remediationSnippet">💡 {iss.aiSuggestion}</p>}
              </div>
            </div>
          ))}
          {!issues.length && <p className="empty">No inspection issues logged yet.</p>}
        </div>
      </div>
    </div>
  )
}
