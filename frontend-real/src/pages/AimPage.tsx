import React, { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { Card, CardHeader, CardTitle, PageLayout, PageTitle, PageSubtitle, Badge } from '../components/Card'
import { theme } from '../styles/theme'

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

// ---- API (ready for integration) ----
const API_BASE = ''
export const generateLesson = async (files: string[], mode: 'basic' | 'applied'): Promise<Lesson> => {
  const res = await fetch(`${API_BASE}/api/lesson/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, mode }),
  })
  return res.json()
}
// -------------------------------------

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

const SectionTitle = styled.h3`
  font-size: 11px;
  font-weight: 600;
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 10px;
`

const GoalCard = styled.div`
  background: ${theme.colors.bgCard};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.md};
  padding: 18px;
  margin-bottom: 10px;
`

const GoalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
`

const GoalNum = styled.div`
  width: 22px; height: 22px;
  border-radius: 50%;
  background: ${theme.colors.accent};
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: ${theme.fonts.mono};
`

const GoalText = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: ${theme.colors.textPrimary};
  line-height: 1.55;
`

const QuestionList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-left: 32px;
`

const QuestionItem = styled.li`
  font-size: 13px;
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
  display: flex;
  gap: 7px;
  &::before {
    content: 'Q.';
    font-family: ${theme.fonts.mono};
    font-size: 10px;
    color: ${theme.colors.textMuted};
    flex-shrink: 0;
    margin-top: 2px;
  }
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

const MOCK_FILES = ['lecture_01_data_structures.pdf', 'lecture_02_algorithms.pdf', 'lecture_03_complexity.pdf']

const MOCK_LESSON: Lesson = {
  id: 'lesson-001',
  title: 'Data Structures — Foundations',
  files: ['lecture_01_data_structures.pdf'],
  mode: 'basic',
  createdAt: new Date().toISOString(),
  goals: [
    {
      id: 'g1',
      text: 'Explain the structural difference between arrays and linked lists, and describe how each allocates memory.',
      questions: ['Why is array indexing O(1) in terms of memory?', 'Why is mid-list insertion more efficient in a linked list than in an array?', 'What distinguishes a static array from a dynamic array?'],
    },
    {
      id: 'g2',
      text: 'Understand how stacks and queues work and describe real-world use cases for each.',
      questions: ['Explain LIFO vs FIFO with everyday examples.', 'Describe the relationship between recursive calls and the call stack.', 'Why is a queue used in BFS traversal?'],
    },
    {
      id: 'g3',
      text: 'Correctly define core tree terminology: root, leaf, depth, and height.',
      questions: ['What is the difference between a complete and a perfect binary tree?', 'Compare depth-first and breadth-first traversal in trees.', 'What prerequisite makes BST search O(log n)?'],
    },
  ],
}

export const AimPage: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [mode, setMode] = useState<'basic' | 'applied' | null>(null)
  const [generating, setGenerating] = useState(false)
  const [lesson, setLesson] = useState<Lesson | null>(null)

  const toggleFile = (f: string) =>
    setSelectedFiles(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const canGenerate = selectedFiles.length > 0 && mode !== null && !generating && !lesson

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // const result = await generateLesson(selectedFiles, mode!)
      await new Promise(r => setTimeout(r, 2200))
      setLesson({ ...MOCK_LESSON, files: selectedFiles, mode: mode! })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <AppHeader />
      <PageLayout>
        <PageTitle>Set Learning Goals</PageTitle>
        <PageSubtitle>Select your materials and learning mode. AI will generate tailored objectives and verification questions.</PageSubtitle>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card>
              <CardHeader>
                <CardTitle>Select Files</CardTitle>
                {selectedFiles.length > 0 && <Badge color="blue">{selectedFiles.length} selected</Badge>}
              </CardHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {MOCK_FILES.map(f => (
                  <FileCheckItem key={f} checked={selectedFiles.includes(f)}>
                    <input type="checkbox" checked={selectedFiles.includes(f)} onChange={() => toggleFile(f)} />
                    <Checkbox checked={selectedFiles.includes(f)}>{selectedFiles.includes(f) && '✓'}</Checkbox>
                    <span style={{ fontSize: 12, color: theme.colors.textPrimary, fontFamily: theme.fonts.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                  </FileCheckItem>
                ))}
              </div>
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

            <Button variant="primary" size="md" fullWidth disabled={!canGenerate} loading={generating} onClick={handleGenerate}>
              Generate Learning Goals
            </Button>
            {lesson && <Button variant="secondary" size="md" fullWidth onClick={() => { setLesson(null); setSelectedFiles([]); setMode(null) }}>Regenerate</Button>}
          </div>

          <div>
            {!generating && !lesson && (
              <EmptyState>
                <div style={{ fontSize: 32 }}>🎯</div>
                <p style={{ fontSize: 15, color: theme.colors.textSecondary }}>Select files and a learning mode,<br />then click Generate.</p>
              </EmptyState>
            )}

            {generating && (
              <EmptyState>
                <SpinnerIcon />
                <p style={{ fontSize: 14, color: theme.colors.textSecondary }}>Gemini is analyzing your materials...</p>
                <p style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: theme.fonts.mono }}>RAG retrieval → Goal derivation → Question generation</p>
              </EmptyState>
            )}

            {lesson && !generating && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{lesson.title}</CardTitle>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge color="blue">{lesson.mode === 'basic' ? 'Conceptual' : 'Applied'}</Badge>
                      {lesson.files.map(f => <Badge key={f}>{f}</Badge>)}
                    </div>
                  </div>
                  <Badge color="green">{lesson.goals.length} goals</Badge>
                </CardHeader>

                <SectionTitle>Learning Objectives & Key Questions</SectionTitle>

                {lesson.goals.map((g, i) => (
                  <GoalCard key={g.id}>
                    <GoalHeader>
                      <GoalNum>{i + 1}</GoalNum>
                      <GoalText>{g.text}</GoalText>
                    </GoalHeader>
                    <QuestionList>
                      {g.questions.map((q, j) => <QuestionItem key={j}>{q}</QuestionItem>)}
                    </QuestionList>
                  </GoalCard>
                ))}

                <div style={{ marginTop: 16 }}>
                  <Button variant="primary" size="md" fullWidth>Go to Study →</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </PageLayout>
    </>
  )
}
