import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';

const ParentDashboard = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-green-50">
            <Navbar />
            <div className="max-w-5xl mx-auto p-6">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-green-900">{t('dashboard')} (Parent)</h1>
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
