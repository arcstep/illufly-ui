'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function MemoryPage() {
    // const [thoughts, setThoughts] = useState([]);
    const { changeCurrentPath } = useAuth();

    useEffect(() => {
        changeCurrentPath('/memory');
    }, []);

    return (
        <div className="p-5 pt-12 h-screen flex flex-col">
        </div>
    );
}
