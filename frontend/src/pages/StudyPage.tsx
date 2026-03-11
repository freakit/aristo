import React, { useState, useRef, useEffect, useCallback } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { Card, CardHeader, CardTitle, PageLayout, PageTitle, Badge } from '../components/Card'
import { theme } from '../styles/theme'
import { api, createLiveSession, openLiveQuestionWS, getLiveSessionResult } from '../lib/api'
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
  vectorKeys?: string[]
  studyGoals?: string[]
  messages: ChatMsg[]
}

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  kind?: 'explain' | 'question' | 'feedback' | 'supplement' | 'summary' | 'system'
}

type TutorPhase = 'idle' | 'explaining' | 'questioning' | 'thinking' | 'complete' | 'summary'

// ---- Animations ----
const pulse = keyframes`0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:0.7}`
const ripple = keyframes`0%{transform:scale(0.9);opacity:0.5}100%{transform:scale(1.9);opacity:0}`
const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`
const shimmer = keyframes`0%{background-position:-200px 0}100%{background-position:200px 0}`

// ---- Styled Components ----
const GradientBg = keyframes`
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
`

const StartOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 480px;
  background: radial-gradient(circle at center, ${theme.colors.accent}11 0%, transparent 70%);
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  padding: 40px;
  text-align: center;
  animation: ${fadeIn} 0.6s ease;
`

const GoalItem = styled.div`
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.md};
  padding: 12px 18px;
  margin-bottom: 8px;
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
  &:hover {
    border-color: ${theme.colors.accent}55;
    background: ${theme.colors.bgHover};
    transform: translateX(4px);
  }
`

const GoalIcon = styled.span`
  color: ${theme.colors.accent};
  font-size: 16px;
`

