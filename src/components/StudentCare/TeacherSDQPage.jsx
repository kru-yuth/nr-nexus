import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../../services/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { normalizeUserData } from '../../services/userService';
import { 
    getStudentSDQAssessments,
    getStudentCareCases,
    submitSDQAssessment
} from '../../services/careService';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../common/Navbar';
import SDQForm from './SDQForm';
import { Card, Button, LoadingSpinner, EmptyState } from '../ui';
import { 
    FileText, 
    CheckCircle, 
    AlertTriangle, 
    ArrowRight, 
    Info, 
    ChevronRight, 
    Home 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TeacherSDQPage() {
    const { studentId } = useParams();
    const [searchParams] = useSearchParams();
    const { user: currentUser } = useAuth();
    const { t, formatDate } = useLanguage();
    const navigate = useNavigate();

    const schoolYear = searchParams.get('schoolYear') || "2569";

    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(null);
    const [existingAssessments, setExistingAssessments] = useState([]);
    
    // UI States
    const [duplicateMode, setDuplicateMode] = useState(false); // If initial already exists
    const [assessmentType, setAssessmentType] = useState('initial'); // 'initial' | 'followUp'
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resultToShow, setResultToShow] = useState(null); // Calculated results to display
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const loadPageData = async () => {
            try {
                // 1. Get student details
                const studentRef = doc(db, 'users', studentId);
                const studentSnap = await getDoc(studentRef);
                if (!studentSnap.exists()) {
                    setLoading(false);
                    return;
                }
                const normalized = normalizeUserData(studentId, studentSnap.data());
                setStudent(normalized);



                // 3. Get existing SDQ assessments for duplicate initial assessment check
                const assessments = await getStudentSDQAssessments(studentId, schoolYear);
                setExistingAssessments(assessments);

                // Check if teacher has completed an 'initial' assessment
                const hasInitial = assessments.some(
                    a => a.informantType === 'teacher' && a.assessmentType === 'initial'
                );

                if (hasInitial) {
                    setDuplicateMode(true);
                    // Find the initial assessment to offer viewing
                    const initialAss = assessments.find(
                        a => a.informantType === 'teacher' && a.assessmentType === 'initial'
                    );
                    setResultToShow(initialAss);
                } else {
                    setAssessmentType('initial');
                    setShowForm(true);
                }
            } catch (err) {
                console.error("Error loading TeacherSDQPage:", err);
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            loadPageData();
        }
    }, [studentId, schoolYear]);

    const handleSubmitAssessment = async (responses, impactAssessment) => {
        setIsSubmitting(true);
        try {
            // Find active case dynamically again before submit to make sure we link it if it exists
            let careCaseId = null;
            const cases = await getStudentCareCases(studentId);
            const activeCase = cases.find(c => c.schoolYear === schoolYear && c.status === 'active');
            if (activeCase) {
                careCaseId = activeCase.id;
            }

            const data = {
                studentId,
                careCaseId,
                schoolYear,
                informantType: 'teacher',
                assessmentType,
                responses,
                impactAssessment
            };
            await submitSDQAssessment(data, currentUser);
            
            setSubmitted(true);
            setShowForm(false);
            setDuplicateMode(false);
            toast.success("บันทึกประเมินเรียบร้อย!");
        } catch (err) {
            console.error("Error submitting teacher SDQ:", err);
            toast.error("เกิดข้อผิดพลาดในการส่งข้อมูล: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartFollowUp = () => {
        setAssessmentType('followUp');
        setResultToShow(null);
        setDuplicateMode(false);
        setShowForm(true);
    };

    const handleViewExistingInitial = () => {
        const initialAss = existingAssessments.find(
            a => a.informantType === 'teacher' && a.assessmentType === 'initial'
        );
        setResultToShow(initialAss);
        setDuplicateMode(false);
        setShowForm(false);
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



    // Colors mapping based on band status
    const getBandColorClass = (band) => {
        if (band === 'abnormal') return 'bg-rose-50 text-rose-800 border-rose-200';
        if (band === 'borderline') return 'bg-amber-50 text-amber-800 border-amber-200';
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar showBack={true} />

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* 1. Success Screen */}
                {submitted && (
                    <Card className="max-w-md mx-auto p-8 border border-emerald-100 shadow-xl text-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
                            บันทึกแบบประเมินเรียบร้อยแล้ว
                        </h2>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6 font-semibold font-bold">
                            บันทึกข้อมูลแบบประเมินสำหรับ {student?.name || 'นักเรียน'} เรียบร้อยแล้ว
                        </p>
                        <Button 
                            variant="primary" 
                            onClick={() => navigate('/teacher/homeroom/care')}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <Home size={18} />
                            <span>กลับหน้าแดชบอร์ดช่วยเหลือนักเรียน (กรอกข้อมูลคนต่อไป)</span>
                        </Button>
                    </Card>
                )}

                {/* 2. Duplicate Check Selection Screen */}
                {!submitted && duplicateMode && (
                    <div className="space-y-6">
                        <Card className="text-center p-8 border border-amber-100 bg-amber-50/20">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                                พบแบบประเมินตั้งต้นแล้ว
                            </h2>
                            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed mb-8">
                                แบบประเมิน SDQ รอบแรก (Initial Assessment) ของนักเรียน 
                                <strong className="text-slate-700"> {student?.name || 'Unknown'}</strong> ได้ทำการประเมินไว้แล้ว
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button 
                                    variant="secondary"
                                    onClick={handleViewExistingInitial}
                                    className="w-full sm:w-auto"
                                >
                                    ดูผลการประเมินรอบแรก
                                </Button>
                                <Button 
                                    variant="primary"
                                    onClick={handleStartFollowUp}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2"
                                >
                                    <span>ทำแบบประเมินติดตามผล (Follow-up)</span>
                                    <ArrowRight size={16} />
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* 3. Form Screen */}
                {!submitted && !duplicateMode && showForm && (
                    <SDQForm
                        informantType="teacher"
                        studentName={student?.name}
                        assessmentType={assessmentType}
                        onSubmit={handleSubmitAssessment}
                        isSubmitting={isSubmitting}
                    />
                )}

                {/* 4. Diagnostic Scoring Presentation Screen */}
                {!submitted && !duplicateMode && !showForm && resultToShow && (
                    <div className="space-y-6">
                        {/* Summary Header */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-center md:text-left">
                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-wider">
                                    Diagnostic Report (SDQ-T)
                                </span>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-2">
                                    ผลประเมินพฤติกรรมเด็ก
                                </h1>
                                <p className="text-sm text-slate-400 font-bold mt-1">
                                    นักเรียน: {student?.name || 'Unknown'} • ชั้น {student?.level}{student?.class ? `/${student.class}` : ''}
                                </p>
                            </div>
                            <div className="text-center md:text-right text-xs text-slate-400 font-bold uppercase tracking-wider">
                                วันที่ประเมิน: {formatDate(resultToShow.createdAt)}
                            </div>
                        </div>

                        {/* Overall Band Card */}
                        <div className={`p-8 rounded-3xl border shadow-sm ${getBandColorClass(resultToShow.result.band)}`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">สรุปผลภาพรวม</span>
                                    <h2 className="text-3xl font-black tracking-tight mt-1">
                                        ระดับ: {t(`sdq.band.${resultToShow.result.band}`)}
                                    </h2>
                                    <p className="text-sm font-bold opacity-80 mt-1">
                                        คะแนนความยากลำบากรวม (Total Difficulty Score): {resultToShow.result.totalDifficultyScore} คะแนน
                                    </p>
                                </div>
                                <div className="px-6 py-4 bg-white/40 backdrop-blur rounded-2xl border border-white/50 text-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest block opacity-70">คะแนนรวม</span>
                                    <div className="text-3xl font-black mt-0.5">{resultToShow.result.totalDifficultyScore}/40</div>
                                </div>
                            </div>

                            {/* 9Q Requirement alert */}
                            {resultToShow.result.requires9Q && (
                                <div className="mt-6 flex items-start gap-3 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 text-rose-800 text-xs font-medium leading-relaxed">
                                    <AlertTriangle className="shrink-0 text-rose-600 mt-0.5" size={16} />
                                    <div>
                                        <strong className="font-bold block">คำแนะนำ: ควรทำการประเมินคัดกรองโรคซึมเศร้า (9Q) ต่อเนื่อง</strong>
                                        เนื่องจากผลประเมินพบปัญหาหรือความเสี่ยงด้านอารมณ์สูง หรือความยากลำบากส่งผลกระทบชัดเจนในชีวิตประจำวัน
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Subscale Detailed Grid */}
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider mb-2">
                            รายละเอียดคะแนนแต่ละด้าน
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { key: 'emotional', label: 'ด้านอารมณ์ (Emotional problems)' },
                                { key: 'conduct', label: 'ด้านพฤติกรรมเกเร (Conduct problems)' },
                                { key: 'hyperactivity', label: 'ด้านสมาธิสั้น/กระสับกระส่าย (Hyperactivity/Inattention)' },
                                { key: 'peer', label: 'ด้านความสัมพันธ์กับเพื่อน (Peer relationships)' },
                                { key: 'prosocial', label: 'ด้านพฤติกรรมสัมพันธภาพทางสังคม (Prosocial behavior)' }
                            ].map((subscale) => {
                                const score = resultToShow.result[subscale.key];
                                const band = resultToShow.result.subscaleBands[subscale.key];

                                return (
                                    <Card key={subscale.key} className="p-6 border border-slate-100 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-slate-400 block tracking-wide uppercase">
                                                    {subscale.label}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${
                                                    band === 'abnormal' ? 'bg-rose-500' : band === 'borderline' ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}>
                                                    {t(`sdq.band.${band}`)}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-1 mt-2">
                                                <span className="text-3xl font-black text-slate-800">{score}</span>
                                                <span className="text-slate-400 text-xs font-bold">/ 10 คะแนน</span>
                                            </div>
                                        </div>

                                        {/* Progress bar visual indicator */}
                                        <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-300 ${
                                                    band === 'abnormal' ? 'bg-rose-500' : band === 'borderline' ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${score * 10}%` }}
                                            />
                                        </div>
                                    </Card>
                                );
                            })}

                            {/* Impact Score Card */}
                            <Card className="p-6 border border-slate-100 flex flex-col justify-between md:col-span-2 bg-slate-50/50">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 block tracking-wide uppercase">
                                            ด้านผลกระทบพฤติกรรม (Impact Score)
                                        </span>
                                        <p className="text-slate-500 text-xs font-medium mt-1">
                                            ประเมินถึงผลกระทบต่อชีวิตประจำวันของตัวเด็กเองและการเรียนในโรงเรียน
                                        </p>
                                    </div>
                                    <div className="flex items-baseline gap-1 bg-white px-4 py-2 rounded-xl border border-slate-200">
                                        <span className="text-3xl font-black text-slate-800">
                                            {resultToShow.result.impactScore}
                                        </span>
                                        <span className="text-slate-400 text-xs font-bold">/ 10 คะแนน</span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Navigation back */}
                        <div className="flex justify-center pt-6">
                            <Button 
                                variant="primary"
                                onClick={() => navigate('/teacher/homeroom/care')}
                                className="flex items-center gap-2 px-8 py-3"
                            >
                                <Home size={18} />
                                <span>กลับหน้าแดชบอร์ดช่วยเหลือนักเรียน (กรอกข้อมูลคนต่อไป)</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
