import React, { useState, useRef, useEffect, useCallback } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { Card, CardHeader, CardTitle, PageLayout, PageTitle, Badge } from '../components/Card'
import { theme } from '../styles/theme'
import { api, startTutor, replyTutor, endTutor } from '../lib/api'
import type { TutorStartResponse, TutorReplyResponse, TutorEndResponse } from '../lib/api'
import type { SessionInfo } from './AimPage'

// ---- API Types ----
interface SessionSummary {
  sessionId: string
  title: string
  status: string
  createdAt: string
}

interface SessionDetail {
  sessionId: string
  title: string
  status: string
  vectorDocIds: string[]
  messages: ChatMsg[]
}

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  kind?: 'explain' | 'question' | 'feedback' | 'supplement' | 'summary'
}

type TutorPhase = 'idle' | 'explaining' | 'questioning' | 'thinking' | 'complete' | 'summary'

// ---- Animations ----
const pulse = keyframes`0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:0.7}`
const ripple = keyframes`0%{transform:scale(0.9);opacity:0.5}100%{transform:scale(1.9);opacity:0}`
const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`
const shimmer = keyframes`0%{background-position:-200px 0}100%{background-position:200px 0}`

// ---- Styled Components ----
const LessonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
`
const LessonCard = styled.div`
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  padding: 22px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: ${theme.colors.accent}44; background: ${theme.colors.bgHover}; transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
`
const LessonTitle = styled.h3`
  font-size: 15px; font-weight: 600;
  color: ${theme.colors.textPrimary}; margin-bottom: 8px;
`
const LessonMeta = styled.div`display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;`

const SessionLayout = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  align-items: start;
`
const Sidebar = styled.div`
  position: sticky;
  top: 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SideSection = styled.div`
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  padding: 14px;
`
const SideLabel = styled.p`
  font-size: 10px;
  font-family: ${theme.fonts.mono};
  color: ${theme.colors.textMuted};
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 8px;
`

const Concept = styled.div`
  font-size: 12px;
  color: ${theme.colors.textSecondary};
  background: ${theme.colors.bgHover};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.sm};
  padding: 4px 8px;
  margin-bottom: 4px;
  font-family: ${theme.fonts.mono};
`

const MainPanel = styled.div`display: flex; flex-direction: column; gap: 14px;`

// Chat
const ChatWindow = styled.div`
  min-height: 160px;
  max-height: 440px;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scroll-behavior: smooth;
`
const ChatMsg = styled.div<{ role: 'user' | 'assistant'; kind?: string }>`
  display: flex;
  flex-direction: column;
  align-items: ${p => p.role === 'user' ? 'flex-end' : 'flex-start'};
  animation: ${fadeIn} 0.3s ease;
`
const ChatLabel = styled.span`
  font-size: 10px;
  color: ${theme.colors.textMuted};
  font-family: ${theme.fonts.mono};
  margin-bottom: 4px;
  letter-spacing: 0.05em;
`
const ChatBubble = styled.div<{ role: 'user' | 'assistant'; kind?: string }>`
  max-width: 82%;
  padding: 12px 16px;
  border-radius: ${p => p.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px'};
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  ${p => p.role === 'user'
    ? css`background: ${theme.colors.accent}; color: #fff; border: none;`
    : p.kind === 'explain'
      ? css`background: linear-gradient(135deg, #1e3a5f 0%, #162d4a 100%); color: ${theme.colors.textPrimary}; border: 1px solid #2a4a7080;`
      : p.kind === 'summary'
        ? css`background: linear-gradient(135deg, #1a3a2a 0%, #122a1e 100%); color: ${theme.colors.textPrimary}; border: 1px solid #2a6a4080;`
        : css`background: ${theme.colors.bgCard}; color: ${theme.colors.textPrimary}; border: 1px solid ${theme.colors.border};`
  }
`

// Explanation card (top)
const ExplainCard = styled.div`
  background: linear-gradient(135deg, #0f1f35 0%, #0a1628 100%);
  border: 1px solid ${theme.colors.accent}33;
  border-radius: ${theme.radii.lg};
  padding: 22px 24px;
  animation: ${fadeIn} 0.4s ease;
`
const ExplainIcon = styled.div`
  width: 36px; height: 36px;
  border-radius: 50%;
  background: ${theme.colors.accent}22;
  border: 1px solid ${theme.colors.accent}44;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  margin-bottom: 14px;
`
const ExplainText = styled.p`
  font-size: 14px;
  color: ${theme.colors.textPrimary};
  line-height: 1.75;
  white-space: pre-wrap;
  margin-bottom: 0;
`

// Question banner
const QuestionBanner = styled.div`
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.accent}44;
  border-left: 3px solid ${theme.colors.accent};
  border-radius: ${theme.radii.md};
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 500;
  color: ${theme.colors.textPrimary};
  line-height: 1.6;
  animation: ${fadeIn} 0.3s ease;
