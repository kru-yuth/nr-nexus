import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';

import { LayoutGrid, Clock } from 'lucide-react';

const AdminDashboard = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="max-w-7xl mx-auto p-8">
                <div className="bg-white rounded-lg shadow p-6 mb-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">{t('admin_dashboard')}</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* App Hub Widget (Portal) */}
                    <div className="bg-white p-6 rounded-lg shadow border-2 border-emerald-100 hover:border-emerald-500 transition">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <LayoutGrid size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">{t('app_hub_title')}</h3>
                        </div>
                        <p className="text-gray-500 mb-4 text-sm">{t('app_hub_subtitle')}</p>
                        <Link to="/hub" className="inline-flex items-center text-emerald-600 font-bold hover:underline">
                            {t('launch_app')} &rarr;
                        </Link>
                    </div>

                    {/* Late Check-in Monitor Widget */}
                    <div className="bg-white p-6 rounded-lg shadow border-2 border-[#1a5c38]/10 hover:border-[#1a5c38] transition">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-50 rounded-lg text-[#1a5c38]">
                                <Clock size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Late Check-in</h3>
                        </div>
                        <p className="text-gray-500 mb-4 text-sm">Monitor student attendance and behavior scores.</p>
                        <Link to="/admin-dashboard/late-checkin" className="inline-flex items-center text-[#1a5c38] font-bold hover:underline">
                            Monitor Live &rarr;
                        </Link>
                    </div>

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