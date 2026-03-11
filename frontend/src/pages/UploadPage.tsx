import React, { useState, useRef, useEffect, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { Card, CardHeader, CardTitle, PageLayout, PageTitle, PageSubtitle, Badge } from '../components/Card'
import { theme } from '../styles/theme'
import { api, openSSE } from '../lib/api'

// ---- API Types ----
interface RagSource {
  docId: string
  source: string
  key: string
  uploadedAt: string
}

// -------------------

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

const colorMap: Record<LogEntry['type'], string> = {
  info: theme.colors.textSecondary,
  success: theme.colors.successLight,
  error: theme.colors.error,
  progress: '#60A5FA'
}
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

const SourceSection = styled.div`
  margin-top: 24px;
`

const SourceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.md};
  margin-bottom: 8px;
`

const SourceName = styled.span`
  font-size: 13px;
  color: ${theme.colors.textPrimary};
  font-family: ${theme.fonts.mono};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SourceDate = styled.span`
  font-size: 11px;
  color: ${theme.colors.textMuted};
  font-family: ${theme.fonts.mono};
  margin-right: 10px;
  flex-shrink: 0;
`

const fmtSize = (b: number) =>
  b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB'
const now = () => new Date().toLocaleTimeString('en-US', { hour12: false })

export const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([{ type: 'info', text: 'Upload PDF files to begin processing.', ts: now() }])
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const [sources, setSources] = useState<RagSource[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => {
      const next = [...prev, entry]
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      return next
    })
  }, [])

  // Load list of uploaded materials
  const fetchSources = useCallback(async () => {
    setSourcesLoading(true)
    try {
      const data = await api.get<RagSource[]>('/rag/sources')
      setSources(data)
    } catch (err: any) {
      addLog({ type: 'error', text: `Failed to load sources: ${err.message}`, ts: now() })
    } finally {
      setSourcesLoading(false)
    }
  }, [addLog])

  useEffect(() => { fetchSources() }, [fetchSources])

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
    setStatus('uploading')
    setProgress(5)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      addLog({ type: 'progress', text: `Uploading "${file.name}"... (${i + 1}/${files.length})`, ts: now() })

      try {
        // 1. Upload PDF -> receive key
        const form = new FormData()
        form.append('file', file)
        const result = await api.postForm<{ docId: string; source: string; key: string; uploadedAt: string }>(
          '/rag/upload', form
        )
        addLog({ type: 'success', text: `Uploaded "${result.source}" (key: ${result.key})`, ts: now() })
        setProgress(10 + Math.floor(((i + 0.5) / files.length) * 60))
        setStatus('processing')

        // 2. Continuous feedback via SSE
        await new Promise<void>((resolve, reject) => {
          addLog({ type: 'progress', text: 'Streaming processing logs via SSE...', ts: now() })
          const closeSSE = openSSE(
            `/rag/upload-logs/${result.key}`,
            (data) => {
              try {
                const msg = JSON.parse(data)
                if (msg.type === 'done' || msg.status === 'success') {
                  addLog({ type: 'success', text: msg.message ?? 'Processing complete.', ts: now() })
                  closeSSE()
                  resolve()
                } else if (msg.status === 'error') {
                  addLog({ type: 'error', text: msg.message ?? 'Processing error.', ts: now() })
                  closeSSE()
                  reject(new Error(msg.message))
                } else if (msg.status === 'ping') {
                  // heartbeat - ignore
                } else {
                  addLog({ type: 'progress', text: msg.message ?? data, ts: now() })
                }
              } catch {
                // plain text message
                addLog({ type: 'progress', text: data, ts: now() })
              }
            },
            (e) => {
              // done if SSE ends
              const target = e.target as EventSource
              if (target.readyState === EventSource.CLOSED) {
                closeSSE()
                resolve()
              }
            }
          )

          // Timeout: 60s
          setTimeout(() => { closeSSE(); resolve() }, 60000)
        })

        setProgress(10 + Math.floor(((i + 1) / files.length) * 85))

      } catch (err: any) {
        setStatus('error')
        addLog({ type: 'error', text: `Error: ${err.message}`, ts: now() })
        return
      }
    }

    setProgress(100)
    setStatus('done')
    addLog({ type: 'success', text: 'All files processed. Fetching updated source list...', ts: now() })
    await fetchSources()
  }

  const handleDeleteSource = async (docId: string, sourceName: string) => {
    try {
      await api.delete(`/rag/sources/${docId}`)
      addLog({ type: 'info', text: `Deleted "${sourceName}"`, ts: now() })
      setSources(prev => prev.filter(s => s.docId !== docId))
    } catch (err: any) {
      addLog({ type: 'error', text: `Delete failed: ${err.message}`, ts: now() })
    }
  }

  const isProcessing = status === 'uploading' || status === 'processing'

  const statusLabel: Record<typeof status, string> = {
    idle: 'Idle',
    uploading: 'Uploading',
    processing: 'Processing',
    done: 'Done',
    error: 'Error',
  }

  return (
    <>
      <AppHeader />
      <PageLayout>
        <PageTitle>Upload Materials</PageTitle>
        <PageSubtitle>Upload your PDF lecture files. They will be vectorized and stored for RAG-based tutoring.</PageSubtitle>

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
              <Button
                variant="primary"
                size="md"
                disabled={!files.length || isProcessing || status === 'done'}
                loading={isProcessing}
                onClick={handleProcess}
                fullWidth
              >
                {status === 'done' ? 'Processing Complete ✓' : isProcessing ? 'Processing...' : 'Upload & Process'}
              </Button>
              {(status === 'done' || status === 'error') && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => { setFiles([]); setProgress(0); setStatus('idle'); setLogs([{ type: 'info', text: 'Reset.', ts: now() }]) }}
                >
                  Reset
                </Button>
              )}
            </div>

            {/* Uploaded materials list */}
            <SourceSection>
              <CardHeader style={{ marginBottom: 10 }}>
                <CardTitle>Uploaded Sources</CardTitle>
                {!sourcesLoading && <Badge>{sources.length}</Badge>}
              </CardHeader>
              {sourcesLoading ? (
                <p style={{ fontSize: 13, color: theme.colors.textMuted }}>Loading...</p>
              ) : sources.length === 0 ? (
                <p style={{ fontSize: 13, color: theme.colors.textMuted }}>No uploaded sources yet.</p>
              ) : (
                sources.map(s => (
                  <SourceRow key={s.docId}>
                    <SourceName>{s.source}</SourceName>
                    <SourceDate>{new Date(s.uploadedAt).toLocaleDateString('en-US')}</SourceDate>
                    <RemoveBtn onClick={() => handleDeleteSource(s.docId, s.source)}>×</RemoveBtn>
                  </SourceRow>
                ))
              )}
            </SourceSection>
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
                    <StatusText>
                      {status === 'uploading' ? 'Uploading to server' :
                       status === 'processing' ? 'Vectorizing (RAG)' :
                       status === 'done' ? 'Complete' : ''}
                    </StatusText>
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
