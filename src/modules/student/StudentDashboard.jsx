import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../services/auth';

const StudentDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Student Portal</h1>
                    <p className="text-gray-500 text-sm">Welcome back, {user?.displayName}</p>
                </div>
                <button onClick={logoutUser} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition">
                    Sign Out
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Current Grades</h2>
                    <div className="text-center py-8 text-gray-400">No grades available yet</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => window.location.href = '/student/volunteer'}>
                    <h2 className="text-lg font-semibold mb-2 text-indigo-600">Volunteer Opportunities</h2>
                    <p className="text-gray-500 mb-4">Browse and apply for volunteer jobs to earn points.</p>
                    <button className="text-indigo-600 font-medium hover:underline">View Gallery &rarr;</button>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
