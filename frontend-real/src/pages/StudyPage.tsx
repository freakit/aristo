import React, { useState, useRef, useEffect, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { Card, CardHeader, CardTitle, PageLayout, PageTitle, Badge } from '../components/Card'
import { theme } from '../styles/theme'
import { api, openTutorWS } from '../lib/api'
import type { SessionInfo } from './AimPage'

// ---- API Types ----
interface SessionSummary {
  sessionId: string
  title: string
  status: string
  createdAt: string
}

interface Message {
  msgId: string
  role: 'user' | 'assistant'
  content: string
  turn: number
  createdAt: string
}

interface SessionDetail {
  sessionId: string
  title: string
  status: string
  vectorDocIds: string[]
  messages: Message[]
}

// WebSocket message types from server
interface WsChunk { type: 'CHUNK'; content: string; turn: number }
interface WsDone { type: 'DONE'; msgId: string; turn: number }
interface WsError { type: 'ERROR'; message: string }
type WsMessage = WsChunk | WsDone | WsError
// -------------------

const pulse = keyframes`0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.7}`
const ripple = keyframes`0%{transform:scale(0.9);opacity:0.5}100%{transform:scale(1.9);opacity:0}`
const spin = keyframes`from { transform: rotate(0deg) } to { transform: rotate(360deg) }`

const LessonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
`

const LessonCard = styled.div`
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  padding: 22px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: ${theme.colors.borderLight}; background: ${theme.colors.bgHover}; transform: translateY(-1px); }
`

const LessonTitle = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: ${theme.colors.textPrimary};
  margin-bottom: 8px;
  letter-spacing: -0.01em;
`

const LessonMeta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
`

const SessionLayout = styled.div`
  display: grid;
  grid-template-columns: 270px 1fr;
  gap: 22px;
  align-items: start;
`

const GoalSidebar = styled.div`
  position: sticky;
  top: 80px;
`

const ChatMessage = styled.div<{ role: 'user' | 'assistant' }>`
  display: flex;
  flex-direction: column;
  align-items: ${(p: any) => p.role === 'user' ? 'flex-end' : 'flex-start'};
  margin-bottom: 12px;
