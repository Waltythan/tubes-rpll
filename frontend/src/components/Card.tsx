import type { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function Card({ children, className = '', style }: CardProps): JSX.Element {
  return <section className={['card-surface', 'content-card', className].join(' ').trim()} style={style}>{children}</section>
}