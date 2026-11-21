import { useEffect, useState } from 'react'
import { api } from './api'
import {
  HardHat,
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  AlertTriangle,
  FileText,
  Sparkles,
  LogOut,
  Plus,
  Send,
  Mic,
  MapPin,
  Camera,
  BarChart3,
  Download,
  Zap
} from 'lucide-react'
import { VoiceAgentView } from './VoiceAgentView'
import { BlueprintView } from './BlueprintView'
import { PhotoSnaggingView } from './PhotoSnaggingView'
import { ExecutiveReportView } from './ExecutiveReportView'
import { KonstruxioCopilotView } from './KonstruxioCopilotView'
import { ProjectWalkthroughSlide } from './ProjectWalkthroughSlide'

type Project = { id: string; name: string; description?: string; location?: string; status: string }
type Tab =
  | 'overview'
  | 'copilot'
  | 'voice'
  | 'blueprints'
  | 'snagging'
  | 'executive'
  | 'projects'
  | 'tasks'
  | 'issues'
  | 'reports'
  | 'assistant'
  | 'documents'

export default function App() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const tokenParam = urlParams?.get('token')
  const tabParam = urlParams?.get('tab') as Tab | null
  if (tokenParam && typeof localStorage !== 'undefined') {
    localStorage.setItem('konstruxio_token', tokenParam)
  }

  const [auth, setAuth] = useState(!!(typeof localStorage !== 'undefined' && localStorage.getItem('konstruxio_token')))
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [form, setForm] = useState({ organizationName: '', fullName: '', email: '', password: '' })
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState('')
  const [tab, setTab] = useState<Tab>(tabParam || 'overview')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [chat, setChat] = useState(''); const [answer, setAnswer] = useState('')
  const [projectName, setProjectName] = useState(''); const [taskTitle, setTaskTitle] = useState('')
  const [issueTitle, setIssueTitle] = useState('')
  const [docs, setDocs] = useState<any[]>([])
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docQuestion, setDocQuestion] = useState('')
  const [docAnswer, setDocAnswer] = useState<any>(null)
  const [voiceLanguage, setVoiceLanguage] = useState('en')
  const [taskProposal, setTaskProposal] = useState('')

  const current = projects.find(p => p.id === selected)

  async function loadProjects() {
    const p = await api.projects()
    setProjects(p)
    if (p.length && !selected) setSelected(p[0].id)
  }

  useEffect(() => {
    if (auth) loadProjects().catch(e => setError(e.message))
  }, [auth])

  async function refreshData() {
    if (!auth || !selected) return
    try {
      if (tab === 'tasks') setItems(await api.tasks(selected))
      else if (tab === 'issues') setItems(await api.issues(selected))
      else if (tab === 'reports') setItems(await api.reports(selected))
      else if (tab === 'documents') setDocs(await api.documents(selected))
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    refreshData()
  }, [auth, selected, tab])

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = mode === 'register' ? await api.register(form) : await api.login(form)
      localStorage.setItem('konstruxio_token', r.token)
      setAuth(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    try {
      const p = await api.createProject({ name: projectName })
      setProjectName('')
      await loadProjects()
      setSelected(p.id)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.createTask({ projectId: selected, title: taskTitle })
      setTaskTitle('')
      setItems(await api.tasks(selected))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function createIssue(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.createIssue({ projectId: selected, title: issueTitle })
      setIssueTitle('')
      setItems(await api.issues(selected))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await api.chat(chat)
      setAnswer(r.answer)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function approveTask() {
    if (!selected || !taskProposal.trim()) return
    if (!window.confirm('Create this task in the selected project?')) return
    try {
      await api.createTask({ projectId: selected, title: taskProposal.trim() })
      setTaskProposal('')
      setError('Task created after your approval.')
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function uploadDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !docFile) return
    try {
      await api.uploadDocument(selected, docFile)
      setDocFile(null)
      setDocs(await api.documents(selected))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function loadSamplePdf() {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/sample-construction-specification.pdf')
      if (!res.ok) throw new Error('Could not fetch sample PDF: ' + res.statusText)
      const blob = await res.blob()
      const file = new File([blob], 'sample-construction-specification.pdf', { type: 'application/pdf' })
      await api.uploadDocument(selected, file)
      setDocs(await api.documents(selected))
      setError('Sample specification PDF successfully uploaded and indexed into pgvector!')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function askDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setBusy(true)
    try {
      setDocAnswer(await api.askDocuments(selected, docQuestion))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function loadDemoProject() {
    setBusy(true)
    setError('')
    try {
      localStorage.removeItem('konstruxio_token')
      const res = await api.seedDemo()
      if (res.token) {
        localStorage.setItem('konstruxio_token', res.token)
        setAuth(true)
      }
      await loadProjects()
      if (res.project?.id) {
        setSelected(res.project.id)
      }
      setTab('overview')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!auth) {
    return (
      <main className="auth">
        <div className="brand">
          <span className="brandIcon"><HardHat /></span>
          <div><b>KONSTRUXIO</b><small>AI CONSTRUCTION PLATFORM</small></div>
        </div>
        <form className="authCard" onSubmit={submitAuth}>
          <h1>{mode === 'register' ? 'Create your workspace' : 'Welcome back'}</h1>
          <p>Bring your construction projects into focus.</p>
          {mode === 'register' && (
            <>
              <label>Organization
                <input required value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} placeholder="Your construction company" />
              </label>
              <label>Your name
                <input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full name" />
              </label>
            </>
          )}
          <label>Email
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>Password
            <input type="password" minLength={10} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create workspace' : 'Sign in'}</button>
          <button type="button" className="link" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
            {mode === 'register' ? 'Already registered? Sign in' : 'Create an account'}
          </button>
          <div className="demoDivider"><span>OR INSTANT DEMO</span></div>
          <button type="button" className="secondary demoBtn" onClick={loadDemoProject} disabled={busy}>
            🚀 One-Click Demo (Pre-populated Project)
          </button>
        </form>
      </main>
    )
  }

  const nav: [Tab, string, any][] = [
    ['overview', 'Overview', LayoutDashboard],
    ['copilot', '⚡ KONSTRUXIO AI Suite', Sparkles],
    ['voice', 'Voice-to-Action', Mic],
    ['blueprints', 'Blueprints & Pins', MapPin],
    ['snagging', 'Photo Snagging', Camera],
    ['executive', 'Owner Reports & Weather', BarChart3],
    ['projects', 'Projects', FolderKanban],
    ['tasks', 'Tasks', ClipboardList],
    ['issues', 'Site issues', AlertTriangle],
    ['reports', 'Daily reports', FileText],
    ['documents', 'Documents & RAG', FileText],
    ['assistant', 'AI Assistant', Sparkles]
  ]

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandIcon"><HardHat /></span>
          <div><b>KONSTRUXIO</b><small>AI CONSTRUCTION</small></div>
        </div>
        <div className="workspace">WORKSPACE <span>●</span></div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sideBottom">
          <button onClick={() => { localStorage.removeItem('konstruxio_token'); setAuth(false) }}>
            <LogOut size={18} />Sign out
          </button>
          <small>Konstruxio AI · Next-Gen Field Operations</small>
        </div>
      </aside>

      <main className="main">
        <header>
          <div>
            <span className="eyebrow">CONSTRUCTION WORKSPACE</span>
            <h1>{nav.find(n => n[0] === tab)?.[1]}</h1>
          </div>
          <div className="projectSelect">
            <span>ACTIVE PROJECT</span>
            <select value={selected} onChange={e => setSelected(e.target.value)}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </header>

        {error && <div className="error banner">{error}<button onClick={() => setError('')}>×</button></div>}

        {/* 1. Overview */}
        {tab === 'overview' && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow light">YOUR SITE, IN SYNC</span>
                <h2>Build with clarity.<br />Move work forward.</h2>
                <p>Voice-first field dictation, spatial blueprint pinning, photo defect inspection, and automated owner reports.</p>
                <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
                  <a
                    href="/KONSTRUXIO_AI_Standard_Operating_Procedures.pdf"
                    download="KONSTRUXIO_AI_Standard_Operating_Procedures.pdf"
                    className="secondary compact"
                    style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> 📄 Download Complete SOP Manual (PDF)
                  </a>
                </div>
              </div>
              <div className="welcomeMark"><HardHat size={78} /></div>
            </section>
            <div className="stats">
              <article>
                <span>ACTIVE PROJECTS</span>
                <b>{projects.length}</b>
                <small>Across your workspace</small>
              </article>
              <article>
                <span>SELECTED PROJECT</span>
                <b className="statName">{current?.name || '—'}</b>
                <small>{current?.location || 'Choose a project'}</small>
              </article>
              <article>
                <span>WORKSPACE STATUS</span>
                <b className="online">● Ready</b>
                <small>Connected to Konstruxio API &amp; AI</small>
              </article>
            </div>
            {/* KONSTRUXIO Hero Feature Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              borderRadius: '14px',
              padding: '22px 26px',
              marginTop: '19px',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              cursor: 'pointer',
              border: '1px solid #334155',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }} onClick={() => setTab('copilot')}>
              <div style={{ maxWidth: '680px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ background: '#0284c7', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                    KONSTRUXIO AI SUITE
                  </span>
                  <span style={{ fontSize: '12px', color: '#38bdf8' }}>Next-Generation Field Copilot</span>
                </div>
                <h3 style={{ margin: '0 0 6px', font: '800 18px Manrope', color: 'white' }}>
                  Voice-to-RFI, T&amp;M Extra Work Billing &amp; Operational Field Copilot
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                  Dictate site observations in 8+ languages &rarr; instantly extract formal engineering RFIs, protect contractor revenue with Time &amp; Material tickets, and drop pins on blueprints.
                </p>
              </div>
              <button type="button" className="primary" style={{ background: '#0284c7', pointerEvents: 'none' }}>
                <Sparkles size={16} /> Open KONSTRUXIO Suite
              </button>
            </div>

            {/* Single-Slide Complete End-to-End Project Walkthrough (Minimal Clicks) */}
            <ProjectWalkthroughSlide onSelectTab={tabId => setTab(tabId)} />

            <div className="quickFeatureGrid">
              <div className="quickCard" onClick={() => setTab('voice')}>
                <div className="qIcon mic"><Mic size={22} /></div>
                <b>Field Voice Agent</b>
                <p>Dictate notes on site; AI generates daily logs, tasks &amp; hazards automatically.</p>
              </div>
              <div className="quickCard" onClick={() => setTab('blueprints')}>
                <div className="qIcon pin"><MapPin size={22} /></div>
                <b>Floor Plan Pinning</b>
                <p>Pin defects and tasks directly to 2D architectural drawings.</p>
              </div>
              <div className="quickCard" onClick={() => setTab('snagging')}>
                <div className="qIcon cam"><Camera size={22} /></div>
                <b>Photo Snagging</b>
                <p>Snap site photos for instant AI triage, severity rating, and remediation advice.</p>
              </div>
              <div className="quickCard" onClick={() => setTab('executive')}>
                <div className="qIcon rpt"><BarChart3 size={22} /></div>
                <b>Owner Reports &amp; Weather</b>
                <p>Live crane/concrete weather alerts and 1-click weekly executive PDFs.</p>
              </div>
            </div>
            <section className="panel" style={{ marginTop: '18px' }}>
              <div className="panelHead">
                <div>
                  <h3>Flagship Sample Project Data</h3>
                  <p>Load the complete &ldquo;Skyline Meridian Tower&rdquo; sample with pre-populated tasks, site defects, blueprint pins, and daily reports.</p>
                </div>
                <button className="primary compact" onClick={loadDemoProject} disabled={busy}>
                  🚀 Load Sample Project
                </button>
              </div>
            </section>
          </>
        )}

        {/* KONSTRUXIO AI Suite */}
        {tab === 'copilot' && (
          <KonstruxioCopilotView projectId={selected} onDataChanged={() => refreshData()} />
        )}

        {/* 2. Feature 1: Voice-to-Action Field Agent */}
        {tab === 'voice' && (
          <VoiceAgentView projectId={selected} onActionsCommitted={() => refreshData()} />
        )}

        {/* 3. Feature 2: Blueprints & Pinning */}
        {tab === 'blueprints' && (
          <BlueprintView projectId={selected} />
        )}

        {/* 4. Feature 3: Photo Snagging */}
        {tab === 'snagging' && (
          <PhotoSnaggingView projectId={selected} />
        )}

        {/* 5. Feature 4: Owner Reports & Weather */}
        {tab === 'executive' && (
          <ExecutiveReportView projectId={selected} onWeatherAppended={() => refreshData()} />
        )}

        {/* Projects Tab */}
        {tab === 'projects' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h3>Projects</h3>
                <p>Projects belonging to your organization.</p>
              </div>
            </div>
            <form className="inlineForm" onSubmit={createProject}>
              <input required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="New project name" />
              <button className="primary compact"><Plus size={16} /> Add project</button>
            </form>
            <div className="rows">
              {projects.map(p => (
                <button className="dataRow" key={p.id} onClick={() => setSelected(p.id)}>
                  <span className="rowIcon"><FolderKanban /></span>
                  <span><b>{p.name}</b><small>{p.location || p.description || 'No description yet'}</small></span>
                  <em>{p.status}</em>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Tasks, Issues, Reports */}
        {['tasks', 'issues', 'reports'].includes(tab) && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h3>{tab === 'tasks' ? 'Project tasks' : tab === 'issues' ? 'Site issues' : 'Daily reports'}</h3>
                <p>{current ? current.name : 'Select a project to view records.'}</p>
              </div>
            </div>
            {!selected ? (
              <p className="empty">Create or select a project first.</p>
            ) : (
              <>
                {tab === 'tasks' && (
                  <form className="inlineForm" onSubmit={createTask}>
                    <input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Describe a task" />
                    <button className="primary compact"><Plus size={16} /> Add task</button>
                  </form>
                )}
                {tab === 'issues' && (
                  <form className="inlineForm" onSubmit={createIssue}>
                    <input required value={issueTitle} onChange={e => setIssueTitle(e.target.value)} placeholder="Describe a site issue" />
                    <button className="primary compact"><Plus size={16} /> Report issue</button>
                  </form>
                )}
                <div className="rows">
                  {items.length ? (
                    items.map(x => (
                      <div className="dataRow" key={x.id}>
                        <span className="rowIcon">
                          {tab === 'tasks' ? <ClipboardList /> : tab === 'issues' ? <AlertTriangle /> : <FileText />}
                        </span>
                        {tab === 'issues' && x.photoData && (
                          <img
                            src={x.photoData}
                            alt={x.title}
                            className="rowThumbnail"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/inspections/firestop-penetration.svg' }}
                          />
                        )}
                        <span>
                          <b>{x.title || `Report · ${x.reportDate}`}</b>
                          <small>{x.description || x.workCompleted || x.createdAt || ''}</small>
                        </span>
                        <em>{x.status || x.severity || 'REPORT'}</em>
                      </div>
                    ))
                  ) : (
                    <p className="empty">No records yet. Add the first item above or use the Voice Agent to dictate automatically.</p>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* AI Assistant */}
        {tab === 'assistant' && (
          <section className="panel assistant">
            <div className="aiBadge"><Sparkles /></div>
            <h3>Ask Konstruxio AI</h3>
            <p>Get help drafting site reports, clarifying construction workflows or turning rough notes into clear actions.</p>
            <form onSubmit={ask}>
              <textarea value={chat} onChange={e => setChat(e.target.value)} required placeholder="Example: Help me analyze safety risks when pouring concrete in sub-zero weather." />
              <div className="assistantActions">
                <button className="primary" disabled={busy}><Send size={16} />{busy ? 'Thinking…' : 'Send message'}</button>
              </div>
            </form>
            {answer && <div className="answer"><b>AI response</b><p>{answer}</p></div>}
          </section>
        )}

        {/* Documents & RAG */}
        {tab === 'documents' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h3>Project document intelligence</h3>
                <p>Upload searchable PDF specifications, plans or site documents for semantic AI search.</p>
              </div>
            </div>

            {/* Ready-to-Use Construction Specification Sample Box */}
            <div style={{
              background: '#f0fdf9',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              padding: '16px 18px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 800, fontSize: '14px' }}>
                    <Sparkles size={16} /> Sample Construction Specification (Searchable PDF)
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#047857' }}>
                    3-page technical spec: Section 033000 (Concrete Curing &amp; Temperatures), Section 078400 (Firestopping), and Section 015000 (Crane Wind Thresholds &amp; MEP Clearances).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                  <a
                    href="/sample-construction-specification.pdf"
                    download="sample-construction-specification.pdf"
                    className="secondary compact"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={15} /> Download PDF (24 KB)
                  </a>
                  <button
                    type="button"
                    className="primary compact"
                    onClick={loadSamplePdf}
                    disabled={busy || !selected}
                  >
                    <Zap size={15} /> {busy ? 'Uploading & Indexing…' : '⚡ 1-Click Upload & Index'}
                  </button>
                </div>
              </div>

              {/* Sample queries chips */}
              <div style={{ borderTop: '1px solid #d1fae5', marginTop: '12px', paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', marginRight: '6px' }}>
                  Click to Ask Semantic Questions:
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {[
                    'What is the minimum temperature for pouring structural concrete?',
                    'What intumescent collar is required for PVC pipe penetrations?',
                    'At what wind speed must tower crane operations cease?',
                    'What is the minimum clearance between cable trays and HVAC ducts?'
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #6ee7b7',
                        borderRadius: '16px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        color: '#065f46',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onClick={() => setDocQuestion(q)}
                    >
                      💡 {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!selected ? (
              <p className="empty">Select a project first.</p>
            ) : (
              <>
                <form className="inlineForm" onSubmit={uploadDoc}>
                  <input type="file" accept="application/pdf,.pdf" required onChange={e => setDocFile(e.target.files?.[0] || null)} />
                  <button className="primary compact" disabled={!docFile}><Plus size={16} /> Upload PDF</button>
                </form>
                <div className="rows">
                  {docs.map(d => (
                    <div className="dataRow" key={d.id}>
                      <span className="rowIcon"><FileText /></span>
                      <span><b>{d.filename}</b><small>{Math.round(d.fileSize / 1024)} KB · {new Date(d.createdAt).toLocaleDateString()}</small></span>
                      <em>INDEXED</em>
                    </div>
                  ))}
                  {!docs.length && <p className="empty">No PDFs uploaded yet.</p>}
                </div>
                <form className="docAsk" onSubmit={askDoc}>
                  <textarea required value={docQuestion} onChange={e => setDocQuestion(e.target.value)} placeholder="Ask about this project's uploaded PDFs… e.g. What is the specified fire rating for the doors?" />
                  <button className="primary" disabled={busy || !docs.length}><Sparkles size={16} />{busy ? 'Searching…' : 'Ask project documents'}</button>
                </form>
                {docAnswer && (
                  <div className="answer">
                    <b>Answer · {docAnswer.provider}</b>
                    <p>{docAnswer.answer}</p>
                    <b>Sources</b>
                    {docAnswer.sources?.map((s: any, i: number) => (
                      <small className="source" key={i}>{s.filename}, page {s.page}</small>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <footer>Konstruxio AI <span>·</span> Next-generation voice &amp; vision construction operations.</footer>
      </main>
    </div>
  )
}
