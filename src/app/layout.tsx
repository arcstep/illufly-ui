import './globals.css'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SettingsProvider } from '@/context/SettingsContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Illufly',
    description: 'AI Assistant',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="zh" suppressHydrationWarning>
            <body className={`${inter.className} antialiased`}>
                <SettingsProvider>
                    {children}
                </SettingsProvider>
            </body>
        </html>
    )
}