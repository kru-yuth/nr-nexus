import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';

const AdminDashboard = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="max-w-7xl mx-auto p-8">
                <div className="bg-white rounded-lg shadow p-6 mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">{t('admin_dashboard')}</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* User Management Widget */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold mb-4 text-green-600">{t('user_management')}</h3>
                        <p className="text-gray-500 mb-4">{t('user_mgmt_desc')}</p>
                        <Link to="/admin-dashboard/users" className="text-blue-500 hover:underline">
                            {t('go_to_user_mgmt')} &rarr;
                        </Link>
                    </div>

                    {/* Volunteer Management Widget */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold mb-4 text-green-600">{t('volunteer_management')}</h3>
                        <p className="text-gray-500 mb-4">{t('post_job_desc')}</p>
                        <Link to="/admin-dashboard/volunteer" className="text-blue-500 hover:underline">
                            {t('go_to_volunteer_mgmt')} &rarr;
                        </Link>
                    </div>

                    {/* System Settings Widget (Placeholder) */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold mb-4 text-green-600">{t('system_settings')}</h3>
                        <p className="text-gray-500">{t('system_settings_desc')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;