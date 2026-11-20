import { useState, useEffect } from 'react'
import { api } from './api'
import { CloudRain, Wind, Thermometer, AlertTriangle, Printer, Sparkles, CheckCircle2, Loader2, Calendar } from 'lucide-react'

export function ExecutiveReportView({ projectId, onWeatherAppended }: { projectId: string; onWeatherAppended: () => void }) {
  const [weather, setWeather] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [weatherBusy, setWeatherBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadWeather() {
    if (!projectId) return
    try {
      const data = await api.weather(projectId)
      setWeather(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadWeather()
  }, [projectId])

  async function applyWeatherToToday() {
    if (!projectId || !weather) return
    setWeatherBusy(true)
    setError('')
    try {
      const today = new Date().toISOString().split('T')[0]
      const weatherText = `${weather.condition}, ${weather.temperature}°C, Wind ${weather.windSpeed} km/h`
      await api.createReport({
        projectId,
        reportDate: today,
        weather: weatherText,
        workersCount: 10,
        workCompleted: 'Weather conditions logged from automated site sensor telemetry.',
        safetyNotes: weather.advisory
      })
      setSuccess('Weather & site advisory saved to today’s daily log!')
      onWeatherAppended()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setWeatherBusy(false)
    }
  }

  async function generateExecutiveReport() {
    if (!projectId) return
    setBusy(true)
    setError('')
    try {
      const data = await api.executiveReport(projectId)
      setReport(data)
    } catch (err: any) {
      setError(err.message || 'Failed to generate executive report')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel executivePanel">
      <div className="panelHead">
        <div>
          <h3>Automated Weather Defense &amp; Owner Executive Reports</h3>
          <p>Real-time site meteorological conditions for delay defense, and AI-compiled weekly status packages for project owners.</p>
        </div>
      </div>

      {error && <div className="error banner">{error}<button onClick={() => setError('')}>×</button></div>}
      {success && <div className="success banner">{success}<button onClick={() => setSuccess('')}>×</button></div>}

      {/* Live Site Weather Card */}
      {weather && (
        <div className="weatherCard">
          <div className="weatherMain">
            <div className="tempBox">
              <Thermometer size={28} />
              <div>
                <b>{weather.temperature}°C</b>
                <span>{weather.condition}</span>
              </div>
            </div>

            <div className="weatherStats">
              <div className="wStat">
                <Wind size={18} />
                <span>Wind: <b>{weather.windSpeed} km/h</b></span>
              </div>
              <div className="wStat">
                <CloudRain size={18} />
                <span>Precipitation: <b>{weather.precipitation} mm</b></span>
              </div>
            </div>

            <button className="primary compact" onClick={applyWeatherToToday} disabled={weatherBusy || !projectId}>
              <Calendar size={16} /> Log Weather to Daily Report
            </button>
          </div>

          <div className={`advisoryBanner ${weather.craneWarning || weather.concretePourWarning ? 'warn' : 'ok'}`}>
            <AlertTriangle size={18} />
            <span>{weather.advisory}</span>
          </div>
        </div>
      )}

      {/* Executive Report Generator */}
      <div className="reportActionSection">
        <div className="reportGenIntro">
          <h4>Weekly Project Owner &amp; Investor Summary</h4>
          <p>Synthesizes tasks completed, open safety hazards, daily logs, and schedule variance into a formal progress document.</p>
        </div>
        <button className="primary" onClick={generateExecutiveReport} disabled={busy || !projectId}>
          <Sparkles size={18} /> {busy ? 'Synthesizing with AI…' : 'Generate 7-Day Owner Report'}
        </button>
      </div>

      {busy && (
        <div className="busyBox">
          <Loader2 className="spinner" size={26} />
          <p>Analyzing field logs, schedule burn rate, and drafting executive brief...</p>
        </div>
      )}

      {report && (
        <div className="reportDocument" id="printableReport">
          <div className="reportDocHead">
            <div>
              <span className="docType">WEEKLY OWNER PROGRESS REPORT</span>
              <h2>{report.projectName}</h2>
              <small>Generated on {report.generatedAt} · Prepared by Konstruxio AI</small>
            </div>
            <button className="secondary printBtn" onClick={() => window.print()}>
              <Printer size={16} /> Print / Export PDF
            </button>
          </div>

          {/* Metric KPIs */}
          <div className="reportMetrics">
            <div className="metricTile">
              <span>TASKS PROGRESS</span>
              <b>{report.metrics.completedTasks} / {report.metrics.totalTasks}</b>
              <small>Tasks Completed</small>
            </div>
            <div className="metricTile">
              <span>OPEN DEFECTS</span>
              <b>{report.metrics.openIssues}</b>
              <small>{report.metrics.criticalIssues} Critical Safety Items</small>
            </div>
            <div className="metricTile">
              <span>BLUEPRINT PINS</span>
              <b>{report.metrics.drawingPins}</b>
              <small>Floor Plan Issues</small>
            </div>
            <div className="metricTile">
              <span>SITE LOGS</span>
              <b>{report.metrics.dailyLogsCount}</b>
              <small>Logged Days</small>
            </div>
          </div>

          <div className="reportNarrative">
            <div className="markdownContent" dangerouslySetInnerHTML={{ __html: formatMarkdown(report.summaryMarkdown) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function formatMarkdown(md: string) {
  if (!md) return ''
  return md
    .replace(/^### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^## (.*$)/gim, '<h3>$1</h3>')
    .replace(/^# (.*$)/gim, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '<p></p>')
}