`

const ChatBubble = styled.div<{ role: 'user' | 'assistant' }>`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: ${(p: any) => p.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px'};
  font-size: 14px;
  line-height: 1.65;
  background: ${(p: any) => p.role === 'user' ? theme.colors.accent : theme.colors.bgCard};
  color: ${(p: any) => p.role === 'user' ? '#fff' : theme.colors.textPrimary};
  border: 1px solid ${(p: any) => p.role === 'user' ? 'transparent' : theme.colors.border};
`

const ChatRoleLabel = styled.span`
  font-size: 10px;
  color: ${theme.colors.textMuted};
  font-family: ${theme.fonts.mono};
  margin-bottom: 4px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`

const ChatWindow = styled.div`
  height: 380px;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
`

const MainPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const QLabel = styled.div`
  font-family: ${theme.fonts.mono};
  font-size: 10px;
  color: ${theme.colors.textMuted};
  letter-spacing: 0.07em;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const SpeakerDot = styled.span<{ active: boolean }>`
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: ${(p: any) => p.active ? theme.colors.accent : theme.colors.textMuted};
  animation: ${(p: any) => p.active ? pulse : 'none'} 1.2s ease infinite;
`

const ControlPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.lg};
`

const MicBtn = styled.button<{ recording: boolean; disabled?: boolean }>`
  width: 60px; height: 60px;
  border-radius: 50%;
  border: none;
  background: ${(p: any) => p.recording ? theme.colors.error : theme.colors.accent};
  color: #fff;
  font-size: 22px;
  cursor: ${(p: any) => p.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${(p: any) => p.disabled ? 0.4 : 1};
  transition: all 0.15s;
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${(p: any) => p.recording ? pulse : 'none'} 1s ease infinite;
  &::after {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 1.5px solid ${(p: any) => p.recording ? theme.colors.error : theme.colors.accent};
    animation: ${(p: any) => p.recording ? ripple : 'none'} 1.5s ease-out infinite;
    opacity: 0.4;
  }
  &:hover:not([disabled]) { transform: scale(1.05); }
`

const ControlInfo = styled.div`flex: 1;`

const ControlTitle = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: ${theme.colors.textPrimary};
  margin-bottom: 3px;
`

const ControlSub = styled.p`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
  font-family: ${theme.fonts.mono};
`

const ProgressBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: 100px;
  font-size: 12px;
  font-family: ${theme.fonts.mono};
  color: ${theme.colors.textSecondary};
`

const EmptyState = styled.div`
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  text-align: center;
`

const SpinnerIcon = styled.div`
  width: 20px; height: 20px;
  border: 2px solid ${theme.colors.border};
  border-top-color: ${theme.colors.accent};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

const ErrorMsg = styled.p`
  font-size: 13px;
  color: ${theme.colors.error};
`

export const StudyPage: React.FC = () => {
  const location = useLocation()
  const incomingSession = (location.state as { session?: SessionInfo } | null)?.session ?? null

  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')

  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)

  const [sessionStarted, setSessionStarted] = useState(false)
  const [recording, setRecording] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [ttsActive, setTtsActive] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [currentTurn, setCurrentTurn] = useState(0)
  const [wsError, setWsError] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  // AimPage에서 세션 state로 전달된 경우 즉시 로드
  const vectorKeysRef = useRef<string[]>(incomingSession?.vectorKeys ?? [])

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true)
    setSessionsError('')
    try {
      const data = await api.get<SessionSummary[]>('/sessions')
      setSessions(data)
    } catch (err: any) {
      setSessionsError(`Failed to load sessions: ${err.message}`)
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedSession?.messages, streamingText])

  const loadSession = useCallback(async (sessionId: string, vectorKeys?: string[]) => {
    setSessionLoading(true)
    try {
      const detail = await api.get<SessionDetail>(`/sessions/${sessionId}`)
      setSelectedSession(detail)
      if (vectorKeys) vectorKeysRef.current = vectorKeys
    } catch (err: any) {
      setSessionsError(`Failed to load session: ${err.message}`)
    } finally {
      setSessionLoading(false)
    }
  }, [])

  // AimPage에서 넘어온 세션 자동 로드
  useEffect(() => {
    if (incomingSession) {
      loadSession(incomingSession.sessionId, incomingSession.vectorKeys)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const playTTS = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'; u.rate = 0.92
    setTtsActive(true)
    u.onend = () => setTtsActive(false)
    window.speechSynthesis.speak(u)
  }

  const appendMessage = (msg: Message) => {
    setSelectedSession(prev => {
      if (!prev) return prev
      return { ...prev, messages: [...prev.messages, msg] }
    })
  }

  const connectWS = useCallback((sessionId: string) => {
    const ws = openTutorWS()
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'START',
        sessionId,
        vectorKeys: vectorKeysRef.current,
      }))
      setCurrentTurn(0)
    }

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data)

        if (msg.type === 'CHUNK') {
          setStreamingText(prev => prev + msg.content)
        } else if (msg.type === 'DONE') {
          // 스트리밍 완료 → 메시지로 고정
          setStreamingText(prev => {
            const full = prev
            if (full) {
              appendMessage({
                msgId: msg.msgId,
                role: 'assistant',
                content: full,
                turn: msg.turn,
                createdAt: new Date().toISOString(),
              })
              playTTS(full)
            }
            return ''
          })
          setCurrentTurn(msg.turn + 1)
          setWaiting(false)
        } else if (msg.type === 'ERROR') {
          setWsError(msg.message)
          setWaiting(false)
        }
      } catch {
        // 무시
      }
    }

    ws.onerror = () => { setWsError('WebSocket connection error.') }
    ws.onclose = () => { wsRef.current = null }
  }, [])

  const handleStart = async () => {
    if (!selectedSession) return
    setSessionStarted(true)
    setStreamingText('')
    connectWS(selectedSession.sessionId)
  }

  const handleMic = async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream)
        chunksRef.current = []
        mr.ondataavailable = e => chunksRef.current.push(e.data)

        mr.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          stream.getTracks().forEach(t => t.stop())
          setWaiting(true)

          // blob → base64
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]
            // 사용자 turn 메시지 추가 (오디오 제출 표시)
            appendMessage({
              msgId: `user-${Date.now()}`,
              role: 'user',
              content: '[Voice Answer Submitted]',
              turn: currentTurn,
              createdAt: new Date().toISOString(),
            })
            // WebSocket으로 오디오 전송
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'INPUT',
                audioChunk: base64,
                turn: currentTurn,
              }))
            }
          }
          reader.readAsDataURL(blob)
        }

        mr.start()
        mediaRef.current = mr
        setRecording(true)
      } catch {
        alert('Microphone permission is required.')
      }
    } else {
      mediaRef.current?.stop()
      setRecording(false)
    }
  }

  const handleEndSession = async () => {
    if (!selectedSession) return
    // WebSocket 종료
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'END' }))
      wsRef.current.close()
    }
    // 세션 종료 API
    try {
      await api.patch(`/sessions/${selectedSession.sessionId}/end`)
    } catch {
      // 무시
    }
    window.speechSynthesis?.cancel()
    setSelectedSession(null)
    setSessionStarted(false)
    setStreamingText('')
    setRecording(false)
    setWaiting(false)
    setWsError('')
    await fetchSessions()
  }

  // 세션 목록 화면
  if (!selectedSession) {
    return (
      <>
        <AppHeader />
        <PageLayout>
          <PageTitle>Study</PageTitle>
          <p style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 28 }}>
            Choose a tutoring session to continue, or go to Set Goals to create a new one.
          </p>

          {sessionsLoading || sessionLoading ? (
            <EmptyState>
              <SpinnerIcon />
              <p style={{ fontSize: 13, color: theme.colors.textMuted }}>Loading sessions...</p>
            </EmptyState>
          ) : sessionsError ? (
            <ErrorMsg>{sessionsError}</ErrorMsg>
          ) : sessions.length === 0 ? (
            <EmptyState>
              <div style={{ fontSize: 32 }}>📚</div>
              <p style={{ fontSize: 14, color: theme.colors.textSecondary }}>No sessions yet. Go to Set Goals to create one.</p>
            </EmptyState>
          ) : (
            <LessonGrid>
              {sessions.map(s => (
                <LessonCard key={s.sessionId} onClick={() => loadSession(s.sessionId)}>
                  <LessonTitle>{s.title}</LessonTitle>
                  <LessonMeta>
                    <Badge color={s.status === 'active' ? 'green' : 'blue'}>{s.status}</Badge>
                  </LessonMeta>
                  <p style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.fonts.mono }}>
                    {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </LessonCard>
              ))}
            </LessonGrid>
          )}
        </PageLayout>
      </>
    )
  }

  const messages = selectedSession.messages

  return (
    <>
      <AppHeader />
      <PageLayout>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Button variant="ghost" size="sm" onClick={handleEndSession}>
            ← Back
          </Button>
          <PageTitle style={{ marginBottom: 0 }}>{selectedSession.title}</PageTitle>
          <ProgressBadge>
            <Badge color={selectedSession.status === 'active' ? 'green' : 'blue'}>{selectedSession.status}</Badge>
          </ProgressBadge>
        </div>

        <SessionLayout>
          <GoalSidebar>
            <Card padding="14px">
              <CardHeader><CardTitle>Session Info</CardTitle></CardHeader>
              <div style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.fonts.mono, lineHeight: 1.8 }}>
                <div>ID: {selectedSession.sessionId.slice(0, 12)}...</div>
                <div>Messages: {messages.length}</div>
                <div>Sources: {selectedSession.vectorDocIds.length}</div>
              </div>

              {sessionStarted && (
                <div style={{ marginTop: 14 }}>
                  <Button variant="secondary" size="sm" fullWidth onClick={handleEndSession}>
                    End Session
                  </Button>
                </div>
              )}
            </Card>
          </GoalSidebar>

          <MainPanel>
            {!sessionStarted ? (
              <Card>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 18 }}>🎙️</div>
                  <p style={{ fontSize: 16, color: theme.colors.textPrimary, marginBottom: 8, fontWeight: 500 }}>
                    Ready to start your tutoring session?
                  </p>
                  <p style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 32 }}>
                    The AI tutor will ask questions via text. Press the mic button to answer with your voice.
                  </p>

                  {/* 기존 메시지 히스토리 표시 */}
                  {messages.length > 0 && (
                    <div style={{ textAlign: 'left', marginBottom: 24 }}>
                      <p style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: theme.fonts.mono, marginBottom: 8 }}>
                        Previous messages ({messages.length})
                      </p>
                      <ChatWindow style={{ height: 200, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.md }}>
                        {messages.map(m => (
                          <ChatMessage key={m.msgId} role={m.role}>
                            <ChatRoleLabel>{m.role === 'user' ? 'You' : 'AI Tutor'}</ChatRoleLabel>
                            <ChatBubble role={m.role}>{m.content}</ChatBubble>
                          </ChatMessage>
                        ))}
                        <div ref={chatEndRef} />
                      </ChatWindow>
                    </div>
                  )}

                  <Button variant="primary" size="lg" onClick={handleStart}>
                    {messages.length > 0 ? 'Continue Session' : 'Start Session'}
                  </Button>
                  {wsError && <ErrorMsg style={{ marginTop: 12 }}>{wsError}</ErrorMsg>}
                </div>
              </Card>
            ) : (
              <>
                {/* 채팅 창 */}
                <Card>
                  <CardHeader>
                    <QLabel>
                      <SpeakerDot active={ttsActive} />
                      AI Tutor Chat
                      {ttsActive && <span style={{ color: theme.colors.accentLight }}>· Speaking</span>}
                      {waiting && <span style={{ color: '#60A5FA' }}>· Processing</span>}
                    </QLabel>
                  </CardHeader>
                  <ChatWindow>
                    {messages.map(m => (
                      <ChatMessage key={m.msgId} role={m.role}>
                        <ChatRoleLabel>{m.role === 'user' ? 'You' : 'AI Tutor'}</ChatRoleLabel>
                        <ChatBubble role={m.role}>{m.content}</ChatBubble>
                      </ChatMessage>
                    ))}
                    {/* 스트리밍 중인 응답 */}
                    {streamingText && (
                      <ChatMessage role="assistant">
                        <ChatRoleLabel>AI Tutor · Streaming...</ChatRoleLabel>
                        <ChatBubble role="assistant">{streamingText}</ChatBubble>
                      </ChatMessage>
                    )}
                    <div ref={chatEndRef} />
                  </ChatWindow>
                </Card>

                {/* 마이크 컨트롤 */}
                <ControlPanel>
                  <MicBtn
                    recording={recording}
                    disabled={waiting || ttsActive}
                    onClick={handleMic}
                  >
                    {recording ? '⏹' : '🎙'}
                  </MicBtn>
                  <ControlInfo>
                    <ControlTitle>
                      {waiting ? 'Analyzing your answer...' :
                       recording ? 'Recording — press again to stop' :
                       'Press the mic to start your answer'}
                    </ControlTitle>
                    <ControlSub>
                      {ttsActive ? 'Wait for the AI to finish speaking' :
                       recording ? '🔴 REC' : 'Ready'}
                    </ControlSub>
                  </ControlInfo>
                  <Button variant="secondary" size="sm" onClick={handleEndSession}>
                    End
                  </Button>
                </ControlPanel>

                {wsError && <ErrorMsg>{wsError}</ErrorMsg>}
              </>
            )}
          </MainPanel>
        </SessionLayout>
      </PageLayout>
    </>
  )
}
