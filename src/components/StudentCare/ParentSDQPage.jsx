import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../services/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { normalizeUserData } from '../../services/userService';
import { validateSDQToken, submitParentSDQ } from '../../services/careService';
import { useLanguage } from '../../context/LanguageContext';
import SDQForm from './SDQForm';
import { Card, LoadingSpinner } from '../ui';
import { toast } from 'react-hot-toast';
import { CheckCircle2, AlertOctagon, Heart, GraduationCap } from 'lucide-react';

export default function ParentSDQPage() {
    const { token } = useParams();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [tokenStatus, setTokenStatus] = useState({ valid: false, reason: null });
    const [studentName, setStudentName] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const validateTokenAndLoadData = async () => {
            try {
                // 1. Validate the parent SDQ token
                const valResult = await validateSDQToken(token);
                if (!valResult.valid) {
                    setTokenStatus({ valid: false, reason: valResult.reason });
                    setLoading(false);
                    return;
                }

                setTokenStatus({ valid: true, reason: null });

                // 2. Load the corresponding student information
                const studentRef = doc(db, 'users', valResult.studentId);
                const studentSnap = await getDoc(studentRef);
                if (studentSnap.exists()) {
                    const normalized = normalizeUserData(valResult.studentId, studentSnap.data());
                    setStudentName(normalized.name || 'Unknown');
                }
            } catch (err) {
                console.error("Error in validateTokenAndLoadData:", err);
                setTokenStatus({ valid: false, reason: 'tokenInvalid' });
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            validateTokenAndLoadData();
        } else {
            setTokenStatus({ valid: false, reason: 'tokenInvalid' });
            setLoading(false);
        }
    }, [token]);

    const handleSubmitSDQ = async (responses) => {
        setIsSubmitting(true);
        try {
            const submitRes = await submitParentSDQ(token, responses);
            if (submitRes.success) {
                setSubmitted(true);
            } else {
                toast.error(t(`sdq.parentPage.errors.${submitRes.reason}`) || t('sdq.errors.tokenInvalid'));
                setTokenStatus({ valid: false, reason: submitRes.reason });
            }
        } catch (err) {
            console.error("Error submitting Parent SDQ:", err);
            toast.error("เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Public header layout with school logo
    const PageContainer = ({ children }) => (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 relative overflow-hidden">
            {/* Visual background details */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-light/50 rounded-full blur-3xl -mr-32 -mt-32 opacity-70 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-70 pointer-events-none" />

            <div className="w-full max-w-md mx-auto my-auto relative z-10">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 p-0.5 shadow-xl shadow-primary/10 flex items-center justify-center text-white mb-3">
                        <GraduationCap size={36} />
                    </div>
                    <h1 className="text-xl font-black text-slate-800 tracking-wider uppercase italic">
                        NR Nexus
                    </h1>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] mt-0.5">
                        Student Care System
                    </p>
                </div>

                {children}
            </div>

            {/* Simple public footer */}
            <div className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-12 relative z-10">
                © {new Date().getFullYear()} Nawaminthrachinuthit Rajinibon School
            </div>
        </div>
    );

    if (loading) {
        return (
            <PageContainer>
                <Card className="flex flex-col items-center justify-center p-8 border border-slate-100 shadow-xl shadow-slate-100">
                    <LoadingSpinner size="lg" />
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mt-4">
                        {t('loading')}
                    </p>
                </Card>
            </PageContainer>
        );
    }

    // Error State Layout
    if (!tokenStatus.valid) {
        const errorKey = tokenStatus.reason || 'tokenInvalid';
        return (
            <PageContainer>
                <Card className="p-8 border border-rose-100 shadow-xl shadow-slate-100 text-center">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100">
                        <AlertOctagon size={32} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800 mb-3 tracking-tight">
                        ไม่สามารถเข้าถึงแบบประเมินได้
                    </h2>
                    <p className="text-slate-500 text-sm leading-relaxed font-semibold">
                        {t(`sdq.parentPage.errors.${errorKey}`)}
                    </p>
                </Card>
            </PageContainer>
        );
    }

    // Success State Layout (Absolutely no score display)
    if (submitted) {
        return (
            <PageContainer>
                <Card className="p-8 border border-emerald-100 shadow-xl shadow-slate-100 text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
                        ส่งแบบประเมินเรียบร้อยแล้ว
                    </h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6 font-semibold">
                        {t('sdq.parentPage.thankYou')}
                    </p>
                    <div className="flex justify-center text-primary/30">
                        <Heart size={24} className="animate-pulse fill-current" />
                    </div>
                </Card>
            </PageContainer>
        );
    }

    // Form Presentation Layout (No sidebars/navbars, standalone full width container)
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-light/40 rounded-full blur-3xl -mr-64 -mt-64 opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-50 rounded-full blur-3xl -ml-64 -mb-64 opacity-50 pointer-events-none" />

            <div className="max-w-3xl mx-auto relative z-10">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 p-0.5 shadow-xl shadow-primary/10 flex items-center justify-center text-white mb-3">
                        <GraduationCap size={36} />
                    </div>
                    <h1 className="text-xl font-black text-slate-800 tracking-wider uppercase italic">
                        NR Nexus
                    </h1>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] mt-0.5">
                        Parent Assessment Hub
                    </p>
                </div>

                {/* Form Wrapper */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-100 border border-slate-100 p-6 md:p-10">
                    <div className="mb-8 text-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-slate-600 text-sm font-bold">
                            {t('sdq.parentPage.welcome', { studentName })}
                        </p>
                    </div>

                    <SDQForm
                        informantType="parent"
                        studentName={studentName}
                        assessmentType="initial"
                        onSubmit={handleSubmitSDQ}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </div>
        </div>
    );
}
