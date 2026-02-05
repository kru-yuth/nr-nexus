import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../services/auth';

const AdminDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow p-6 mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">Welcome, {user?.displayName}</span>
                        <button
                            onClick={logoutUser}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Admin Widgets Placeholders */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold mb-4 text-green-600">User Management</h3>
                        <p className="text-gray-500">Manage students, teachers, and parents.</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold mb-4 text-green-600">System Settings</h3>
                        <p className="text-gray-500">Configure semester dates and grading.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
