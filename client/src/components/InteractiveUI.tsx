import React, { useEffect, useRef, useState, useCallback } from 'react'

/* ============================================================================
 * 1. ScrollReveal: 21st.dev BlurFade + Slide Up + Scale on Scroll
 * ============================================================================ */
interface ScrollRevealProps {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale'
  className?: string
  once?: boolean
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delay = 0,
  direction = 'up',
  className = '',
  once = true,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once])

  const getInitialTransform = () => {
    switch (direction) {
      case 'up':
        return 'translate3d(0, 36px, 0) scale(0.97)'
      case 'down':
        return 'translate3d(0, -36px, 0) scale(0.97)'
      case 'left':
        return 'translate3d(36px, 0, 0) scale(0.97)'
      case 'right':
        return 'translate3d(-36px, 0, 0) scale(0.97)'
      case 'scale':
        return 'translate3d(0, 16px, 0) scale(0.92)'
    }
  }

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: '750ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? 'blur(0px)' : 'blur(8px)',
        transform: isVisible ? 'translate3d(0, 0, 0) scale(1)' : getInitialTransform(),
      }}
      className={`transition-all will-change-[transform,opacity,filter] ${className}`}
    >
      {children}
    </div>
  )
}

/* ============================================================================
 * 2. Tilt3DCard: 21st.dev 3D Perspective Card + Dynamic Glare + Spotlight
 * ============================================================================ */
interface Tilt3DCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  spotlightColor?: string
  maxTilt?: number
  glare?: boolean
  className?: string
}

export const Tilt3DCard: React.FC<Tilt3DCardProps> = ({
  children,
  spotlightColor = 'rgba(56, 189, 248, 0.16)',
  maxTilt = 7,
  glare = true,
  className = '',
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)')
  const [spotPos, setSpotPos] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -maxTilt
    const rotateY = ((x - centerX) / centerX) * maxTilt

    setSpotPos({ x, y })
    setTransform(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`
    )
  }

  const handleMouseLeave = () => {
    setOpacity(0)
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)')
  }

  const handleMouseDown = () => {
    setTransform((prev) => prev.replace('scale3d(1.015, 1.015, 1.015)', 'scale3d(0.985, 0.985, 0.985)'))
  }

  const handleMouseUp = () => {
    setTransform((prev) => prev.replace('scale3d(0.985, 0.985, 0.985)', 'scale3d(1.015, 1.015, 1.015)'))
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        transform,
        transition: opacity === 0 ? 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)' : 'transform 0.12s ease-out',
        transformStyle: 'preserve-3d',
      }}
      className={`relative overflow-hidden select-none ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500 z-0"
        style={{
          opacity,
          background: `radial-gradient(480px circle at ${spotPos.x}px ${spotPos.y}px, ${spotlightColor}, transparent 45%)`,
        }}
      />

      {/* Subtle Diagonal Glare Sheen */}
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500 z-0"
          style={{
            opacity: opacity * 0.45,
            background: `radial-gradient(260px circle at ${spotPos.x}px ${spotPos.y}px, rgba(255,255,255,0.18), transparent 60%)`,
          }}
        />
      )}

      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}

/* ============================================================================
 * 3. MagneticRippleButton: 21st.dev Magnetic Pull + Click Ripple Burst
 * ============================================================================ */
interface RippleItem {
  id: number
  x: number
  y: number
}

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  magneticStrength?: number
  className?: string
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  magneticStrength = 0.22,
  className = '',
  onClick,
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [pressed, setPressed] = useState(false)
  const [ripples, setRipples] = useState<RippleItem[]>([])

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current || props.disabled) return
    const rect = btnRef.current.getBoundingClientRect()
    const dx = (e.clientX - (rect.left + rect.width / 2)) * magneticStrength
    const dy = (e.clientY - (rect.top + rect.height / 2)) * magneticStrength
    setOffset({ x: dx, y: dy })
  }

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 })
    setPressed(false)
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const newRipple = {
        id: Date.now(),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
      setRipples((prev) => [...prev, newRipple])
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
      }, 650)
    }
    onClick?.(e)
  }

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={handleClick}
      style={{
        transform: `translate3d(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px, 0) scale(${
          pressed ? 0.95 : 1
        })`,
        transition:
          offset.x === 0 && offset.y === 0
            ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
            : 'transform 0.1s ease-out',
      }}
      className={`relative overflow-hidden cursor-pointer ${className}`}
      {...props}
    >
      {/* Click Ripple Waves */}
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{ left: r.x, top: r.y }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/40 animate-ripple-expand"
        />
      ))}
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  )
}

/* ============================================================================
 * 4. NumberTicker: 21st.dev Animated Counter When Scrolled Into View
 * ============================================================================ */
interface NumberTickerProps {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  suffix = '',
  prefix = '',
  duration = 1200,
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement>(null)
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasAnimated])

  useEffect(() => {
    if (!hasAnimated) return
    let startTimestamp: number | null = null
    const startVal = 0

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      // EaseOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplayValue(Math.round(startVal + eased * (value - startVal)))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }

    window.requestAnimationFrame(step)
  }, [value, duration, hasAnimated])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ============================================================================
 * 5. ScrollProgressBar & FloatingBackToTop (21st.dev Global Scroll Toys)
 * ============================================================================ */
export const ScrollProgressAndFab: React.FC = () => {
  const [scrollPercent, setScrollPercent] = useState(0)
  const [showTopBtn, setShowTopBtn] = useState(false)

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
    setScrollPercent(pct)
    setShowTopBtn(scrollTop > 320)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* Top Laser Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] pointer-events-none bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.9)] transition-[width] duration-100 ease-out"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {/* Floating Back-to-Top Orb with Circular Progress */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="เลื่อนกลับด้านบน"
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-2xl bg-zinc-950/90 backdrop-blur-xl text-white border border-zinc-800 shadow-2xl flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 active:scale-90 hover:border-sky-500/50 group ${
          showTopBtn ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
        }`}
      >
        <svg className="w-5 h-5 text-sky-400 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </>
  )
}

