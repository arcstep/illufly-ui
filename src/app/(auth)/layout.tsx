import { JSX } from 'react';
import '../../app/globals.css';

export default function AuthLayout({ children }: { children: JSX.Element }): JSX.Element {
    return (
        <div className="min-h-screen bg-gray-100">
            {children}
        </div>
    );
}