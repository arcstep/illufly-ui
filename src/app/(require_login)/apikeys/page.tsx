'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useApikeys, ApikeysProvider } from '../../../context/ApikeysContext';

export default function ApikeysPage() {
    const { user_id } = useAuth();
    const { apikeys, currentApikey, createApikey, revokeApikey, changeCurrentApikey } = useApikeys();

    useEffect(() => {
    }, []);

    return (
        <ApikeysProvider>
            <div className="p-5 h-screen flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-[150px] p-4">
                    {apikeys.map((ak) => (
                        <div key={ak.apikey}>
                            <p>{ak.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </ApikeysProvider>
    );
}