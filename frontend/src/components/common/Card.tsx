import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps): JSX.Element {
  return <section className={['card-surface', 'content-card', className].join(' ').trim()}>{children}</section>
}