const StartButton = styled(Button)`
  position: relative;
  overflow: hidden;
  padding: 16px 48px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-top: 32px;
  box-shadow: 0 12px 32px ${theme.colors.accent}33;
  
  &::after {
    content: '';
    position: absolute;
    top: -50%; left: -50%; width: 200%; height: 200%;
    background: linear-gradient(
      45deg, 
      transparent, 
      rgba(255,255,255,0.1), 
      transparent
    );
    transform: rotate(45deg);
    animation: ${shimmer} 3s infinite linear;
    pointer-events: none;
  }
`

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
  const [summaryData, setSummaryData] = useState<any | null>(null)
  const [error, setError] = useState('')
  // Live cumulative transcript buffer (using ref to prevent stale closures)
  const liveAiBufferRef = useRef('')
  const liveUserBufferRef = useRef('')
  const [liveAiDisplay, setLiveAiDisplay] = useState('')
  const [liveUserDisplay, setLiveUserDisplay] = useState('')

  const [missingPoints, setMissingPoints] = useState<string[]>([])
  const [completedPoints, setCompletedPoints] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const nextTimeRef = useRef<number>(0)
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([])

  // Input
  const [textAnswer, setTextAnswer] = useState('')
  const [recording, setRecording] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const isMutedRef = useRef(false)
  const [sttLoading, setSttLoading] = useState(false)

  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  const mediaRef = useRef<MediaStream | null>(null)
  const inputContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
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
    setPhase('explaining')
    setError('')
    setMissingPoints([])
    setCompletedPoints([])
    setIsMuted(false)

    try {
      // 1. Request Mic IMMEDIATELY (User requested to handle permission first)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRef.current = stream

      const topic = selectedSession.title
      const goals = selectedSession.studyGoals || []
      const goals_text = goals.length > 0 ? goals.map(g => `- ${g}`).join('\n') : "No learning goals were set."
      
      // AI behavior instructions (added to system prompt)
      const system_override = (
        `## Today's Learning Goals\n${goals_text}\n\n` +
        `You must lead the conversation based on these goals. ` +
        `Never give away the answers or long explanations upfront. ` +
        `Use 'Socratic questioning' to guide the student to think for themselves. ` +
        `Call the 'mark_completed' tool whenever the student demonstrates understanding or explains a specific concept.`
      )

      const res = await createLiveSession({
        student_info: { id: "student1" },
        exam_info: { name: topic, first_question: "" },
        rag_keys: selectedSession.vectorKeys || undefined,
        system_prompt_override: system_override,
        study_goals: goals,
      })
      setTutorSessionId(res.session_id)

      // Init playback AudioContext
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 })
      audioContextRef.current = ac
      nextTimeRef.current = ac.currentTime

      // Init recording AudioContext
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
      inputContextRef.current = actx
      const micSource = actx.createMediaStreamSource(stream)
      const processor = actx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        if (isMutedRef.current) return // Do not send audio if muted

        const inputData = e.inputBuffer.getChannelData(0)
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]))
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        
        const uint8Array = new Uint8Array(pcm16.buffer)
        let binaryString = ''
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i])
        }
        const base64Audio = btoa(binaryString)
        wsRef.current.send(JSON.stringify({ type: 'audio', data: base64Audio }))
      }

      micSource.connect(processor)
      processor.connect(actx.destination)
      setRecording(true)

      // Connect WS
      const ws = await openLiveQuestionWS(res.session_id)
      wsRef.current = ws
      ws.binaryType = 'arraybuffer'

      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          try {
            const msg = JSON.parse(ev.data)
            if (msg.type === 'ready') {
              setPhase('questioning')
              addMsg({ role: 'assistant', content: msg.message, kind: 'system' })
            } else if (msg.type === 'transcript') {
              addMsg({ role: 'assistant', content: msg.message, kind: 'explain' })
              setCurrentQuestion(msg.message)
            } else if (msg.type === 'tool_call_start') {
              setPhase('thinking')
            } else if (msg.type === 'tool_call_end') {
              setPhase('questioning')
            } else if (msg.type === 'missing_update' || msg.type === 'completed_update') {
              setMissingPoints(msg.data.missing_points || [])
              setCompletedPoints(msg.data.completed_points || [])
            } else if (msg.type === 'turn_complete') {
              // AI turn complete — commit accumulated AI text as chat message
              if (liveAiBufferRef.current.trim()) {
                const committed = liveAiBufferRef.current.trim()
                addMsg({ role: 'assistant', content: committed, kind: 'explain' })
                setCurrentQuestion(committed)
                liveAiBufferRef.current = ''
                setLiveAiDisplay('')
              }
              setPhase('questioning')
            } else if (msg.type === 'input_transcript') {
              // Accumulate user speech
              liveUserBufferRef.current += (liveUserBufferRef.current ? ' ' : '') + msg.text
              setLiveUserDisplay(liveUserBufferRef.current)

              // Immediately stop playing audio when student starts speaking
              activeSourcesRef.current.forEach(src => {
                try { src.stop() } catch (e) {}
              })
              activeSourcesRef.current = []
              if (audioContextRef.current) {
                nextTimeRef.current = audioContextRef.current.currentTime
              }
            } else if (msg.type === 'interrupted') {
              // AI model generation interrupted
              activeSourcesRef.current.forEach(src => {
                try { src.stop() } catch (e) {}
              })
              activeSourcesRef.current = []
              if (audioContextRef.current) {
                nextTimeRef.current = audioContextRef.current.currentTime
              }
            } else if (msg.type === 'output_transcript') {
              // Accumulate AI speech — commit user speech first when AI starts speaking
              if (liveUserBufferRef.current.trim()) {
                addMsg({ role: 'user', content: liveUserBufferRef.current.trim() })
                liveUserBufferRef.current = ''
                setLiveUserDisplay('')
              }
              liveAiBufferRef.current += (liveAiBufferRef.current ? ' ' : '') + msg.text
              setLiveAiDisplay(liveAiBufferRef.current)
            } else if (msg.type === 'session_end') {
              const reasonMap: Record<string, string> = {
                finished:     '✅ Session ended successfully.',
                cancelled:    '⚠️ Session was cancelled.',
                gemini_error: '❌ Session ended due to a Gemini connection error.',
              }
              const display = reasonMap[msg.reason] ?? msg.message ?? 'Session ended.'
              addMsg({ role: 'assistant', content: display, kind: 'system' })
            } else if (msg.type === 'error') {
              addMsg({ role: 'assistant', content: `❌ Error: ${msg.message}`, kind: 'system' })
            }
          } catch (e) {
            console.error('WS Parse Error', e)
          }
        } else {
          // Play binary PCM (Int16 to Float32)
          if (!audioContextRef.current) return
          const pcm16 = new Int16Array(ev.data)
          const float32 = new Float32Array(pcm16.length)
          for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 32768.0
          }
          const buffer = audioContextRef.current.createBuffer(1, float32.length, audioContextRef.current.sampleRate)
          buffer.copyToChannel(float32, 0)
          const source = audioContextRef.current.createBufferSource()
          source.buffer = buffer
          source.connect(audioContextRef.current.destination)
          
          source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source)
          }
          activeSourcesRef.current.push(source)

          if (nextTimeRef.current < audioContextRef.current.currentTime) {
            nextTimeRef.current = audioContextRef.current.currentTime
          }
          source.start(nextTimeRef.current)
          nextTimeRef.current += buffer.duration
        }
      }

      ws.onclose = async () => {
        try {
          const summary = await getLiveSessionResult(res.session_id)
          setSummaryData(summary)
          setPhase('summary')
        } catch {
          setPhase('complete')
        }
      }

    } catch (e: any) {
      setError(`Failed to start tutor: ${e.message}`)
      setPhase('idle')
    }
  }

  const submitAnswer = async (answer: string) => {
    if (!wsRef.current || !answer.trim()) return
    setPhase('thinking'); setError('')

    addMsg({ role: 'user', content: answer })
    setTextAnswer('')

    wsRef.current.send(JSON.stringify({ type: 'text', content: answer }))
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

  const handleMicToggle = () => {
    if (!recording) return
    const newMuted = !isMuted
    setIsMuted(newMuted)
    
    // Explicitly tell Gemini we are done speaking when muting
    if (newMuted && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_turn' }))
    }
  }

  const handleEndSession = async () => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (inputContextRef.current) {
      try { await inputContextRef.current.close() } catch {}
      inputContextRef.current = null
    }
    if (mediaRef.current) {
      mediaRef.current.getTracks().forEach(t => t.stop())
      mediaRef.current = null
    }
    setRecording(false)

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'end' }))
      wsRef.current.close()
    }
    activeSourcesRef.current.forEach(src => {
      try { src.stop() } catch (e) {}
    })
    activeSourcesRef.current = []
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    if (tutorSessionId) {
      try { await api.delete(`/live-question/session/${tutorSessionId}`) } catch { /* ignore */ }
    }
    if (selectedSession) {
      try { await api.patch(`/sessions/${selectedSession.sessionId}/end`) } catch { /* ignore */ }
    }
    setSelectedSession(null)
    setChatMsgs([]); setPhase('idle'); setTutorSessionId(null); setMissingPoints([]); setCompletedPoints([])
    setSummaryData(null); setCurrentQuestion(''); setTextAnswer('')
    setRecording(false); setError('')
    liveAiBufferRef.current = ''
    liveUserBufferRef.current = ''
    setLiveAiDisplay('')
    setLiveUserDisplay('')
    await fetchSessions()
  }

  // ------- Render: Session List -------
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
                    {new Date(s.createdAt).toLocaleDateString('en-US')}
                  </p>
                </LessonCard>
              ))}
            </LessonGrid>
          )}
        </PageLayout>
      </>
    )
  }

  // ------- Render: Tutor Session -------
  const isInputDisabled = phase === 'thinking' || phase === 'explaining' || phase === 'complete' || phase === 'summary'
  const isMicDisabled = isInputDisabled || sttLoading

  return (
    <>
      <AppHeader />
      <PageLayout>
        {phase === 'idle' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>← Back</Button>
              <PageTitle style={{ marginBottom: 0 }}>{selectedSession.title}</PageTitle>
            </div>

            <StartOverlay>
              <div style={{ 
                width: 80, height: 80, 
                background: `${theme.colors.accent}22`, 
                borderRadius: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: 24,
                border: `1px solid ${theme.colors.accent}44`
              }}>
                <span style={{ fontSize: 32 }}>🎙️</span>
              </div>
              
              <h2 style={{ fontSize: 24, fontWeight: 300, marginBottom: 12 }}>Ready for your session?</h2>
              <p style={{ color: theme.colors.textMuted, maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6 }}>
                AI Tutor is ready. Clicking start will <strong style={{color: theme.colors.textPrimary}}>request microphone access</strong>, 
                and the conversation will begin based on your defined learning goals.
              </p>

              {selectedSession.studyGoals && selectedSession.studyGoals.length > 0 && (
                <div style={{ width: '100%', maxWidth: 460, textAlign: 'left' }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.colors.textMuted, marginBottom: 16, marginLeft: 4 }}>
                    Learning Goals
                  </p>
                  {selectedSession.studyGoals.map((g, idx) => (
                    <GoalItem key={idx}>
                      <GoalIcon>✦</GoalIcon>
                      {g}
                    </GoalItem>
                  ))}
                </div>
              )}

              <StartButton variant="primary" size="lg" onClick={handleStartTutor}>
                Start Conversation
              </StartButton>
              
              {error && <p style={{ color: '#f87171', marginTop: 24, fontSize: 13 }}>{error}</p>}
            </StartOverlay>
          </>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Button variant="ghost" size="sm" onClick={handleEndSession}>← Back</Button>
              <PageTitle style={{ marginBottom: 0 }}>{selectedSession.title}</PageTitle>
              <Badge color={selectedSession.status === 'active' ? 'green' : 'blue'}>{selectedSession.status}</Badge>
            </div>

        <SessionLayout>
          {/* Sidebar */}
          <Sidebar>
            <SideSection>
              <SideLabel>Session</SideLabel>
              <div style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.fonts.mono, lineHeight: 1.9 }}>
                <div>ID: {tutorSessionId?.slice(0, 8)}…</div>
                <div>Sources: {selectedSession.vectorDocIds.length}</div>
                <div>Phase: <span style={{ color: theme.colors.accent }}>{phase}</span></div>
              </div>
            </SideSection>

            {completedPoints.length > 0 && (
              <SideSection>
                <SideLabel>Completed Points</SideLabel>
                {completedPoints.map(c => <Concept key={c} style={{borderColor: '#4ade8055'}}>{c}</Concept>)}
              </SideSection>
            )}

            {missingPoints.length > 0 && (
              <SideSection>
                <SideLabel>Missing Points</SideLabel>
                {missingPoints.map(c => <Concept key={c} style={{borderColor: '#fbbf2455'}}>{c}</Concept>)}
              </SideSection>
            )}

            <Button variant="ghost" size="sm" fullWidth onClick={handleEndSession} style={{ marginTop: 12 }}>
              End Session
            </Button>
          </Sidebar>

          {/* Main */}
          <MainPanel>
            {phase === 'explaining' ? (
              // Generating explanation
              <Card>
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <SpinnerIcon style={{ margin: '0 auto 16px' }} />
                  <p style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                    AI is preparing learning content for {selectedSession.title}…
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* Chat */}
                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Learning Partner
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
                           m.kind === 'explain' ? '💡 Partner · Exploring' :
                           m.kind === 'question' ? '❓ Partner · Curious' :
                           m.kind === 'feedback' ? '💬 Partner · Feedback' :
                           m.kind === 'supplement' ? '📖 Partner · Info' :
                           'AI Partner'}
                        </ChatLabel>
                        <ChatBubble role={m.role} kind={m.kind}>{m.content}</ChatBubble>
                      </ChatMsg>
                    ))}
                    <div ref={chatEndRef} />
                  </ChatWindow>
                </Card>

                {/* Live cumulative subtitles */}
                {(liveAiDisplay || liveUserDisplay) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {liveAiDisplay && (
                      <div style={{
                        padding: '10px 16px',
                        borderRadius: theme.radii.md,
                        background: '#1e3a5f',
                        border: '1px solid #2a4a7080',
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                      }}>
                        <span style={{ fontSize: 12, fontFamily: theme.fonts.mono, color: '#60a5fa', whiteSpace: 'nowrap', paddingTop: 2 }}>🤖 AI</span>
                        <span style={{ fontSize: 13, color: theme.colors.textPrimary, lineHeight: 1.6 }}>{liveAiDisplay}</span>
                      </div>
                    )}
                    {liveUserDisplay && (
                      <div style={{
                        padding: '10px 16px',
                        borderRadius: theme.radii.md,
                        background: `${theme.colors.accent}18`,
                        border: `1px solid ${theme.colors.accent}44`,
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                      }}>
                        <span style={{ fontSize: 12, fontFamily: theme.fonts.mono, color: theme.colors.accent, whiteSpace: 'nowrap', paddingTop: 2 }}>🎤 You</span>
                        <span style={{ fontSize: 13, color: theme.colors.textPrimary, lineHeight: 1.6 }}>{liveUserDisplay}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary card */}
                {phase === 'summary' && summaryData && (
                  <SummaryCard>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 22 }}>✅</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: theme.colors.textPrimary }}>
                        Session Result
                      </span>
                    </div>
                    {summaryData.duration_seconds && (
                      <p style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 10 }}>
                        Duration: {Math.round(summaryData.duration_seconds)}s
                      </p>
                    )}
                    {summaryData.completed_points?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontFamily: theme.fonts.mono, color: '#4ade80', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Explored (Completed)</p>
                        {summaryData.completed_points.map((s: any) => (
                          <div key={s.point} style={{ fontSize: 13, color: theme.colors.textSecondary, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#4ade80' }}>✓</span> {s.point}
                          </div>
                        ))}
                      </div>
                    )}
                    {summaryData.missing_points?.length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, fontFamily: theme.fonts.mono, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>To Explore Next (Missing)</p>
                        {summaryData.missing_points.map((s: string) => (
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

                {/* Input area */}
                {(phase === 'questioning' || phase === 'thinking') && (
                  <InputArea>
                    <MicBtn
                      $recording={recording && !isMuted}
                      disabled={isMicDisabled && !recording}
                      onClick={handleMicToggle}
                    >
                      {sttLoading ? '…' : (recording && !isMuted) ? '🎙' : '🔇'}
                    </MicBtn>
                    <TextInput
                      placeholder={recording ? 'Listening…' : 'Type your thoughts here… (Enter to send)'}
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
          </>
        )}
      </PageLayout>
    </>
  )
}
