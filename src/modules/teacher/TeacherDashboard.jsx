import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../services/auth';

const TeacherDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow p-6 mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">Teacher Workspace</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">{user?.displayName}</span>
                        <button onClick={logoutUser} className="text-red-500 hover:text-red-700 font-medium">Logout</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                        <h3 className="text-lg font-bold mb-2">My Classes</h3>
                        <p className="text-gray-500">View and manage assigned courses.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
