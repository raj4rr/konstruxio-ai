import { useState, useEffect } from 'react'
import {
  FileText,
  MapPin,
  Mic,
  FileQuestion,
  DollarSign,
  BarChart3,
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Camera,
  Layers
} from 'lucide-react'

interface Step {
  id: number
  key: string
  title: string
  category: string
  badgeColor: string
  tabTarget: string
  summary: string
  keyAction: string
  highlight: string
  previewData: {
    label: string
    title: string
    details: string[]
    metric?: { label: string; value: string; color: string }
  }
}

const STEPS: Step[] = [
  {
    id: 1,
    key: 'specs',
    category: 'STAGE 1: DOCUMENT INTELLIGENCE & RAG',
    title: 'Ingest Searchable Project Specifications',
    badgeColor: '#0284c7',
    tabTarget: 'documents',
    summary: 'Upload CSI MasterFormat specifications into PostgreSQL pgvector for instant semantic search and field compliance verification.',
    keyAction: 'Vector Chunking & Cosine Distance Search',
    highlight: 'Instant answers to cold-weather concrete pour limits, firestopping ratings, and crane wind limits with exact page citations.',
    previewData: {
      label: 'CSI Section 033000 & 078400 Indexed',
      title: 'Skyline Meridian Tower Specifications (3 Pages)',
      details: [
        'Concrete C35/45 minimum 45 MPa compressive strength',
        'Ambient pour limit: ≥ 2°C (thermal blankets mandatory)',
        'Hilti CP 643N intumescent collar required on PVC penetrations'
      ],
      metric: { label: 'RAG Retrieval Time', value: '< 180 ms', color: '#0284c7' }
    }
  },
  {
    id: 2,
    key: 'blueprints',
    category: 'STAGE 2: SPATIAL 2D BLUEPRINT PINNING',
    title: 'Register Drawing Sheets & Drop Spatial Pins',
    badgeColor: '#8b5cf6',
    tabTarget: 'blueprints',
    summary: 'Coordinate-based (x%, y%) pinning directly on architectural floor plans. Field crews see exact issue coordinates instead of vague text.',
    keyAction: 'Interactive 2D Plan Viewport',
    highlight: 'Pins categorized by trade (HVAC, Electrical, Safety, Plumbing) with critical severity markers and live resolution tracking.',
    previewData: {
      label: 'Sheet A-201 · Level 2 Layout',
      title: '7 Active Jobsite Pins Registered',
      details: [
        'Grid C-4: Duct vs Primary Steel Beam Clash (RFI)',
        'Server Room: 4x 20A Drops & Conduit Relocation (T&M)',
        'Elevator Core: Missing Firestop Collar (Safety Critical)'
      ],
      metric: { label: 'Coordinates Accuracy', value: '100% Vector', color: '#8b5cf6' }
    }
  },
  {
    id: 3,
    key: 'voice',
    category: 'STAGE 3: VOICE-TO-ACTION FIELD CAPTURE',
    title: 'Multilingual Voice Dictation on the Jobsite',
    badgeColor: '#10b981',
    tabTarget: 'voice',
    summary: 'Foremen dictate progress naturally on smartphones in 8+ languages (English, German, Spanish, French, Polish, Hindi).',
    keyAction: 'Whisper Transcription & AI Parsing',
    highlight: 'Speech is converted into formal daily site logs, headcount records, actionable tasks, and OSHA defect items with 1-click commit.',
    previewData: {
      label: 'Voice Note Dictation',
      title: 'Daily Site Log + 3 Action Tasks Extracted',
      details: [
        'Workers on site: 38 (Structural, Rebar, MEP trades)',
        'Work completed: Level 3 columns poured (85m³ C35/45)',
        'Blocker: Drywall delivery delayed until Thursday due to road closure'
      ],
      metric: { label: 'Time Saved per Shift', value: '45 mins/day', color: '#10b981' }
    }
  },
  {
    id: 4,
    key: 'rfis',
    category: 'STAGE 4: AUTOMATED ENGINEERING RFIs',
    title: 'Capture Spatial Clashes & Draft Engineering RFIs',
    badgeColor: '#0ea5e9',
    tabTarget: 'copilot',
    summary: 'When trades hit clashes on site, AI automatically formats an official RFI with conflict details, suggested fixes, and cost/schedule impacts.',
    keyAction: 'Architect Clarification & Resolution',
    highlight: 'Architects review questions and provide official engineering responses with 1-click status transitions to ANSWERED.',
    previewData: {
      label: 'RFI-042 (Mechanical & Structural)',
      title: 'HVAC Duct vs Structural Beam Clash at Grid C-4',
      details: [
        'Discipline: HVAC & Structural Steel',
        'Contractor Proposed Fix: Twin 250mm low-profile rectangular ducts',
        'Official Architect Status: Approved with 150mm clearance to tray'
      ],
      metric: { label: 'RFI Turnaround', value: 'Same Day', color: '#0ea5e9' }
    }
  },
  {
    id: 5,
    key: 'tmtickets',
    category: 'STAGE 5: CONTRACTOR REVENUE PROTECTION',
    title: 'Time & Material (T&M) Extra Work & Digital Sign-Off',
    badgeColor: '#d97706',
    tabTarget: 'copilot',
    summary: 'Instantly document client verbal change orders with itemized labor hours, materials installed, and calculated billing totals.',
    keyAction: 'Digital Owner Sign-Off Stamp',
    highlight: 'Owner representative reviews and digitally signs the ticket on-site, preventing unbilled out-of-scope loss.',
    previewData: {
      label: 'TM-108 · Approved Ticket',
      title: 'Server Room Emergency Conduit & 4x 20A Drops',
      details: [
        'Client Directive: Requested on-site by Mark Weber (Owner Rep)',
        'Labor: 2 Electricians × 4.5h = 9.0 man-hours ($855.00)',
        'Materials: 65m EMT conduit, 4 gang boxes, 4 receptacles ($325.00)'
      ],
      metric: { label: 'Approved Billable Total', value: '$1,180.00', color: '#d97706' }
    }
  },
  {
    id: 6,
    key: 'reports',
    category: 'STAGE 6: WEATHER DEFENSE & OWNER HANDOVER',
    title: 'Live Crane Weather Alerts & Executive Weekly PDF',
    badgeColor: '#e11d48',
    tabTarget: 'executive',
    summary: 'Real-time hyper-local wind speed and temperature tracking against OSHA & project thresholds, plus 1-click executive owner reports.',
    keyAction: '1-Click Printable Owner Summary',
    highlight: 'Combines open tasks, defect trends, concrete curing risk advisories, and weather delays into a presentation-ready report.',
    previewData: {
      label: 'Skyline Meridian Tower Handover',
      title: 'Weekly Executive Owner Report #W47',
      details: [
        'Wind Gust Alert: Peak 52 km/h (Tower crane safely parked)',
        'Task Completion Rate: 84% on schedule',
        'Quality Index: 4 defects inspected, 1 critical firestop resolved'
      ],
      metric: { label: 'Export Format', value: 'Printable PDF', color: '#e11d48' }
    }
  }
]

