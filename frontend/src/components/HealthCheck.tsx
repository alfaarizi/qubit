import React, { useState, useEffect } from 'react';
import { healthAPI } from '../services/api';

const HealthCheck: React.FC = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        healthAPI.check()
            .then(() => setStatus('success'))
            .catch(() => setStatus('error'));
    }, []);

    const styles = {
        loading: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        success: 'bg-green-100 text-green-800 border-green-300',
        error: 'bg-red-100 text-red-800 border-red-300'
    };

    const messages = {
        loading: 'Checking backend...',
        success: 'Backend connected successfully',
        error: `Backend unavailable at ${import.meta.env.VITE_API_BASE_URL}`
    };

    return (
        <div className={`border-2 rounded-lg p-4 ${styles[status]}`}>
            <p className="font-medium">{messages[status]}</p>
        </div>
    );
};

export default HealthCheck;