`

// Summary card
const SummaryCard = styled.div`
  background: linear-gradient(135deg, #0f2a1e 0%, #091a12 100%);
  border: 1px solid #2a6a4066;
  border-radius: ${theme.radii.lg};
  padding: 22px 24px;
  animation: ${fadeIn} 0.4s ease;
`

// Input area
const InputArea = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.lg};
`
const TextInput = styled.textarea`
  flex: 1;
  background: ${theme.colors.bgHover};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.md};
  padding: 10px 14px;
  font-size: 14px;
  font-family: ${theme.fonts.sans};
  color: ${theme.colors.textPrimary};
  resize: none;
  height: 60px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: ${theme.colors.accent}88; }
  &::placeholder { color: ${theme.colors.textMuted}; }
`
const MicBtn = styled.button<{ $recording: boolean; disabled?: boolean }>`
  width: 52px; height: 52px;
  border-radius: 50%;
  border: none;
  background: ${p => p.$recording ? theme.colors.error : theme.colors.accent};
  color: #fff;
  font-size: 20px;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${p => p.disabled ? 0.4 : 1};
  transition: all 0.15s;
  position: relative;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  animation: ${p => p.$recording ? css`${pulse} 1s ease infinite` : 'none'};
  &::after {
    content: '';
    position: absolute; inset: -8px;
    border-radius: 50%;
    border: 1.5px solid ${p => p.$recording ? theme.colors.error : theme.colors.accent};
    animation: ${p => p.$recording ? css`${ripple} 1.5s ease-out infinite` : 'none'};
    opacity: 0.4;
  }
  &:hover:not([disabled]) { transform: scale(1.05); }
`
const SpinnerIcon = styled.div`
  width: 18px; height: 18px;
  border: 2px solid ${theme.colors.border};
  border-top-color: ${theme.colors.accent};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  flex-shrink: 0;
`
const EmptyState = styled.div`
  padding: 60px 40px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  text-align: center;
`
const ErrorMsg = styled.p`font-size: 13px; color: ${theme.colors.error};`
const ThinkingDot = styled.span`
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: ${theme.colors.accent};
  animation: ${pulse} 1.2s ease infinite;
  margin: 0 2px;
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
`

// ---- Component ----
export const StudyPage: React.FC = () => {
  const location = useLocation()
  const incomingSession = (location.state as { session?: SessionInfo } | null)?.session ?? null

  // Session list
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)

  // Tutor state
  const [phase, setPhase] = useState<TutorPhase>('idle')
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [keyConcepts, setKeyConcepts] = useState<string[]>([])
  const [tutorSessionId, setTutorSessionId] = useState<string | null>(null)
  const [summaryData, setSummaryData] = useState<TutorEndResponse | null>(null)
  const [error, setError] = useState('')

  // Input
  const [textAnswer, setTextAnswer] = useState('')
  const [recording, setRecording] = useState(false)
  const [sttLoading, setSttLoading] = useState(false)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  // ------- Data fetching -------
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true); setSessionsError('')
    try {
      const data = await api.get<SessionSummary[]>('/sessions')
      setSessions(data)
    } catch (e: any) { setSessionsError(e.message) }
    finally { setSessionsLoading(false) }
  }, [])

  const loadSession = useCallback(async (sessionId: string, vectorKeys?: string[]) => {
    setSessionLoading(true)
    try {
      const detail = await api.get<SessionDetail>(`/sessions/${sessionId}`)
      setSelectedSession(detail)
      setChatMsgs([])
      setPhase('idle')
      setTutorSessionId(null)
      setSummaryData(null)
      setCurrentQuestion('')
      setKeyConcepts([])
      setError('')
    } catch (e: any) { setSessionsError(e.message) }
    finally { setSessionLoading(false) }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])
  useEffect(() => {
    if (incomingSession) loadSession(incomingSession.sessionId, incomingSession.vectorKeys)
  }, []) // eslint-disable-line

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, phase])

  // ------- Tutor logic -------
  const addMsg = (msg: Omit<ChatMsg, 'id'>) =>
    setChatMsgs(prev => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }])

  const handleStartTutor = async () => {
    if (!selectedSession) return
    setPhase('explaining'); setError('')

    try {
      const topic = selectedSession.title
      const res: TutorStartResponse = await startTutor(topic, {
        vectorDocIds: selectedSession.vectorDocIds,
        sessionId: selectedSession.sessionId,
      })
      setTutorSessionId(res.session_id)
      setKeyConcepts(res.key_concepts ?? [])

      // 설명 메시지 추가
      addMsg({ role: 'assistant', content: res.explanation, kind: 'explain' })
      // 첫 질문
      setCurrentQuestion(res.question)
      addMsg({ role: 'assistant', content: res.question, kind: 'question' })
      setPhase('questioning')
    } catch (e: any) {
      setError(`튜터 시작 실패: ${e.message}`)
      setPhase('idle')
    }
  }

  const submitAnswer = async (answer: string) => {
    if (!tutorSessionId || !answer.trim()) return
    setPhase('thinking'); setError('')

    // 학생 답변 표시
    addMsg({ role: 'user', content: answer })
    setTextAnswer('')

    try {
      const res: TutorReplyResponse = await replyTutor(tutorSessionId, answer)

      // 피드백
      if (res.feedback) addMsg({ role: 'assistant', content: res.feedback, kind: 'feedback' })
      // 보충 설명
      if (res.supplement) addMsg({ role: 'assistant', content: res.supplement, kind: 'supplement' })

      if (res.is_complete || !res.question) {
        // 세션 완료 - 요약 요청
        setPhase('complete')
        try {
          const summary = await endTutor(tutorSessionId)
          setSummaryData(summary)
          setPhase('summary')
        } catch {
          setPhase('complete')
        }
      } else {
        setCurrentQuestion(res.question!)
        addMsg({ role: 'assistant', content: res.question!, kind: 'question' })
        setPhase('questioning')
      }
    } catch (e: any) {
      setError(`답변 처리 실패: ${e.message}`)
      setPhase('questioning')
    }
  }

  const handleSendText = () => {
    if (textAnswer.trim()) submitAnswer(textAnswer.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const handleMic = async () => {
    if (recording) {
      mediaRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setSttLoading(true)
        try {
          const form = new FormData()
          form.append('audio', blob, 'answer.webm')
          const sttRes = await api.postForm<{ text: string }>('/stt/transcribe', form)
          if (sttRes.text) await submitAnswer(sttRes.text)
          else setError('음성 인식 결과가 비어있습니다.')
        } catch (e: any) {
          setError(`음성 인식 실패: ${e.message}`)
        } finally {
          setSttLoading(false)
        }
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
    } catch {
      alert('마이크 권한이 필요합니다.')
    }
  }

  const handleEndSession = async () => {
    if (tutorSessionId) {
      try { await endTutor(tutorSessionId) } catch { /* ignore */ }
    }
    if (selectedSession) {
      try { await api.patch(`/sessions/${selectedSession.sessionId}/end`) } catch { /* ignore */ }
    }
    setSelectedSession(null)
    setChatMsgs([]); setPhase('idle'); setTutorSessionId(null)
    setSummaryData(null); setCurrentQuestion(''); setTextAnswer('')
    setRecording(false); setError('')
    await fetchSessions()
  }

  // ------- Render: 세션 목록 -------
  if (!selectedSession) {
    return (
      <>
        <AppHeader />
        <PageLayout>
          <PageTitle>Study</PageTitle>
          <p style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 28 }}>
            Choose a session to start tutoring, or go to Set Goals to create a new one.
          </p>

          {sessionsLoading || sessionLoading ? (
            <EmptyState><SpinnerIcon /><p style={{ fontSize: 13, color: theme.colors.textMuted }}>Loading sessions...</p></EmptyState>
          ) : sessionsError ? (
            <ErrorMsg>{sessionsError}</ErrorMsg>
          ) : sessions.length === 0 ? (
            <EmptyState>
              <div style={{ fontSize: 36 }}>🎓</div>
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

  // ------- Render: 튜터 세션 -------
  const isInputDisabled = phase === 'thinking' || phase === 'explaining' || phase === 'complete' || phase === 'summary'
  const isMicDisabled = isInputDisabled || sttLoading

  return (
    <>
      <AppHeader />
      <PageLayout>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Button variant="ghost" size="sm" onClick={handleEndSession}>← Back</Button>
          <PageTitle style={{ marginBottom: 0 }}>{selectedSession.title}</PageTitle>
          <Badge color={selectedSession.status === 'active' ? 'green' : 'blue'}>{selectedSession.status}</Badge>
        </div>

        <SessionLayout>
          {/* 사이드바 */}
          <Sidebar>
            <SideSection>
              <SideLabel>Session</SideLabel>
              <div style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.fonts.mono, lineHeight: 1.9 }}>
                <div>ID: {selectedSession.sessionId.slice(0, 10)}…</div>
                <div>Sources: {selectedSession.vectorDocIds.length}</div>
                <div>Phase: <span style={{ color: theme.colors.accent }}>{phase}</span></div>
              </div>
            </SideSection>

            {keyConcepts.length > 0 && (
              <SideSection>
                <SideLabel>Key Concepts</SideLabel>
                {keyConcepts.map(c => <Concept key={c}>{c}</Concept>)}
              </SideSection>
            )}

            {phase !== 'idle' && (
              <Button variant="secondary" size="sm" fullWidth onClick={handleEndSession}>
                End Session
              </Button>
            )}
          </Sidebar>

          {/* 메인 */}
          <MainPanel>
            {phase === 'idle' ? (
              // 시작 화면
              <Card>
                <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
                  <p style={{ fontSize: 17, color: theme.colors.textPrimary, fontWeight: 600, marginBottom: 10 }}>
                    AI Tutor — {selectedSession.title}
                  </p>
                  <p style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 36, lineHeight: 1.6 }}>
                    AI가 먼저 개념을 설명하고, 소크라틱 질문으로 이해를 확인합니다.<br/>
                    마이크로 음성 답변하거나 텍스트로 입력하세요.
                  </p>
                  <Button variant="primary" size="lg" onClick={handleStartTutor}>
                    Start Tutoring Session
                  </Button>
                  {error && <ErrorMsg style={{ marginTop: 12 }}>{error}</ErrorMsg>}
                </div>
              </Card>
            ) : phase === 'explaining' ? (
              // 설명 생성 중
              <Card>
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <SpinnerIcon style={{ margin: '0 auto 16px' }} />
                  <p style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                    AI가 {selectedSession.title}에 대해 학습 내용을 준비하고 있습니다…
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* 채팅 */}
                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      AI Tutor
                      {phase === 'thinking' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 8 }}>
                          <ThinkingDot /><ThinkingDot /><ThinkingDot />
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <ChatWindow>
                    {chatMsgs.map(m => (
                      <ChatMsg key={m.id} role={m.role} kind={m.kind}>
                        <ChatLabel>
                          {m.role === 'user' ? 'You' :
                           m.kind === 'explain' ? '🎓 AI Tutor · Explanation' :
                           m.kind === 'question' ? '❓ AI Tutor · Question' :
                           m.kind === 'feedback' ? '💬 AI Tutor · Feedback' :
                           m.kind === 'supplement' ? '📖 AI Tutor · Supplement' :
                           'AI Tutor'}
                        </ChatLabel>
                        <ChatBubble role={m.role} kind={m.kind}>{m.content}</ChatBubble>
                      </ChatMsg>
                    ))}
                    <div ref={chatEndRef} />
                  </ChatWindow>
                </Card>

                {/* 요약 카드 */}
                {phase === 'summary' && summaryData && (
                  <SummaryCard>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 22 }}>✅</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: theme.colors.textPrimary }}>
                        Learning Complete
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: theme.colors.textSecondary, lineHeight: 1.7, marginBottom: 16 }}>
                      {summaryData.summary}
                    </p>
                    {summaryData.strengths.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontFamily: theme.fonts.mono, color: '#4ade80', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Strengths</p>
                        {summaryData.strengths.map(s => (
                          <div key={s} style={{ fontSize: 13, color: theme.colors.textSecondary, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#4ade80' }}>✓</span> {s}
                          </div>
                        ))}
                      </div>
                    )}
                    {summaryData.areas_to_review.length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, fontFamily: theme.fonts.mono, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Areas to Review</p>
                        {summaryData.areas_to_review.map(s => (
                          <div key={s} style={{ fontSize: 13, color: theme.colors.textSecondary, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#fbbf24' }}>△</span> {s}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: 20 }}>
                      <Button variant="primary" size="sm" onClick={handleEndSession}>Finish & Back</Button>
                    </div>
                  </SummaryCard>
                )}

                {/* 입력 영역 */}
                {(phase === 'questioning' || phase === 'thinking') && (
                  <InputArea>
                    <MicBtn
                      $recording={recording}
                      disabled={isMicDisabled}
                      onClick={handleMic}
                    >
                      {sttLoading ? '…' : recording ? '⏹' : '🎙'}
                    </MicBtn>
                    <TextInput
                      placeholder={recording ? 'Recording…' : 'Type your answer here… (Enter to send)'}
                      value={textAnswer}
                      onChange={e => setTextAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isInputDisabled || recording}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSendText}
                      disabled={!textAnswer.trim() || isInputDisabled}
                    >
                      {phase === 'thinking' ? <SpinnerIcon /> : 'Send'}
                    </Button>
                  </InputArea>
                )}

                {error && <ErrorMsg>{error}</ErrorMsg>}
              </>
            )}
          </MainPanel>
        </SessionLayout>
      </PageLayout>
    </>
  )
}
