import React, { useState, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { Card, CardHeader, CardTitle, PageLayout, PageTitle, Badge } from '../components/Card'
import { theme } from '../styles/theme'
import type { Lesson, StudyGoal } from './AimPage'

// ---- API (ready for integration) ----
const API_BASE = ''
export const startSession = async (lessonId: string): Promise<{ sessionId: string; firstQuestion: string }> => {
  const res = await fetch(`${API_BASE}/api/session/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId }) })
  return res.json()
}
export const submitAnswer = async (sessionId: string, audioBlob: Blob): Promise<{ nextQuestion: string | null; completedGoals: string[]; feedback: string }> => {
  const form = new FormData()
  form.append('session_id', sessionId)
  form.append('audio', audioBlob, 'answer.webm')
  const res = await fetch(`${API_BASE}/api/session/answer`, { method: 'POST', body: form })
  return res.json()
}
// -------------------------------------

const pulse = keyframes`0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.7}`
const ripple = keyframes`0%{transform:scale(0.9);opacity:0.5}100%{transform:scale(1.9);opacity:0}`

const MOCK_LESSONS: Lesson[] = [
  {
    id: 'lesson-001',
    title: 'Data Structures — Foundations',
    files: ['lecture_01_data_structures.pdf'],
    mode: 'basic',
    createdAt: '2025-05-01T09:00:00Z',
    goals: [
      { id: 'g1', text: 'Explain the structural difference between arrays and linked lists, and how each allocates memory.', questions: ['Why is array indexing O(1)?', 'Why is mid-list insertion more efficient in a linked list?', 'What distinguishes a static from a dynamic array?'] },
      { id: 'g2', text: 'Understand how stacks and queues work and describe real-world use cases.', questions: ['Explain LIFO vs FIFO with examples.', 'Describe the relationship between recursion and the call stack.', 'Why is a queue used in BFS?'] },
      { id: 'g3', text: 'Correctly define core tree terminology: root, leaf, depth, and height.', questions: ['Difference between a complete and perfect binary tree?', 'Compare DFS and BFS in trees.', 'What makes BST search O(log n)?'] },
    ],
  },
  {
    id: 'lesson-002',
    title: 'Algorithm Complexity Analysis',
    files: ['lecture_02_algorithms.pdf', 'lecture_03_complexity.pdf'],
    mode: 'applied',
    createdAt: '2025-05-02T14:00:00Z',
    goals: [
      { id: 'g4', text: 'Explain Big-O notation and major complexity classes.', questions: ['Practical difference between O(n log n) and O(n²)?', 'Explain the space-time complexity tradeoff.', 'Why analyze worst, average, and best cases separately?'] },
      { id: 'g5', text: 'Compare sorting algorithms and choose appropriately by situation.', questions: ['Why is Quicksort faster on average than Merge Sort?', 'Give a use case where a stable sort is required.', 'What is the space complexity advantage of Heap Sort?'] },
    ],
  },
]

const MOCK_QUESTIONS = [
  'Please explain why array indexing is O(1) from a memory perspective.',
  'Good. Now, how does a dynamic array handle the complexity issue when appending elements?',
  'Give an example of a situation where a linked list would be preferable to an array.',
]

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

const GoalItem = styled.div<{ completed: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: ${theme.radii.md};
  border: 1px solid ${(p: any) => p.completed ? 'rgba(22,163,74,0.25)' : theme.colors.border};
  background: ${(p: any) => p.completed ? 'rgba(22,163,74,0.04)' : 'transparent'};
  margin-bottom: 7px;
  transition: all 0.3s;
`

const GoalCheckCircle = styled.div<{ completed: boolean }>`
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 1.5px solid ${(p: any) => p.completed ? theme.colors.success : theme.colors.border};
  background: ${(p: any) => p.completed ? theme.colors.success : 'transparent'};
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; font-size: 10px; color: #fff;
  transition: all 0.3s; margin-top: 1px;
`

const GoalItemText = styled.p<{ completed: boolean }>`
  font-size: 12px;
  color: ${(p: any) => p.completed ? theme.colors.textMuted : theme.colors.textSecondary};
  line-height: 1.5;
  text-decoration: ${(p: any) => p.completed ? 'line-through' : 'none'};
`

const MainPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const QuestionBox = styled.div`
  padding: 28px 32px;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.lg};
  background: ${theme.colors.bgCard};
  min-height: 130px;
  position: relative;
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

const QuestionText = styled.p`
  font-size: 18px;
  font-weight: 400;
  color: ${theme.colors.textPrimary};
  line-height: 1.65;
  letter-spacing: -0.01em;
  font-family: ${theme.fonts.display};
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

const InlineBox = styled.div<{ variant?: 'feedback' }>`
  padding: 18px 20px;
  background: ${(p: any) => p.variant === 'feedback' ? 'rgba(22,163,74,0.06)' : theme.colors.bgCard};
  border: 1px solid ${(p: any) => p.variant === 'feedback' ? 'rgba(22,163,74,0.2)' : theme.colors.border};
  border-radius: ${theme.radii.lg};
`

const InlineLabel = styled.div<{ variant?: 'feedback' }>`
  font-size: 10px;
  color: ${(p: any) => p.variant === 'feedback' ? theme.colors.successLight : theme.colors.textMuted};
  font-family: ${theme.fonts.mono};
  margin-bottom: 7px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
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

export const StudyPage: React.FC = () => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [recording, setRecording] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [qIndex, setQIndex] = useState(0)
  const [completedGoals, setCompletedGoals] = useState<string[]>([])
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState('')
  const [ttsActive, setTtsActive] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const allDone = selectedLesson ? completedGoals.length >= selectedLesson.goals.length : false

  const playTTS = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'; u.rate = 0.92
    setTtsActive(true)
    u.onend = () => setTtsActive(false)
    window.speechSynthesis.speak(u)
  }

  const handleStart = async () => {
    setSessionStarted(true); setQIndex(0); setCompletedGoals([]); setTranscript(''); setFeedback('')
    await new Promise(r => setTimeout(r, 300))
    playTTS(MOCK_QUESTIONS[0])
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
          setWaiting(true); setTranscript('[Transcribing...]')
          await new Promise(r => setTimeout(r, 1500))
          const mockTx = 'An array stores elements in contiguous memory, so given any index you can compute the address directly via a base-pointer plus offset — that\'s a single operation, hence O(1).'
          setTranscript(mockTx)
          await new Promise(r => setTimeout(r, 800))
          let newGoals: string[] = []
          if (qIndex === 0) {
            newGoals = ['g1']
            setFeedback('Correct! You identified contiguous memory and offset calculation. Goal 1 achieved.')
          }
          if (newGoals.length) setCompletedGoals(prev => [...prev, ...newGoals])
          const nextQ = MOCK_QUESTIONS[qIndex + 1]
          if (nextQ) {
            await new Promise(r => setTimeout(r, 700))
            setQIndex(i => i + 1); setWaiting(false); playTTS(nextQ)
          } else { setWaiting(false) }
        }
        mr.start(); mediaRef.current = mr; setRecording(true)
      } catch { alert('Microphone permission is required.') }
    } else {
      mediaRef.current?.stop(); setRecording(false)
    }
  }

  if (!selectedLesson) {
    return (
      <>
        <AppHeader />
        <PageLayout>
          <PageTitle>Study</PageTitle>
          <p style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 28 }}>
            Choose a lesson generated from your goals and start your AI tutoring session.
          </p>
          {MOCK_LESSONS.length === 0 ? (
            <EmptyState>
              <div style={{ fontSize: 32 }}>📚</div>
              <p style={{ fontSize: 14, color: theme.colors.textSecondary }}>No lessons yet. Go to Set Goals to create one.</p>
            </EmptyState>
          ) : (
            <LessonGrid>
              {MOCK_LESSONS.map(l => (
                <LessonCard key={l.id} onClick={() => setSelectedLesson(l)}>
                  <LessonTitle>{l.title}</LessonTitle>
                  <LessonMeta>
                    <Badge color={l.mode === 'basic' ? 'blue' : 'yellow'}>{l.mode === 'basic' ? 'Conceptual' : 'Applied'}</Badge>
                    <Badge>{l.goals.length} goals</Badge>
                  </LessonMeta>
                  <p style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 }}>{l.files.join(', ')}</p>
                  <p style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.fonts.mono }}>{new Date(l.createdAt).toLocaleDateString('en-US')}</p>
                </LessonCard>
              ))}
            </LessonGrid>
          )}
        </PageLayout>
      </>
    )
  }

  const currentQ = MOCK_QUESTIONS[qIndex] ?? null

  return (
    <>
      <AppHeader />
      <PageLayout>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedLesson(null); setSessionStarted(false); window.speechSynthesis?.cancel() }}>
            ← Back
          </Button>
          <PageTitle style={{ marginBottom: 0 }}>{selectedLesson.title}</PageTitle>
          <ProgressBadge>
            {completedGoals.length} / {selectedLesson.goals.length} complete
          </ProgressBadge>
        </div>

        <SessionLayout>
          <GoalSidebar>
            <Card padding="14px">
              <CardHeader><CardTitle>Learning Goals</CardTitle></CardHeader>
              {selectedLesson.goals.map(g => {
                const done = completedGoals.includes(g.id)
                return (
                  <GoalItem key={g.id} completed={done}>
                    <GoalCheckCircle completed={done}>{done && '✓'}</GoalCheckCircle>
                    <GoalItemText completed={done}>{g.text}</GoalItemText>
                  </GoalItem>
                )
              })}
            </Card>
          </GoalSidebar>

          <MainPanel>
            {!sessionStarted ? (
              <Card>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 18 }}>🎙️</div>
                  <p style={{ fontSize: 16, color: theme.colors.textPrimary, marginBottom: 8, fontWeight: 500 }}>Ready to start your tutoring session?</p>
                  <p style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 32 }}>
                    The AI tutor will ask questions via text-to-speech. Press the mic button to answer.
                  </p>
                  <Button variant="primary" size="lg" onClick={handleStart}>Start Session</Button>
                </div>
              </Card>
            ) : allDone ? (
              <Card>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>🎉</div>
                  <p style={{ fontSize: 20, fontWeight: 600, color: theme.colors.textPrimary, marginBottom: 8 }}>All Goals Achieved!</p>
                  <p style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 32 }}>
                    You completed all {selectedLesson.goals.length} learning goals.
                  </p>
                  <Button variant="primary" size="lg" onClick={() => { setSelectedLesson(null); setSessionStarted(false) }}>
                    End Session
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <QuestionBox>
                  <QLabel>
                    <SpeakerDot active={ttsActive} />
                    AI Tutor · Question {qIndex + 1}
                    {ttsActive && <span style={{ color: theme.colors.accentLight }}>· Playing</span>}
                  </QLabel>
                  <QuestionText>{currentQ ?? 'Please wait...'}</QuestionText>
                  {currentQ && (
                    <button onClick={() => playTTS(currentQ)}
                      style={{ position: 'absolute', top: 18, right: 20, fontSize: 12, color: theme.colors.textMuted, cursor: 'pointer', background: 'none', border: 'none', fontFamily: theme.fonts.sans }}>
                      🔊 Replay
                    </button>
                  )}
                </QuestionBox>

                <ControlPanel>
                  <MicBtn recording={recording} disabled={waiting || ttsActive || !currentQ} onClick={handleMic}>
                    {recording ? '⏹' : '🎙'}
                  </MicBtn>
                  <ControlInfo>
                    <ControlTitle>
                      {waiting ? 'Analyzing your answer...' : recording ? 'Recording — press again to stop' : 'Press the mic to start your answer'}
                    </ControlTitle>
                    <ControlSub>
                      {ttsActive ? 'Wait for the question to finish playing' : recording ? '🔴 REC' : 'Ready'}
                    </ControlSub>
                  </ControlInfo>
                </ControlPanel>

                {transcript && (
                  <InlineBox>
                    <InlineLabel>Your Answer</InlineLabel>
                    <p style={{ fontSize: 14, color: theme.colors.textSecondary, lineHeight: 1.7, fontStyle: 'italic' }}>{transcript}</p>
                  </InlineBox>
                )}

                {feedback && (
                  <InlineBox variant="feedback">
                    <InlineLabel variant="feedback">Feedback</InlineLabel>
                    <p style={{ fontSize: 14, color: theme.colors.textPrimary, lineHeight: 1.7 }}>{feedback}</p>
                  </InlineBox>
                )}
              </>
            )}
          </MainPanel>
        </SessionLayout>
      </PageLayout>
    </>
  )
}
