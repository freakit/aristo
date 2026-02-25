import React, { useState, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { Card, CardHeader, CardTitle, PageLayout, PageTitle, PageSubtitle, Badge } from '../components/Card'
import { theme } from '../styles/theme'

// ---- API (ready for integration) ----
const API_BASE = ''

export const chunkPdfs = async (files: File[]): Promise<any> => {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  form.append('window_size', '1')
  form.append('overlap_pages', '150')
  form.append('max_tokens', '800')
  const res = await fetch(`${API_BASE}/api/rag/chunk-pdfs`, { method: 'POST', body: form })
  return res.json()
}

export const embedChunks = async (file: File): Promise<{ success: boolean; message: string; chunks_added: number }> => {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/api/rag/embed-chunks`, { method: 'POST', body: form })
  return res.json()
}
// -------------------------------------

const pulse = keyframes`
  0%, 100% { opacity: 1 }
  50% { opacity: 0.4 }
`

const DropZone = styled.div<{ active: boolean }>`
  border: 1.5px dashed ${(p: any) => p.active ? theme.colors.accent : theme.colors.border};
  border-radius: ${theme.radii.lg};
  padding: 56px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(p: any) => p.active ? 'rgba(37,99,235,0.04)' : 'transparent'};
  &:hover { border-color: ${theme.colors.borderLight}; background: ${theme.colors.bgHover}; }
`

const DropIcon = styled.div`
  width: 44px; height: 44px;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.textMuted};
  font-size: 20px;
  margin-bottom: 6px;
`

const DropTitle = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: ${theme.colors.textPrimary};
`

const DropSub = styled.p`
  font-size: 13px;
  color: ${theme.colors.textSecondary};
`

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
`

const FileRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.md};
`

const FileName = styled.span`
  font-size: 13px;
  color: ${theme.colors.textPrimary};
  font-family: ${theme.fonts.mono};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const FileSize = styled.span`
  font-size: 12px;
  color: ${theme.colors.textMuted};
  font-family: ${theme.fonts.mono};
  margin-right: 10px;
  flex-shrink: 0;
`

const RemoveBtn = styled.button`
  color: ${theme.colors.textMuted};
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { color: ${theme.colors.error}; background: rgba(220,38,38,0.08); }
`

const LogWindow = styled.div`
  background: #060a10;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.md};
  padding: 14px;
  height: 220px;
  overflow-y: auto;
  font-family: ${theme.fonts.mono};
  font-size: 12px;
  line-height: 1.85;
`

interface LogEntry { type: 'info' | 'success' | 'error' | 'progress'; text: string; ts: string }

const colorMap: Record<LogEntry['type'], string> = { info: theme.colors.textSecondary, success: theme.colors.successLight, error: theme.colors.error, progress: '#60A5FA' }
const prefixMap: Record<LogEntry['type'], string> = { info: '·', success: '✓', error: '✗', progress: '→' }

const LogLine = styled.div<{ type: LogEntry['type'] }>`
  color: ${(p: { type: LogEntry['type'] }) => colorMap[p.type]};
  &::before {
    content: '${(p: { type: LogEntry['type'] }) => prefixMap[p.type]}  ';
    margin-right: 4px;
  }
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`

const ProgressBar = styled.div<{ value: number }>`
  height: 4px;
  background: ${theme.colors.bgCard};
  border-radius: 2px;
  overflow: hidden;
  margin-top: 16px;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${(p: any) => p.value}%;
    background: ${theme.colors.accent};
    border-radius: 2px;
    transition: width 0.4s ease;
  }
`

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
`

const StatusText = styled.span`
  font-size: 12px;
  font-family: ${theme.fonts.mono};
  color: ${theme.colors.textMuted};
`

const PulsingDot = styled.span<{ active: boolean }>`
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: ${(p: any) => p.active ? theme.colors.accent : theme.colors.textMuted};
  animation: ${(p: any) => p.active ? pulse : 'none'} 1.2s ease infinite;
  margin-right: 6px;
`

const fmtSize = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB'
const now = () => new Date().toLocaleTimeString('en-US', { hour12: false })

