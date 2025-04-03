import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function ResponseWaitingIndicator() {
    return (
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            <span>正在思考...</span>
        </div>
    );
} 