import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../services/auth';

const ParentDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-green-50 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-green-900">Parent Portal</h1>
                    <button onClick={logoutUser} className="bg-white text-green-900 px-6 py-2 rounded-full shadow hover:shadow-md transition">
                        Log Out
                    </button>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-sm">
                    <h2 className="text-xl font-bold mb-6">My Children</h2>
                    <p className="text-gray-500 italic">No students linked to this account yet.</p>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;
