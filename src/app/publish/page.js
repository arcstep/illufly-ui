'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';

export default function PublishPage() {
    const { user, logout, fetchUser, refreshToken } = useAuth();
    const [error, setError] = useState(null);

    if (!user) return null;

    if (error) {
        return (
            <div className="flex-1 p-4">
                <div className="text-red-500">错误: {error}</div>
                <button
                    onClick={loadFiles}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    重试
                </button>
            </div>
        );
    }

    return (
        <div className="p-10 h-screen flex flex-col">
            <Header
                username={user.username}
                onLogout={logout}
                onFetchUser={fetchUser}
                onRefreshToken={refreshToken}
                currentPath="/publish"
            />
            <div className="flex-1 overflow-y-auto min-h-[150px] p-4">
            </div>
        </div>
    );
}