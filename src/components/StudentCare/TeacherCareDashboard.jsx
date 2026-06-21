import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { getClassSDQSummary } from '../../services/careService';
import Navbar from '../common/Navbar';
import CompletionStatCard from './CompletionStatCard';
import StudentRiskRow from './StudentRiskRow';
import PDFExportButton from './pdf/PDFExportButton';
import { Card, Button, LoadingSpinner, EmptyState } from '../ui';
import { Search, Heart, Info, ArrowUpDown, Filter, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeacherCareDashboard() {
    const { user: currentUser } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [colorFilter, setColorFilter] = useState('all'); // 'all' | 'green' | 'yellow' | 'red' | 'noData'
    const [sortBy, setSortBy] = useState('risk'); // 'risk' | 'name'

    const schoolYear = "2569"; // Current academic year as configured

    const getHomeroomInfo = () => {
        if (!currentUser?.homeroomClass) return null;
        if (currentUser.homeroomClass.includes('/')) {
            const [l, c] = currentUser.homeroomClass.split('/');
            return { level: l, class: c, full: currentUser.homeroomClass };
        }
        return { level: currentUser.level, class: currentUser.homeroomClass, full: `${currentUser.level}/${currentUser.homeroomClass}` };
    };

    const room = getHomeroomInfo();

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!room) return;
            try {
                setLoading(true);
                const data = await getClassSDQSummary(room.full, schoolYear);
                setSummary(data);
            } catch (err) {
                console.error("Error loading TeacherCareDashboard:", err);
                toast.error(t('operation_failed'));
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [currentUser]);

    if (!room) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Navbar showBack={true} />
                <Card className="max-w-md mx-auto p-12 text-center border border-slate-100 shadow-xl">
                    <Info size={48} className="text-slate-200 mx-auto mb-6" />
                    <h3 className="text-xl font-black text-slate-400 uppercase italic">
                        {t('no_homeroom_assigned')}
                    </h3>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar showBack={true} />
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <LoadingSpinner size="lg" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                        {t('loading')}
                    </p>
                </div>
            </div>
        );
    }

    const { completionStats = {}, studentRiskList = [], colorCounts = {} } = summary || {};
    const noDataCount = studentRiskList.filter(s => s.trafficLight === null).length;

    // Filter and Sort students
    const processedStudents = [...studentRiskList]
        .filter(s => {
            // Search filter
            const matchSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (s.studentNo || '').includes(searchTerm);
            if (!matchSearch) return false;

            // Color status filter
            if (colorFilter === 'all') return true;
            if (colorFilter === 'noData') return s.trafficLight === null;
            return s.trafficLight === colorFilter;
        })
        .sort((a, b) => {
            if (sortBy === 'risk') {
                const priority = { red: 0, yellow: 1, green: 2, null: 3 };
                const pA = priority[a.trafficLight] ?? 3;
                const pB = priority[b.trafficLight] ?? 3;
                return pA - pB;
            } else {
                return (a.name || '').localeCompare(b.name || '');
            }
        });

    const handleViewDetail = (student) => {
        if (student.caseId) {
            navigate(`/student-care/case/${student.caseId}`);
        } else {
            // Navigate to case creation endpoint
            navigate(`/student-care/case/new?studentId=${student.studentId}&schoolYear=${schoolYear}`);
        }
    };

    const handleAssess = (student) => {
        navigate(`/student-care/sdq/teacher/${student.studentId}?schoolYear=${schoolYear}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <Navbar showBack={true} />

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-wider">
                            Student Care Module
                        </span>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight uppercase italic mt-2">
                            {t('careCase.dashboard.title')} <span className="text-primary">{room.full}</span>
                        </h1>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">
                            Academic Year {schoolYear}
                        </p>
                    </div>
                    {summary && (
                        <PDFExportButton 
                            type="class"
                            data={{
                                homeroomClass: room.full,
                                schoolYear: schoolYear,
                                classSummary: summary
                            }}
                            fileName={`ม.${room.full.replace('/', '-')}_SDQ_Summary.pdf`}
                        />
                    )}
                </div>

                {/* 1. Completion Progress Section */}
                <h3 className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase mb-4">
                    {t('careCase.dashboard.completionStats')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <CompletionStatCard
                        label="แบบประเมินโดยครู (SDQ-T)"
                        completed={completionStats.teacher?.completed}
                        total={completionStats.teacher?.total}
                        colorAccent="primary"
                    />
                    <CompletionStatCard
                        label="แบบประเมินโดยผู้ปกครอง (SDQ-P)"
                        completed={completionStats.parent?.completed}
                        total={completionStats.parent?.total}
                        colorAccent="parent"
                    />
                    <CompletionStatCard
                        label="แบบประเมินโดยนักเรียน (SDQ-S)"
                        completed={completionStats.student?.completed}
                        total={completionStats.student?.total}
                        colorAccent="student"
                    />
                </div>

                {/* 2. Color Risk Counts */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-widest text-slate-500">
                        <span>{t('careCase.dashboard.riskSummary')}:</span>
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {t('careCase.dashboard.riskLevel.normal')} {colorCounts.green || 0} คน
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {t('careCase.dashboard.riskLevel.watch')} {colorCounts.yellow || 0} คน
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-100">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            {t('careCase.dashboard.riskLevel.attention')} {colorCounts.red || 0} คน
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-100">
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                            {t('careCase.dashboard.riskLevel.noData')} {noDataCount || 0} คน
                        </span>
                    </div>
                </div>

                {/* 3. Controls (Filters and Search) */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
                    <div className="flex flex-col lg:flex-row gap-6 items-center">
                        {/* Search Input */}
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                                type="text" 
                                placeholder={t('search_student_placeholder')}
                                className="w-full pl-14 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary/10 font-bold text-xs transition-all shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Dropdown Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto shrink-0">
                            {/* Color Filter */}
                            <div className="flex items-center gap-2">
                                <Filter size={14} className="text-slate-400 shrink-0" />
                                <select 
                                    value={colorFilter} 
                                    onChange={(e) => setColorFilter(e.target.value)}
                                    className="w-full sm:w-48 px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-[10px] font-black text-slate-500 focus:ring-4 focus:ring-primary/10 cursor-pointer uppercase tracking-widest"
                                >
                                    <option value="all">{t('careCase.dashboard.filterAll')}</option>
                                    <option value="green">{t('careCase.dashboard.riskLevel.normal')}</option>
                                    <option value="yellow">{t('careCase.dashboard.riskLevel.watch')}</option>
                                    <option value="red">{t('careCase.dashboard.riskLevel.attention')}</option>
                                    <option value="noData">{t('careCase.dashboard.riskLevel.noData')}</option>
                                </select>
                            </div>

                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-2">
                                <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full sm:w-48 px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-[10px] font-black text-slate-500 focus:ring-4 focus:ring-primary/10 cursor-pointer uppercase tracking-widest"
                                >
                                    <option value="risk">เรียงความเสี่ยง (แดงก่อน)</option>
                                    <option value="name">เรียงตามรายชื่อ</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Student Risk List Table */}
                <Card className="rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {t('careCase.dashboard.studentList')}
                                    </th>
                                    <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        สถานะความเสี่ยง
                                    </th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        การจัดการ
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {processedStudents.length > 0 ? (
                                    processedStudents.map((student) => (
                                        <StudentRiskRow
                                            key={student.studentId}
                                            student={student}
                                            trafficLight={student.trafficLight}
                                            requires9Q={student.requires9Q}
                                            onViewDetail={() => handleViewDetail(student)}
                                            onAssess={() => handleAssess(student)}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="py-24 text-center">
                                            <EmptyState 
                                                icon="🔍"
                                                title="ไม่พบข้อมูลนักเรียน"
                                                description="กรุณาตรวจสอบหรือเปลี่ยนตัวกรองค้นหา"
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
