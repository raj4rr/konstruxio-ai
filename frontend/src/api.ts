const API = import.meta.env.VITE_API_URL || ''
export function token() { return localStorage.getItem('konstruxio_token') || '' }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers
    }
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `Request failed: ${res.status}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  // Auth & Projects
  register: (data: unknown) => request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: unknown) => request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  seedDemo: () => request<any>('/api/demo/seed', { method: 'POST' }),
  projects: () => request<any[]>('/api/projects'),
  createProject: (data: unknown) => request<any>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),

  // Tasks, Issues & Reports
  tasks: (id: string) => request<any[]>(`/api/tasks?projectId=${id}`),
  createTask: (data: unknown) => request<any>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  issues: (id: string) => request<any[]>(`/api/issues?projectId=${id}`),
  createIssue: (data: unknown) => request<any>('/api/issues', { method: 'POST', body: JSON.stringify(data) }),
  reports: (id: string) => request<any[]>(`/api/reports?projectId=${id}`),
  createReport: (data: unknown) => request<any>('/api/reports', { method: 'POST', body: JSON.stringify(data) }),

  // AI & Documents
  chat: (message: string) => request<any>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  documents: (id: string) => request<any[]>(`/api/projects/${id}/documents`),
  uploadDocument: async (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API}/api/projects/${id}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: fd
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  askDocuments: (id: string, question: string) => request<any>(`/api/projects/${id}/documents/ask`, { method: 'POST', body: JSON.stringify({ question }) }),

  // Feature 1: Voice-to-Action Agent
  transcribe: async (file: File, language: string) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API}/api/voice/transcribe?language=${encodeURIComponent(language)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: fd
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  analyzeVoiceAudio: async (file: File, language: string) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API}/api/voice/analyze-audio?language=${encodeURIComponent(language)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: fd
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  analyzeVoiceText: (text: string) => request<any>('/api/voice/analyze-text', { method: 'POST', body: JSON.stringify({ text }) }),
  commitVoiceActions: (payload: any) => request<any>('/api/voice/commit', { method: 'POST', body: JSON.stringify(payload) }),

  // Feature 2: Blueprints & Pinning
  drawings: (projectId: string) => request<any[]>(`/api/projects/${projectId}/drawings`),
  createDrawing: (projectId: string, data: any) => request<any>(`/api/projects/${projectId}/drawings`, { method: 'POST', body: JSON.stringify(data) }),
  drawingPins: (drawingId: string) => request<any[]>(`/api/drawings/${drawingId}/pins`),
  createPin: (drawingId: string, data: any) => request<any>(`/api/drawings/${drawingId}/pins`, { method: 'POST', body: JSON.stringify(data) }),
  updatePin: (pinId: string, data: any) => request<any>(`/api/drawings/pins/${pinId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePin: (pinId: string) => request<any>(`/api/drawings/pins/${pinId}`, { method: 'DELETE' }),

  // Feature 3: Photo Snagging & Inspection
  analyzeInspectionPhoto: async (file: File | null, tradeHint: string, userNotes: string) => {
    const fd = new FormData()
    if (file) fd.append('file', file)
    fd.append('tradeHint', tradeHint)
    fd.append('userNotes', userNotes)
    const res = await fetch(`${API}/api/inspections/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: fd
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  createInspectionIssue: (data: any) => request<any>('/api/inspections/create-issue', { method: 'POST', body: JSON.stringify(data) }),

  // Feature 4: Weather & Executive Weekly Owner Reports
  weather: (projectId: string) => request<any>(`/api/projects/${projectId}/weather`),
  executiveReport: (projectId: string) => request<any>(`/api/projects/${projectId}/reports/executive`)
}
