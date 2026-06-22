import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { generateParentSDQToken } from '../../services/careService';
import { ChevronRight, HelpCircle, ExternalLink, Link, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StudentRiskRow({ 
    student, 
    trafficLight = null, 
    requires9Q = false, 
    onViewDetail,
    onAssess,
    onGenerateParentLink
}) {
    const { t } = useLanguage();
    const { user: currentUser } = useAuth();
    const [generating, setGenerating] = useState(false);

    // Map traffic light to translation and color styling
    const getStatusStyle = (light) => {
        switch (light) {
            case 'red':
                return {
                    label: t('careCase.dashboard.riskLevel.attention'),
                    badgeColor: 'bg-rose-50 text-rose-700 border-rose-100',
                    dotColor: 'bg-rose-500'
                };
            case 'yellow':
                return {
                    label: t('careCase.dashboard.riskLevel.watch'),
                    badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
                    dotColor: 'bg-amber-500'
                };
            case 'green':
                return {
                    label: t('careCase.dashboard.riskLevel.normal'),
                    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    dotColor: 'bg-emerald-500'
                };
            default:
                return {
                    label: t('careCase.dashboard.riskLevel.noData'),
                    badgeColor: 'bg-slate-50 text-slate-400 border-slate-100',
                    dotColor: 'bg-slate-300'
                };
        }
    };

    const handleGenerateParentLink = async (e) => {
        if (e) e.stopPropagation();
        setGenerating(true);
        try {
            const result = await generateParentSDQToken(
                student.studentId,
                currentUser,
                student.caseId || null,
                "2569" // Current academic year as configured
            );
            if (onGenerateParentLink) {
                onGenerateParentLink(result.url);
            }
            toast.success("สร้างลิงก์สำหรับผู้ปกครองสำเร็จ!");
        } catch (err) {
            console.error("Error generating parent token:", err);
            toast.error("ไม่สามารถสร้างลิงก์ผู้ปกครองได้");
        } finally {
            setGenerating(false);
        }
    };

    const handleCopyLink = (e) => {
        if (e) e.stopPropagation();
        if (!student.parentLink) return;
        navigator.clipboard.writeText(student.parentLink);
        toast.success("คัดลอกลิงก์ผู้ปกครองสำเร็จ!");
    };

    const status = getStatusStyle(trafficLight);

    return (
        <tr 
            onClick={() => onViewDetail && onViewDetail()}
            className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors group cursor-pointer"
        >
            {/* Student Info */}
            <td className="px-8 py-5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-black text-sm group-hover:scale-105 transition-transform shadow-inner">
                        {(student?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-black text-slate-800 text-sm leading-tight flex flex-wrap items-center gap-2">
                            <span>{student?.name || 'Unknown'}</span>
                            {student.parentLink && (
                                <a 
                                    href={student.parentLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] text-rose-600 font-bold hover:underline bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1 ml-1"
                                >
                                    <span>ลิงก์ผู้ปกครอง: {student.parentLink}</span>
                                    <ExternalLink size={10} />
                                </a>
                            )}
                            {requires9Q && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                                    {t('careCase.dashboard.nineQ.badge')}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-0.5 block">
                            ID: {student?.studentNo || student?.studentId || '-'}
                        </span>
                    </div>
                </div>
            </td>

            {/* Risk Status */}
            <td className="px-6 py-5 text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${status.badgeColor}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                    <span>{status.label}</span>
                </div>
            </td>

            {/* Actions (Teacher SDQ, Parent SDQ, 9Q Assessment, & Detail button) */}
            <td className="px-8 py-5 text-right">
                <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                    {/* SDQ Teacher Action */}
                    <button
                        type="button"
                        onClick={() => onAssess && onAssess()}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors border border-indigo-100 shrink-0"
                    >
                        <span>{t('careCase.dashboard.assessTeacher')}</span>
                        <ExternalLink size={12} className="text-indigo-500" />
                    </button>

                    {/* Parent SDQ Action */}
                    {!student.parentLink ? (
                        <button
                            type="button"
                            onClick={handleGenerateParentLink}
                            disabled={generating}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors border border-rose-100 disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                            <span>{generating ? 'กำลังสร้าง...' : 'สร้างลิงก์ SDQ สำหรับผู้ปกครอง'}</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="px-3 py-1.5 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors border border-rose-200 shrink-0 cursor-pointer"
                        >
                            <span>คัดลอกลิงก์ผู้ปกครอง</span>
                        </button>
                    )}

                    {/* 9Q Action placeholder */}
                    <div className="relative group/tooltip shrink-0">
                        <button
                            disabled
                            className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold cursor-not-allowed flex items-center gap-1.5 hover:bg-slate-150 transition-colors uppercase tracking-widest"
                        >
                            <span>9Q Assessment</span>
                            <HelpCircle size={12} className="text-slate-300" />
                        </button>
                        
                        {/* Custom Tooltip */}
                        <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50">
                            {t('careCase.dashboard.nineQ.comingSoon')}
                        </div>
                    </div>

                    {/* View Details Action */}
                    <button
                        type="button"
                        onClick={() => onViewDetail && onViewDetail()}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shrink-0"
                        title={t('careCase.dashboard.viewDetail')}
                    >
                        <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
