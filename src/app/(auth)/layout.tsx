import { JSX, Suspense } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';

export default function AuthLayout({ children }: { children: JSX.Element }): JSX.Element {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SettingsProvider>
                <AuthProvider>
                    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                        {children}
                    </div>
                </AuthProvider>
            </SettingsProvider>
        </Suspense>
    );
}