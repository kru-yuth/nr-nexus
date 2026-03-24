import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';

const TeacherDashboard = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="max-w-7xl mx-auto p-8">
                <div className="bg-white rounded-lg shadow p-6 mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">{t('dashboard')} (Teacher)</h1>
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
