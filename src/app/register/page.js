'use client';

import React, { useState, useEffect } from 'react';

export default function RegisterPage() {
    useEffect(() => {
        loadFiles();
    }, []);

    return (
        <div className="p-5 h-screen flex flex-col">
            <div className="h-10"></div>
        </div>
    );
}