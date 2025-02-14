'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function PublishPage() {
    const { isAuthenticated, changeCurrentPath } = useAuth();

    useEffect(() => {
        changeCurrentPath('/publish');
    }, []);

    if (!isAuthenticated) return <div>Loading...</div>;

    return (
        <div className="p-5 h-screen flex flex-col">
            <div className="flex-1 overflow-y-auto min-h-[150px] p-4">
            </div>
        </div>
    );
}