'use client'

import { useEffect, useState } from 'react'

export function ClientWrapper({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className={className} suppressHydrationWarning>
      {mounted ? children : null}
    </div>
  )
}