export function ProjectWalkthroughSlide({ onSelectTab }: { onSelectTab: (tab: any) => void }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Auto-play timer
  useEffect(() => {
    let timer: any
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveIdx(prev => (prev + 1) % STEPS.length)
      }, 4000)
    }
    return () => clearInterval(timer)
  }, [isPlaying])

  const currentStep = STEPS[activeIdx]

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      marginTop: '20px'
    }}>
      {/* Slide Top Header */}
      <div style={{
        background: 'linear-gradient(135deg, #091e30 0%, #133a57 100%)',
        color: 'white',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#0ea5e9',
              color: 'white',
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '1px'
            }}>
              SINGLE-SLIDE INTERACTIVE TOUR
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              End-to-End KONSTRUXIO Lifecycle · 6 Stages
            </span>
          </div>
          <h3 style={{ margin: '6px 0 2px', font: '800 18px Manrope', color: 'white' }}>
            Complete Construction Project Steps in One Slide
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
            Click any step to inspect, or run the auto-tour to review the entire workflow with zero friction.
          </p>
        </div>

        {/* Auto-Play & Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? '#ef4444' : '#10b981',
              color: 'white',
              border: 0,
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? 'Pause Auto-Tour' : '▶ 1-Click Auto-Play'}
          </button>
          <button
            type="button"
            onClick={() => onSelectTab(currentStep.tabTarget)}
            style={{
              background: '#0284c7',
              color: 'white',
              border: 0,
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            Open This Module <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* 6 Step Switcher Tabs (Minimal Clicks) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 12px'
      }}>
        {STEPS.map((s, idx) => {
          const isActive = activeIdx === idx
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveIdx(idx)
                setIsPlaying(false)
              }}
              style={{
                padding: '12px 8px',
                border: 0,
                background: 'transparent',
                borderBottom: isActive ? `3px solid ${s.badgeColor}` : '3px solid transparent',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 800,
                color: isActive ? s.badgeColor : '#94a3b8'
              }}>
                STEP {s.id}
              </span>
              <b style={{
                display: 'block',
                fontSize: '11px',
                color: isActive ? '#0f172a' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '2px'
              }}>
                {s.title.split(' ')[0]} {s.title.split(' ')[1] || ''}
              </b>
            </button>
          )
        })}
      </div>

      {/* Main Single-Slide Body */}
      <div style={{
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '24px',
        alignItems: 'center',
        background: '#ffffff'
      }}>
        {/* Left Column: Stage Narrative & Actions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              background: `${currentStep.badgeColor}18`,
              color: currentStep.badgeColor,
              fontWeight: 800,
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '6px'
            }}>
              {currentStep.category}
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Core Action: <b>{currentStep.keyAction}</b>
            </span>
          </div>

          <h2 style={{ margin: '0 0 10px', font: '800 20px Manrope', color: '#0f172a', lineHeight: 1.3 }}>
            {currentStep.title}
          </h2>

          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
            {currentStep.summary}
          </p>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: currentStep.badgeColor, marginBottom: '4px' }}>
              ⚡ KEY OPERATIONAL BENEFIT:
            </div>
            <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.4 }}>
              {currentStep.highlight}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="primary compact"
              onClick={() => onSelectTab(currentStep.tabTarget)}
              style={{ background: currentStep.badgeColor, border: 0 }}
            >
              <span>Jump to {currentStep.title.split(' ')[0]} Module</span>
              <ArrowRight size={14} />
            </button>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Step {currentStep.id} of {STEPS.length}
            </span>
          </div>
        </div>

        {/* Right Column: Live Data Preview Card */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          border: `1.5px solid ${currentStep.badgeColor}40`,
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              color: currentStep.badgeColor,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {currentStep.previewData.label}
            </span>
            {currentStep.previewData.metric && (
              <span style={{
                background: `${currentStep.previewData.metric.color}18`,
                color: currentStep.previewData.metric.color,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {currentStep.previewData.metric.label}: <b>{currentStep.previewData.metric.value}</b>
              </span>
            )}
          </div>

          <h4 style={{ margin: 0, font: '700 15px Manrope', color: '#0f172a' }}>
            {currentStep.previewData.title}
          </h4>

          <div style={{ display: 'grid', gap: '8px' }}>
            {currentStep.previewData.details.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#334155'
              }}>
                <CheckCircle2 size={14} color={currentStep.badgeColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Timeline Indicator */}
      <div style={{
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {STEPS.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => {
                setActiveIdx(idx)
                setIsPlaying(false)
              }}
              style={{
                width: activeIdx === idx ? '28px' : '10px',
                height: '8px',
                borderRadius: '4px',
                background: activeIdx === idx ? s.badgeColor : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={`Step ${s.id}: ${s.title}`}
            />
          ))}
        </div>
        <small style={{ color: '#64748b', fontSize: '11px' }}>
          Active Project: <b>Skyline Meridian Tower · Munich</b> · All steps fully pre-populated with live data
        </small>
      </div>
    </div>
  )
}
