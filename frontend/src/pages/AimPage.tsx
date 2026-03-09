import React, { useState, useEffect, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { Card, CardHeader, CardTitle, PageLayout, PageTitle, PageSubtitle, Badge } from '../components/Card'
import { theme } from '../styles/theme'
import { api } from '../lib/api'

// ---- API Types ----
interface RagSource {
  docId: string
  source: string
  key: string
  uploadedAt: string
}

interface CreatedSession {
  sessionId: string
  uid: string
  title: string
  vectorDocIds: string[]
  status: string
  createdAt: string
}

export interface StudyGoal {
  id: string
  text: string
  questions: string[]
}

export interface Lesson {
  id: string
  title: string
  files: string[]
  mode: 'basic' | 'applied'
  goals: StudyGoal[]
  createdAt: string
}

export interface SessionInfo {
  sessionId: string
  title: string
  vectorDocIds: string[]
  vectorKeys: string[]
  status: string
  createdAt: string
}

// -------------------

const spin = keyframes`from { transform: rotate(0deg) } to { transform: rotate(360deg) }`

const ModeCard = styled.div<{ selected: boolean }>`
  border: 1.5px solid ${(p: any) => p.selected ? theme.colors.accent : theme.colors.border};
  border-radius: ${theme.radii.lg};
  padding: 20px;
  cursor: pointer;
  transition: all 0.15s;
  background: ${(p: any) => p.selected ? 'rgba(37,99,235,0.07)' : theme.colors.bgCard};
  &:hover {
    border-color: ${(p: any) => p.selected ? theme.colors.accent : theme.colors.borderLight};
    background: ${(p: any) => p.selected ? 'rgba(37,99,235,0.07)' : theme.colors.bgHover};
  }
`

const ModeTitle = styled.div<{ selected: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(p: any) => p.selected ? theme.colors.accentLight : theme.colors.textPrimary};
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const ModeCheck = styled.div<{ selected: boolean }>`
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 1.5px solid ${(p: any) => p.selected ? theme.colors.accent : theme.colors.border};
  background: ${(p: any) => p.selected ? theme.colors.accent : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 9px;
  color: #fff;
  transition: all 0.15s;
`

const ModeDesc = styled.p`
  font-size: 13px;
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
`

const FileCheckItem = styled.label<{ checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 1px solid ${(p: any) => p.checked ? theme.colors.borderLight : theme.colors.border};
  border-radius: ${theme.radii.md};
  cursor: pointer;
  transition: all 0.15s;
  background: ${(p: any) => p.checked ? theme.colors.bgHover : theme.colors.bgCard};
  &:hover { border-color: ${theme.colors.borderLight}; background: ${theme.colors.bgHover}; }
  input { display: none; }
`

const Checkbox = styled.div<{ checked: boolean }>`
  width: 15px; height: 15px;
  border: 1.5px solid ${(p: any) => p.checked ? theme.colors.accent : theme.colors.textMuted};
  border-radius: 3px;
  background: ${(p: any) => p.checked ? theme.colors.accent : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 9px;
  color: #fff;
  transition: all 0.15s;
`

const SpinnerIcon = styled.div`
  width: 20px; height: 20px;
  border: 2px solid ${theme.colors.border};
  border-top-color: ${theme.colors.accent};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

const EmptyState = styled.div`
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  text-align: center;
`

const ErrorMsg = styled.p`
  font-size: 13px;
  color: ${theme.colors.error};
  margin-top: 8px;
`

export const AimPage: React.FC = () => {
  const navigate = useNavigate()
  const [sources, setSources] = useState<RagSource[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(true)
  const [sourcesError, setSourcesError] = useState('')

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [mode, setMode] = useState<'basic' | 'applied' | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createdSession, setCreatedSession] = useState<SessionInfo | null>(null)

  const fetchSources = useCallback(async () => {
    setSourcesLoading(true)
    setSourcesError('')
    try {
      const data = await api.get<RagSource[]>('/rag/sources')
      setSources(data)
    } catch (err: any) {
      setSourcesError(`Failed to load sources: ${err.message}`)
    } finally {
      setSourcesLoading(false)
    }
  }, [])

  useEffect(() => { fetchSources() }, [fetchSources])

  const toggleDoc = (docId: string) =>
    setSelectedDocIds(prev => prev.includes(docId) ? prev.filter(x => x !== docId) : [...prev, docId])

  const canCreate = selectedDocIds.length > 0 && mode !== null && !creating && !createdSession

  const handleCreate = async () => {
    setCreating(true)
    setCreateError('')
    try {
      // 선택된 소스들의 key 목록
      const selectedSources = sources.filter(s => selectedDocIds.includes(s.docId))
      const title = `${mode === 'basic' ? 'Conceptual' : 'Applied'} Study — ${selectedSources.map(s => s.source).join(', ')}`

      const result = await api.post<CreatedSession>('/sessions', {
        title,
        vectorDocIds: selectedDocIds,
      })

      const vectorKeys = selectedSources.map(s => s.key)
      setCreatedSession({
        sessionId: result.sessionId,
        title: result.title,
        vectorDocIds: result.vectorDocIds,
        vectorKeys,
        status: result.status,
        createdAt: result.createdAt,
      })
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleGoToStudy = () => {
    if (!createdSession) return
    navigate('/study', { state: { session: createdSession } })
  }

  return (
    <>
      <AppHeader />
      <PageLayout>
        <PageTitle>Set Learning Goals</PageTitle>
        <PageSubtitle>Select your uploaded materials and learning mode, then create a tutoring session.</PageSubtitle>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card>
              <CardHeader>
                <CardTitle>Select Files</CardTitle>
                {selectedDocIds.length > 0 && <Badge color="blue">{selectedDocIds.length} selected</Badge>}
              </CardHeader>

              {sourcesLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <SpinnerIcon />
                  <span style={{ fontSize: 13, color: theme.colors.textMuted }}>Loading sources...</span>
                </div>
              ) : sourcesError ? (
                <ErrorMsg>{sourcesError}</ErrorMsg>
              ) : sources.length === 0 ? (
                <p style={{ fontSize: 13, color: theme.colors.textMuted }}>
                  No sources found. Upload PDFs on the Upload page first.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {sources.map(s => (
                    <FileCheckItem key={s.docId} checked={selectedDocIds.includes(s.docId)}>
                      <input type="checkbox" checked={selectedDocIds.includes(s.docId)} onChange={() => toggleDoc(s.docId)} />
                      <Checkbox checked={selectedDocIds.includes(s.docId)}>{selectedDocIds.includes(s.docId) && '✓'}</Checkbox>
                      <span style={{ fontSize: 12, color: theme.colors.textPrimary, fontFamily: theme.fonts.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.source}</span>
                    </FileCheckItem>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader><CardTitle>Learning Mode</CardTitle></CardHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ModeCard selected={mode === 'basic'} onClick={() => setMode('basic')}>
                  <ModeTitle selected={mode === 'basic'}>
                    <ModeCheck selected={mode === 'basic'}>{mode === 'basic' && '✓'}</ModeCheck>
                    Conceptual Understanding
                  </ModeTitle>
                  <ModeDesc>Master definitions and core principles — explain them accurately from memory.</ModeDesc>
                </ModeCard>
                <ModeCard selected={mode === 'applied'} onClick={() => setMode('applied')}>
                  <ModeTitle selected={mode === 'applied'}>
                    <ModeCheck selected={mode === 'applied'}>{mode === 'applied' && '✓'}</ModeCheck>
                    Applied Thinking
                  </ModeTitle>
                  <ModeDesc>Apply concepts to real problems and connect them across topics.</ModeDesc>
                </ModeCard>
              </div>
            </Card>

            <Button variant="primary" size="md" fullWidth disabled={!canCreate} loading={creating} onClick={handleCreate}>
              {creating ? 'Creating Session...' : 'Create Tutoring Session'}
            </Button>
            {createError && <ErrorMsg>{createError}</ErrorMsg>}
            {createdSession && (
              <Button variant="secondary" size="md" fullWidth onClick={() => { setCreatedSession(null); setSelectedDocIds([]); setMode(null) }}>
                Create Another
              </Button>
            )}
          </div>

          <div>
            {!creating && !createdSession && (
              <EmptyState>
                <div style={{ fontSize: 32 }}>🎯</div>
                <p style={{ fontSize: 15, color: theme.colors.textSecondary }}>
                  Select files and a learning mode,<br />then click Create.
                </p>
              </EmptyState>
            )}

            {creating && (
              <EmptyState>
                <SpinnerIcon />
                <p style={{ fontSize: 14, color: theme.colors.textSecondary }}>Creating tutoring session...</p>
                <p style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: theme.fonts.mono }}>POST /api/sessions</p>
              </EmptyState>
            )}

            {createdSession && !creating && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{createdSession.title}</CardTitle>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge color="green">Session Created</Badge>
                      <Badge color="blue">{mode === 'basic' ? 'Conceptual' : 'Applied'}</Badge>
                      <Badge>{selectedDocIds.length} file(s)</Badge>
                    </div>
                  </div>
                </CardHeader>

                <div style={{ margin: '12px 0', padding: '12px 14px', background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.md }}>
                  <p style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.fonts.mono, marginBottom: 4 }}>Session ID</p>
                  <p style={{ fontSize: 13, color: theme.colors.textPrimary, fontFamily: theme.fonts.mono }}>{createdSession.sessionId}</p>
                </div>

                <p style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 16 }}>
                  Your session is ready. The AI tutor will guide you through Socratic questioning based on your selected materials.
                </p>

                <div style={{ marginTop: 8 }}>
                  <Button variant="primary" size="md" fullWidth onClick={handleGoToStudy}>
                    Go to Study →
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </PageLayout>
    </>
  )
}
