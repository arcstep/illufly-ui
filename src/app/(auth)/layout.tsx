import { JSX } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import '../../app/globals.css';

export default function AuthLayout({ children }: { children: JSX.Element }): JSX.Element {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-gray-100">
                {children}
            </div>
        </AuthProvider>
    );
}