export const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([{ type: 'info', text: 'Upload PDF files to begin processing.', ts: now() }])
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'chunking' | 'embedding' | 'done' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const addLog = (entry: LogEntry) => {
    setLogs(prev => {
      const next = [...prev, entry]
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      return next
    })
  }

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const pdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf')
    const invalid = Array.from(newFiles).filter(f => f.type !== 'application/pdf')
    if (invalid.length) addLog({ type: 'error', text: `PDF files only. Rejected: ${invalid.map(f => f.name).join(', ')}`, ts: now() })
    if (pdfs.length) {
      setFiles(prev => [...prev, ...pdfs])
      pdfs.forEach(f => addLog({ type: 'info', text: `Added "${f.name}" (${fmtSize(f.size)})`, ts: now() }))
    }
  }

  const removeFile = (idx: number) => {
    addLog({ type: 'info', text: `Removed "${files[idx].name}"`, ts: now() })
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleProcess = async () => {
    if (!files.length) return
    setStatus('chunking'); setProgress(5)
    addLog({ type: 'progress', text: `Starting chunking for ${files.length} file(s)...`, ts: now() })
    try {
      // --- MOCK (replace with: const chunks = await chunkPdfs(files)) ---
      await new Promise(r => setTimeout(r, 800)); setProgress(30)
      addLog({ type: 'progress', text: 'Sliding-window chunking... (window_size=1, max_tokens=800)', ts: now() })
      await new Promise(r => setTimeout(r, 600)); setProgress(50)
      const mockCount = files.length * 47
      addLog({ type: 'success', text: `Chunking complete — ${mockCount} chunks created`, ts: now() })
      setStatus('embedding')
      addLog({ type: 'progress', text: 'Embedding into ChromaDB...', ts: now() })
      await new Promise(r => setTimeout(r, 400)); setProgress(70)
      addLog({ type: 'progress', text: 'Vectorizing text chunks...', ts: now() })
      await new Promise(r => setTimeout(r, 800)); setProgress(95)
      addLog({ type: 'success', text: `${mockCount} chunks saved to vector DB`, ts: now() })
      await new Promise(r => setTimeout(r, 300)); setProgress(100)
      setStatus('done')
      addLog({ type: 'success', text: 'All files processed. Proceed to Set Goals.', ts: now() })
    } catch (err: any) {
      setStatus('error')
      addLog({ type: 'error', text: `Error: ${err.message}`, ts: now() })
    }
  }

  const isProcessing = status === 'chunking' || status === 'embedding'

  const statusLabel: Record<typeof status, string> = {
    idle: 'Idle', chunking: 'Chunking', embedding: 'Embedding', done: 'Done', error: 'Error'
  }

  return (
    <>
      <AppHeader />
      <PageLayout>
        <PageTitle>Upload Materials</PageTitle>
        <PageSubtitle>Upload your PDF lecture files. They will be automatically chunked and embedded for RAG.</PageSubtitle>

        <TwoCol>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>PDF Upload</CardTitle>
                {files.length > 0 && <Badge color="blue">{files.length} selected</Badge>}
              </CardHeader>

              <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

              <DropZone
                active={dragging}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
              >
                <DropIcon>📄</DropIcon>
                <DropTitle>Click or drag files here</DropTitle>
                <DropSub>PDF files only · Multiple files supported</DropSub>
              </DropZone>

              {files.length > 0 && (
                <FileList>
                  {files.map((f, i) => (
                    <FileRow key={i}>
                      <FileName>{f.name}</FileName>
                      <FileSize>{fmtSize(f.size)}</FileSize>
                      <RemoveBtn onClick={() => removeFile(i)}>×</RemoveBtn>
                    </FileRow>
                  ))}
                </FileList>
              )}
            </Card>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <Button variant="primary" size="md" disabled={!files.length || isProcessing || status === 'done'} loading={isProcessing} onClick={handleProcess} fullWidth>
                {status === 'done' ? 'Processing Complete ✓' : isProcessing ? 'Processing...' : 'Start Chunking & Embedding'}
              </Button>
              {(status === 'done' || status === 'error') && (
                <Button variant="secondary" size="md" onClick={() => { setFiles([]); setProgress(0); setStatus('idle'); setLogs([{ type: 'info', text: 'Reset.', ts: now() }]) }}>
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Processing Status</CardTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PulsingDot active={isProcessing} />
                  <span style={{ fontSize: 12, color: theme.colors.textSecondary, fontFamily: theme.fonts.mono }}>{statusLabel[status]}</span>
                </div>
              </CardHeader>
              {(isProcessing || status === 'done' || status === 'error') && (
                <>
                  <ProgressBar value={progress} />
                  <StatusRow>
                    <StatusText>{status === 'chunking' ? 'Sliding-window chunking' : status === 'embedding' ? 'ChromaDB vector storage' : status === 'done' ? 'Complete' : ''}</StatusText>
                    <StatusText>{progress}%</StatusText>
                  </StatusRow>
                </>
              )}
            </Card>

            <Card style={{ marginTop: 16 }}>
              <CardHeader>
                <CardTitle>Processing Log</CardTitle>
                <Badge>{logs.length}</Badge>
              </CardHeader>
              <LogWindow>
                {logs.map((log, i) => (
                  <LogLine key={i} type={log.type}>
                    <span style={{ color: theme.colors.textMuted, marginRight: 8 }}>[{log.ts}]</span>
                    {log.text}
                  </LogLine>
                ))}
                <div ref={logEndRef} />
              </LogWindow>
            </Card>
          </div>
        </TwoCol>
      </PageLayout>
    </>
  )
}
