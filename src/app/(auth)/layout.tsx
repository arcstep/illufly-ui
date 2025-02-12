// src/app/layout.js
'use client';

import { JSX } from 'react';
import '../../app/globals.css';

export default function RootLayout({ children }: { children: JSX.Element }): JSX.Element {
    return (
        <html lang="zh-CN">
            <head />
            <body>
                <main>{children}</main>
            </body>
        </html>
    );
}