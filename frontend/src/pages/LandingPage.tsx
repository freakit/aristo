import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'
import { theme } from '../styles/theme'

const Page = styled.div`
  background: #050505;
  min-height: 100vh;
  color: #F5F3EE;
  overflow-x: hidden;
  position: relative;
`

const Header = styled.header`
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 40px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  background: rgba(5,5,5,0.85);
  backdrop-filter: blur(16px);
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
`

const LogoMark = styled.div`
  width: 32px; height: 32px;
  border: 1.5px solid rgba(255,255,255,0.85);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.fonts.display};
  font-size: 17px;
  font-style: italic;
  font-weight: 300;
  color: #ffffff;
`

const LogoText = styled.span`
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #ffffff;
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const HeaderBtn = styled.button<{ primary?: boolean }>`
  padding: 7px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  font-family: ${theme.fonts.sans};
  cursor: pointer;
  transition: all 0.15s;
  background: ${(p: any) => p.primary ? '#2563EB' : 'transparent'};
  color: ${(p: any) => p.primary ? '#fff' : 'rgba(255,255,255,0.75)'};
  border: 1px solid ${(p: any) => p.primary ? '#2563EB' : 'rgba(255,255,255,0.18)'};
  &:hover {
    background: ${(p: any) => p.primary ? '#1D4ED8' : 'rgba(255,255,255,0.09)'};
    color: #fff;
    border-color: ${(p: any) => p.primary ? '#1D4ED8' : 'rgba(255,255,255,0.35)'};
  }
`

const Canvas = styled.canvas`
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 0;
  display: block;
`

const Hero = styled.section`
  position: relative;
  z-index: 10;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 120px 40px 80px;
`

const CompanyTag = styled.span`
  display: inline-block;
  font-family: ${theme.fonts.mono};
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.55);
  margin-bottom: 36px;
  border: 1px solid rgba(255,255,255,0.14);
  padding: 5px 16px;
  border-radius: 100px;
`

const HeroTitle = styled.h1`
  font-family: ${theme.fonts.display};
  font-size: clamp(56px, 8vw, 96px);
  font-weight: 300;
  line-height: 1.06;
  letter-spacing: -0.02em;
  margin-bottom: 28px;
  color: #ffffff;

  em {
    font-style: italic;
    color: rgba(255,255,255,0.45);
  }
`

const HeroSub = styled.p`
  font-size: 17px;
  color: rgba(255,255,255,0.6);
  max-width: 500px;
  line-height: 1.8;
  margin-bottom: 52px;
`

const CTARow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const CTAPrimary = styled.button`
  padding: 15px 36px;
  background: #ffffff;
  color: #080808;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  font-family: ${theme.fonts.sans};
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: #f0f0f0; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,255,255,0.12); }
`

const CTASecondary = styled.button`
  padding: 15px 28px;
  background: transparent;
  color: rgba(255,255,255,0.65);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  font-family: ${theme.fonts.sans};
  cursor: pointer;
  transition: all 0.15s;
  &:hover { color: rgba(255,255,255,0.95); border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.04); }
`

const FeatureSection = styled.section`
  position: relative;
  z-index: 10;
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px 40px 100px;
  border-top: 1px solid rgba(255,255,255,0.07);
