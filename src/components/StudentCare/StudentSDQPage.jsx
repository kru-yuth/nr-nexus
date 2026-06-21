import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { 
    submitSDQAssessment,
    getStudentSDQAssessments,
    getStudentCareCases
} from '../../services/careService';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../common/Navbar';
import SDQForm from './SDQForm';
import { Card, Button, LoadingSpinner, EmptyState } from '../ui';
import { toast } from 'react-hot-toast';
import { CheckCircle2, ShieldAlert, Home, Heart } from 'lucide-react';
import { getCurrentSchoolYear } from '../../utils/schoolYear';

export default function StudentSDQPage() {
    const { user: currentUser } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const checkSubmissionStatus = async () => {
            try {
                if (!currentUser?.uid) return;

                // Check if student has already submitted SDQ for this year
                const currentYear = getCurrentSchoolYear();
                const assessments = await getStudentSDQAssessments(currentUser.uid, currentYear);
                const studentCompleted = assessments.some(a => a.informantType === 'student');

                if (studentCompleted) {
                    setSubmitted(true);
                }
            } catch (err) {
                console.error("Error loading StudentSDQPage:", err);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            checkSubmissionStatus();
        }
    }, [currentUser]);

    const handleSubmitAssessment = async (responses) => {
        setIsSubmitting(true);
        try {
            const currentYear = getCurrentSchoolYear();
            let careCaseId = null;
            
            // Find active case for current year
            const cases = await getStudentCareCases(currentUser.uid);
            const activeCase = cases.find(c => c.schoolYear === currentYear && c.status === 'active');
            if (activeCase) {
                careCaseId = activeCase.id;
            }

            const data = {
                studentId: currentUser.uid,
                careCaseId,
                schoolYear: currentYear,
                informantType: 'student',
                assessmentType: 'initial',
                responses
            };
            await submitSDQAssessment(data, currentUser);
            setSubmitted(true);
            toast.success("ส่งแบบประเมินสำเร็จ!");
        } catch (err) {
            console.error("Error submitting student SDQ:", err);
            toast.error("เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    };

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

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar showBack={false} />
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <Card className="max-w-md mx-auto p-8 border border-emerald-100 shadow-xl shadow-slate-100 text-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
                            ส่งแบบประเมินเรียบร้อยแล้ว
                        </h2>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6 font-semibold">
                            {t('sdq.studentPage.thankYou')}
                        </p>
                        <div className="flex justify-center text-primary/30 mb-8">
                            <Heart size={24} className="animate-pulse fill-current" />
                        </div>
                        <Button 
                            variant="primary" 
                            onClick={() => navigate('/student')}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <Home size={18} />
                            <span>กลับหน้าแดชบอร์ดนักเรียน</span>
                        </Button>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar showBack={true} />

            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-100 border border-slate-100 p-6 md:p-10">
                    <SDQForm
                        informantType="student"
                        studentName={currentUser?.name || currentUser?.displayName}
                        assessmentType="initial"
                        onSubmit={handleSubmitAssessment}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </div>
        </div>
    );
}
