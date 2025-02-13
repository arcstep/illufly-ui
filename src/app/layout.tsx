'use client'
import { useEffect } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING == 'enabled') {
      import('@/mirage/index').then(({ makeServer }) => {
        makeServer()
      })
    }
  }, [])

  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}