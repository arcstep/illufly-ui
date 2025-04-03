'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { DocumentProvider } from '@/context/DocumentContext';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ChatProvider>
                <DocumentProvider>
                    {children}
                </DocumentProvider>
            </ChatProvider>
        </AuthProvider>
    );
} 