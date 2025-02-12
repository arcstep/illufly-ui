'use client';

import { PropsWithChildren } from 'react';
import '../app/globals.css';

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="zh-CN">
      <head />
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}