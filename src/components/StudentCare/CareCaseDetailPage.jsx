import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../../services/firebase';
import { getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { normalizeUserData } from '../../services/userService';
import { 
    createCareCase, 
    updateCaseStatus, 
    getCaseSDQAssessments,
    getStudentSDQAssessments,
    linkSDQToCase
} from '../../services/careService';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../common/Navbar';
import SDQTokenGenerator from './SDQTokenGenerator';
import PDFExportButton from './pdf/PDFExportButton';
import { Card, Button, LoadingSpinner, EmptyState } from '../ui';
import { getCurrentSchoolYear } from '../../utils/schoolYear';
import { 
    FolderPlus, 
    User, 
    Calendar, 
    Heart, 
    Shield, 
    ExternalLink, 
    Activity, 
    AlertCircle, 
    CheckCircle,
    XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CareCaseDetailPage() {
    const { caseId } = useParams();
    const [searchParams] = useSearchParams();
    const { user: currentUser } = useAuth();
    const { t, formatDate } = useLanguage();
    const navigate = useNavigate();

    const isNew = caseId === 'new';
    const queryStudentId = searchParams.get('studentId');
    const querySchoolYear = searchParams.get('schoolYear') || getCurrentSchoolYear();

    const [loading, setLoading] = useState(true);
    const [careCase, setCareCase] = useState(null);
    const [student, setStudent] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [unlinkedAssessments, setUnlinkedAssessments] = useState([]);

    // Form states for new case creation
    const [newCategory, setNewCategory] = useState('behavior');
    const [newNotes, setNewNotes] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const loadDetails = async () => {
            try {
                setLoading(true);
                if (isNew) {
                    if (!queryStudentId) {
                        toast.error("ไม่พบรหัสประจำตัวนักเรียน");
                        navigate('/teacher/homeroom/care');
                        return;
                    }
                    // Fetch student detail to display
                    const studentRef = doc(db, 'users', queryStudentId);
                    const studentSnap = await getDoc(studentRef);
                    if (studentSnap.exists()) {
                        setStudent(normalizeUserData(queryStudentId, studentSnap.data()));
                    }
                } else {
                    // Fetch case
                    const caseRef = doc(db, 'careCases', caseId);
                    const caseSnap = await getDoc(caseRef);
                    if (!caseSnap.exists()) {
                        toast.error("ไม่พบข้อมูลเคสการดูแลช่วยเหลือนักเรียน");
                        navigate('/teacher/homeroom/care');
                        return;
                    }
                    const caseData = { id: caseSnap.id, ...caseSnap.data() };
                    setCareCase(caseData);

                    // Fetch student
                    const studentRef = doc(db, 'users', caseData.studentId);
                    const studentSnap = await getDoc(studentRef);
                    if (studentSnap.exists()) {
                        setStudent(normalizeUserData(caseData.studentId, studentSnap.data()));
                    }

                    // Fetch assessments linked to this case
                    const assData = await getCaseSDQAssessments(caseId);
                    setAssessments(assData);

                    // Fetch all student assessments to find unlinked ones
                    const allAssData = await getStudentSDQAssessments(caseData.studentId, caseData.schoolYear);
                    const unlinked = allAssData.filter(a => !a.careCaseId);
                    setUnlinkedAssessments(unlinked);
                }
            } catch (err) {
                console.error("Error loading case detail:", err);
                toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
            } finally {
                setLoading(false);
            }
        };

        loadDetails();
    }, [caseId]);

    const handleCreateCase = async (e) => {
        if (e) e.preventDefault();
        setIsCreating(true);
        try {
            const data = {
                studentId: queryStudentId,
                schoolYear: querySchoolYear,
                category: newCategory,
                notes: newNotes
            };
            const newCaseId = await createCareCase(data, currentUser);
            toast.success("เปิดเคสดูแลช่วยเหลือนักเรียนสำเร็จ!");
            navigate(`/student-care/case/${newCaseId}`);
        } catch (err) {
            console.error("Error creating case:", err);
            toast.error("ไม่สามารถเปิดเคสได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        try {
            await updateCaseStatus(caseId, newStatus, currentUser);
            setCareCase(prev => ({ ...prev, status: newStatus }));
            toast.success(`อัปเดตสถานะเป็น: ${t(`careCase.status.${newStatus}`)}`);
        } catch (err) {
            console.error("Error updating case status:", err);
            toast.error("ไม่สามารถอัปเดตสถานะได้");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar showBack={true} />
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <LoadingSpinner size="lg" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loading')}</p>
                </div>
            </div>
        );
    }

    // New Case Mode
    if (isNew) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <Navbar showBack={true} />

                <div className="max-w-2xl mx-auto px-4 py-8">
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-12">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3.5 bg-primary/10 text-primary rounded-2xl shadow-inner">
                                <FolderPlus size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">
                                    เปิดเคสการดูแลช่วยเหลือนักเรียน
                                </h1>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                    นักเรียน: {student?.name || 'Unknown'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateCase} className="space-y-6">
                            {/* Category Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                                    ประเภทการช่วยดูแล (Category)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { id: 'behavior', label: 'พฤติกรรม' },
                                        { id: 'academic', label: 'วิชาการ' },
                                        { id: 'family', label: 'ครอบครัว' },
                                        { id: 'health', label: 'สุขภาพ' },
                                        { id: 'other', label: 'อื่นๆ' }
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setNewCategory(cat.id)}
                                            className={`py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center border ${
                                                newCategory === cat.id
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Textarea Notes */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                                    บันทึกข้อมูลเพิ่มเติม (Notes)
                                </label>
                                <textarea
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    placeholder="ระบุพฤติกรรม อาการ หรือข้อมูลช่วยดูแลเบื้องต้น..."
                                    rows={4}
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary/10 font-bold text-xs text-slate-800 transition-all placeholder:text-slate-350 shadow-inner resize-none"
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end gap-3 pt-4">
                                <Button 
                                    type="button" 
                                    variant="secondary"
                                    onClick={() => navigate('/teacher/homeroom/care')}
                                >
                                    ยกเลิก
                                </Button>
                                <Button 
                                    type="submit" 
                                    variant="primary"
                                    disabled={isCreating}
                                    className="px-8"
                                >
                                    {isCreating ? 'กำลังบันทึก...' : 'บันทึกเปิดเคส'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    const handleCopyStudentLink = () => {
        const url = `${window.location.origin}/student-care/sdq/student`;
        navigator.clipboard.writeText(url);
        toast.success("คัดลอกลิงก์สำหรับนักเรียนเรียบร้อยแล้ว!");
    };

    const handleLinkExistingSDQ = async (sdqId) => {
        try {
            await linkSDQToCase([sdqId], caseId, currentUser);
            toast.success("ผูกแบบประเมินเข้าเคสสำเร็จ!");
            
            // Reload assessments lists
            const assData = await getCaseSDQAssessments(caseId);
            setAssessments(assData);

            const allAssData = await getStudentSDQAssessments(student.studentId, careCase.schoolYear);
            const unlinked = allAssData.filter(a => !a.careCaseId);
            setUnlinkedAssessments(unlinked);
        } catch (err) {
            console.error("Error linking SDQ to case:", err);
            toast.error("ไม่สามารถผูกแบบประเมินได้");
        }
    };

    // View / Edit existing Case Mode
    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <Navbar showBack={true} />

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                
                {/* 1. Header Details */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-slate-100 flex items-center justify-center text-indigo-500 shadow-inner shrink-0">
                            <User size={30} />
                        </div>
                        <div>
                            <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-wider">
                                Care Case: {careCase.status.toUpperCase()}
                            </span>
                            <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                                {student?.name || 'Unknown'}
                            </h1>
                            <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">
                                รหัส: {student?.studentId || '-'} • ห้อง {student?.level}{student?.class ? `/${student.class}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Quick Case status switcher */}
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                        {[
                            { id: 'active', label: t('careCase.status.active') },
                            { id: 'resolved', label: t('careCase.status.resolved') },
                            { id: 'closed', label: t('careCase.status.closed') }
                        ].map(st => (
                            <button
                                key={st.id}
                                onClick={() => handleUpdateStatus(st.id)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                    careCase.status === st.id
                                        ? 'bg-white text-primary shadow-md font-bold'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Parent Link Generator */}
                <SDQTokenGenerator 
                    caseId={caseId} 
                    studentId={careCase.studentId} 
                    schoolYear={careCase.schoolYear}
                />

                {/* 3. Diagnostic / Actions Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Diagnostic Summary Panel */}
                    <Card className="p-6 border border-slate-100 md:col-span-2 space-y-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-4 mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Activity size={16} />
                                    <span>แบบประเมิน SDQ ที่เสร็จสิ้น</span>
                                </div>
                                {careCase && student && (
                                    <PDFExportButton 
                                        type="individual"
                                        data={{
                                            studentInfo: student,
                                            sdqAssessments: assessments,
                                            schoolInfo: { schoolYear: careCase.schoolYear, schoolName: 'โรงเรียนฤทธิณรงค์รอน' }
                                        }}
                                        fileName={`${student.name}_SDQ_Report.pdf`}
                                    />
                                )}
                            </div>

                            {/* Completed List */}
                            {assessments.length > 0 ? (
                                <div className="space-y-3">
                                    {assessments.map((ass) => {
                                        const isTeacher = ass.informantType === 'teacher';
                                        return (
                                            <div 
                                                key={ass.id}
                                                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${
                                                        ass.result?.band === 'abnormal' ? 'bg-rose-500' : ass.result?.band === 'borderline' ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`} />
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-800 leading-none">
                                                            {t(`sdq.informant.${ass.informantType}`)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                                            รอบ: {t(`sdq.assessmentType.${ass.assessmentType || 'initial'}`)} • {formatDate(ass.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isTeacher && (
                                                    <Button 
                                                        variant="ghost" 
                                                        onClick={() => navigate(`/student-care/sdq/teacher/${student.studentId}?schoolYear=${careCase.schoolYear}`)}
                                                        className="text-[10px] py-1.5 px-3 uppercase tracking-wider font-black flex items-center gap-1 shrink-0"
                                                    >
                                                        <span>ดูรายงานละเอียด</span>
                                                        <ExternalLink size={12} />
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                    ยังไม่มีการส่งแบบประเมินสำหรับเคสนี้
                                </div>
                            )}

                            {/* Unlinked Assessments List */}
                            {unlinkedAssessments.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-dashed border-slate-100">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-1.5 font-bold">
                                        <AlertCircle size={14} className="text-amber-500" />
                                        <span>พบแบบประเมิน SDQ ที่ยังไม่ได้ผูกเข้ากับเคสนี้</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {unlinkedAssessments.map((ass) => (
                                            <div 
                                                key={ass.id}
                                                className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/20 text-xs"
                                            >
                                                <div>
                                                    <span className="font-bold text-slate-800">
                                                        ผู้ประเมิน: {t(`sdq.informant.${ass.informantType}`)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                        รอบ: {t(`sdq.assessmentType.${ass.assessmentType || 'initial'}`)} • {formatDate(ass.createdAt)}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    className="py-1 px-3 text-[10px] uppercase font-black tracking-wider border-amber-500 text-amber-700 hover:bg-amber-50 bg-white"
                                                    onClick={() => handleLinkExistingSDQ(ass.id)}
                                                >
                                                    ผูกเข้าเคส
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Note area */}
                        {careCase.notes && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 text-slate-600 text-xs leading-relaxed font-semibold">
                                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                                    บันทึกของที่ปรึกษา:
                                </span>
                                {careCase.notes}
                            </div>
                        )}
                    </Card>

                    {/* Actions Panel */}
                    <Card className="p-6 border border-slate-100 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
                                <Shield size={16} />
                                <span>แบบประเมินด่วนสำหรับครู</span>
                            </div>
                            
                            <p className="text-xs text-slate-400 font-semibold leading-relaxed mb-6">
                                homeroom advisor สามารถประเมินพฤติกรรมเด็กหรือส่งคำขอให้นักเรียนทำแบบประเมินตนเอง
                            </p>
                        </div>

                        <div className="space-y-3 mt-auto">
                            <Button 
                                variant="primary"
                                onClick={() => navigate(`/student-care/sdq/teacher/${student.studentId}?schoolYear=${careCase.schoolYear}`)}
                                className="w-full flex items-center justify-center gap-2 text-xs py-3 tracking-widest uppercase font-black"
                            >
                                <span>ทำแบบประเมินโดยครู</span>
                                <ExternalLink size={14} />
                            </Button>
                            
                            <div>
                                <Button 
                                    variant="secondary"
                                    onClick={handleCopyStudentLink}
                                    className="w-full flex items-center justify-center gap-2 text-xs py-3 tracking-widest uppercase font-black hover:bg-slate-100 transition-colors"
                                >
                                    <span>คัดลอกลิงก์สำหรับนักเรียน</span>
                                    <ExternalLink size={14} />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
