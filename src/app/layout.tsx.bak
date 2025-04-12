import './globals.css'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { TTSProvider } from '@/context/TTSContext';

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
                <AuthProvider>
                    <TTSProvider>
                        <SettingsProvider>
                            {children}
                        </SettingsProvider>
                    </TTSProvider>
                </AuthProvider>
            </body>
        </html>
    )
}