`

const SectionLabel = styled.div`
  font-family: ${theme.fonts.mono};
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  margin-bottom: 40px;
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  overflow: hidden;
`

const FeatureItem = styled.div`
  background: #050505;
  padding: 40px;
  transition: background 0.2s;
  &:hover { background: #0c0c0c; }
`

const FeatureNum = styled.div`
  font-family: ${theme.fonts.mono};
  font-size: 11px;
  color: rgba(255,255,255,0.22);
  margin-bottom: 20px;
  letter-spacing: 0.1em;
`

const FeatureTitle = styled.h3`
  font-size: 16px;
  font-weight: 500;
  color: rgba(255,255,255,0.92);
  margin-bottom: 10px;
  letter-spacing: -0.01em;
`

const FeatureDesc = styled.p`
  font-size: 14px;
  color: rgba(255,255,255,0.45);
  line-height: 1.75;
`

const Footer = styled.footer`
  position: relative;
  z-index: 10;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 28px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const FooterText = styled.span`
  font-size: 12px;
  color: rgba(255,255,255,0.25);
`

const features = [
  { num: '01', title: 'Material-Based Learning', desc: 'Upload your lecture PDFs and we embed them into a vector DB — every question and feedback maps directly to your course content.' },
  { num: '02', title: 'Socratic AI Tutoring', desc: 'Instead of lecturing, your AI tutor asks targeted questions that push you to structure concepts yourself.' },
  { num: '03', title: 'Auto Goal Generation', desc: 'Select a learning mode and Gemini designs precise learning objectives plus the critical questions that verify mastery.' },
]

const GoogleBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 28px;
  background: #fff;
  color: #1a1a1a;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  font-family: ${theme.fonts.sans};
  cursor: pointer;
  transition: all 0.18s;
  box-shadow: 0 2px 12px rgba(0,0,0,0.35);
  &:hover { background: #f1f1f1; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { signInWithGoogle } = useAuth()
  const [signingIn, setSigningIn] = React.useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }
    window.addEventListener('resize', resize)

    interface ShootingStar {
      x: number; y: number
      vx: number; vy: number
      len: number; speed: number
      trail: number; opacity: number
      delay: number; active: boolean
      width: number
    }

    const makestar = (): ShootingStar => ({
      x: Math.random() * w * 1.2 - w * 0.1,
      y: Math.random() * h - 50,
      vx: 0, vy: 0,
      len: 80 + Math.random() * 120,
      speed: 3 + Math.random() * 4,
      trail: 0, opacity: 0,
      delay: Math.random() * 180,
      active: false,
      width: 0.8 + Math.random() * 1.0,
    })

    const ANGLE = Math.PI / 5.5
    const COS = Math.cos(ANGLE)
    const SIN = Math.sin(ANGLE)

    const stars: ShootingStar[] = Array.from({ length: 22 }, makestar)

    // Static bg stars
    const bgStars: { x: number; y: number; r: number; phase: number }[] = Array.from({ length: 180 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.0,
      phase: Math.random() * Math.PI * 2,
    }))

    let frame = 0
    let raf: number

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      // Background stars
      const t = frame * 0.007
      for (const s of bgStars) {
        const op = 0.1 + Math.sin(t + s.phase) * 0.06
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${op})`
        ctx.fill()
      }

      // Shooting stars
      for (const s of stars) {
        if (!s.active) {
          if (frame >= s.delay) { s.active = true }
          else continue
        }

        s.trail += s.speed
        const fadeIn = Math.min(1, s.trail / 30)
        const fadeOut = s.trail > s.len ? Math.max(0, 1 - (s.trail - s.len) / 40) : 1
        s.opacity = fadeIn * fadeOut

        const headX = s.x + s.trail * COS
        const headY = s.y + s.trail * SIN
        const tailLen = Math.min(s.trail, s.len)
        const tailX = headX - tailLen * COS
        const tailY = headY - tailLen * SIN

        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY)
        grad.addColorStop(0, 'rgba(255,255,255,0)')
        grad.addColorStop(0.6, `rgba(200,210,255,${s.opacity * 0.5})`)
        grad.addColorStop(1, `rgba(255,255,255,${s.opacity})`)

        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(headX, headY)
        ctx.strokeStyle = grad
        ctx.lineWidth = s.width
        ctx.stroke()

        // Bright head glow
        const glowGrad = ctx.createRadialGradient(headX, headY, 0, headX, headY, 4)
        glowGrad.addColorStop(0, `rgba(255,255,255,${s.opacity})`)
        glowGrad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.beginPath()
        ctx.arc(headX, headY, 4, 0, Math.PI * 2)
        ctx.fillStyle = glowGrad
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(headX, headY, s.width * 0.9, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.opacity})`
        ctx.fill()

        // Reset when off screen
        if (headX > w + 100 || headY > h + 100 || s.trail > s.len + 60) {
          Object.assign(s, makestar())
          s.x = Math.random() * w * 1.2 - w * 0.1
          s.y = Math.random() * h - 60
          s.delay = frame + Math.random() * 120 + 20
          s.active = false
          s.trail = 0
        }
      }

      frame++
      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const handleLogin = async () => {
    if (signingIn) return
    setSigningIn(true)
    try {
      await signInWithGoogle()
      navigate('/upload')
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Google sign-in error:', err)
      }
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <Page>
      <Canvas ref={canvasRef} />

      <Header>
        <HeaderLeft>
          <LogoMark>A</LogoMark>
          <LogoText>Aristo</LogoText>
        </HeaderLeft>
        <HeaderRight>
          <GoogleBtn onClick={handleLogin} disabled={signingIn}>
            <GoogleIcon />
            {signingIn ? 'Signing in...' : 'Start with Google'}
          </GoogleBtn>
        </HeaderRight>
      </Header>

      <Hero>
        <CompanyTag>FreakIT · Aristo</CompanyTag>
        <HeroTitle>
          Questions<br />
          <em>build</em> understanding
        </HeroTitle>
        <HeroSub>
          Your AI tutor analyzes your lecture materials<br />
          and guides you to real comprehension through Socratic dialogue.
        </HeroSub>
        <CTARow>
          <GoogleBtn onClick={handleLogin} disabled={signingIn} style={{ padding: '15px 36px', fontSize: '16px' }}>
            <GoogleIcon />
            {signingIn ? 'Signing in...' : 'Start Free with Google'}
          </GoogleBtn>
        </CTARow>
      </Hero>

      <FeatureSection>
        <SectionLabel>Core Features</SectionLabel>
        <FeatureGrid>
          {features.map(f => (
            <FeatureItem key={f.num}>
              <FeatureNum>{f.num}</FeatureNum>
              <FeatureTitle>{f.title}</FeatureTitle>
              <FeatureDesc>{f.desc}</FeatureDesc>
            </FeatureItem>
          ))}
        </FeatureGrid>
      </FeatureSection>

      <Footer>
        <FooterText>© 2025 FreakIT. All rights reserved.</FooterText>
        <FooterText>Aristo — AI Tutoring Platform</FooterText>
      </Footer>
    </Page>
  )
}
