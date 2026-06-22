import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Card } from '../ui';
import { toast } from 'react-hot-toast';
import { Check, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

const ITEMS_PER_PAGE = 5;
const TOTAL_ITEMS = 25; // 25 standard items. Part 2 is handled separately.

export default function SDQForm({
    informantType = 'student',
    studentName = '',
    onSubmit,
    assessmentType = 'initial',
    isSubmitting = false,
}) {
    const { t } = useLanguage();

    // Initialize responses state (25 questions)
    const [responses, setResponses] = useState(() => {
        if (informantType === 'teacher') {
            return Array(TOTAL_ITEMS).fill(0);
        }
        return Array(TOTAL_ITEMS).fill(null);
    });

    // Initialize Impact Assessment state
    const [impactAssessment, setImpactAssessment] = useState({
        hasImpactProblems: null, // 'no' | 'minor' | 'definite' | 'severe'
        duration: null, // 'less_than_1_month' | '1_to_5_months' | '6_to_12_months' | 'more_than_1_year'
        distress: null, // 'not_at_all' | 'only_a_little' | 'quite_a_lot' | 'a_great_deal'
        socialImpairment: {
            home: null,
            peer: null,
            classroom: null,
            leisure: null
        },
        burdenOnOthers: null, // 'not_at_all' | 'only_a_little' | 'quite_a_lot' | 'a_great_deal'
        teacherSpecific: {
            hoursPerDay: '', // maps to hours per week context
            relationshipQuality: ''
        }
    });

    const [currentPage, setCurrentPage] = useState(0);
    const [validationError, setValidationError] = useState(false);
    
    // Create refs for questions to support smooth scrolling
    const questionRefs = useRef([]);

    // 5 pages of questions + 1 page of Impact assessment = 6 pages total
    const totalPages = Math.ceil(TOTAL_ITEMS / ITEMS_PER_PAGE) + 1;

    const answeredCount = responses.filter(r => r !== null).length;
    const progressPercent = Math.round((answeredCount / TOTAL_ITEMS) * 100);
    const isCompleted = answeredCount === TOTAL_ITEMS;

    // Determine items for current page (only applies for pages 0-4)
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, TOTAL_ITEMS);
    const pageItems = currentPage < 5 ? Array.from(
        { length: endIndex - startIndex },
        (_, i) => startIndex + i
    ) : [];

    const handleSelectOption = (itemIndex, val) => {
        setResponses(prev => {
            const next = [...prev];
            next[itemIndex] = val;
            return next;
        });
    };

    const handleSelectImpact = (field, val) => {
        setImpactAssessment(prev => ({
            ...prev,
            [field]: val
        }));
    };

    const handleSelectSocialImpairment = (domain, val) => {
        setImpactAssessment(prev => ({
            ...prev,
            socialImpairment: {
                ...prev.socialImpairment,
                [domain]: val
            }
        }));
    };

    const handleTeacherSpecificChange = (field, val) => {
        setImpactAssessment(prev => ({
            ...prev,
            teacherSpecific: {
                ...prev.teacherSpecific,
                [field]: val
            }
        }));
    };

    const handleNext = () => {
        if (currentPage === 4) {
            // Validate all 25 main questions first before allowing entry to Impact section
            const firstUnanswered = responses.findIndex(r => r === null);
            if (firstUnanswered !== -1) {
                setValidationError(true);
                toast.error(t('sdq.form.incomplete'));
                const targetPage = Math.floor(firstUnanswered / ITEMS_PER_PAGE);
                setCurrentPage(targetPage);
                return;
            }
        }
        if (currentPage < totalPages - 1) {
            setCurrentPage(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrev = () => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        // 1. Double check main 25 questions
        const firstUnanswered = responses.findIndex(r => r === null);
        if (firstUnanswered !== -1) {
            setValidationError(true);
            toast.error(t('sdq.form.incomplete'));
            const targetPage = Math.floor(firstUnanswered / ITEMS_PER_PAGE);
            setCurrentPage(targetPage);
            return;
        }

        // 2. Validate Impact page
        if (currentPage === 5) {
            if (!impactAssessment.hasImpactProblems) {
                setValidationError(true);
                toast.error("กรุณาระบุขอบข่ายความรุนแรงของปัญหาก่อนส่ง");
                return;
            }

            if (impactAssessment.hasImpactProblems !== 'no') {
                if (!impactAssessment.duration) {
                    setValidationError(true);
                    toast.error("กรุณาระบุระยะเวลาที่เกิดปัญหา");
                    return;
                }
                if (!impactAssessment.distress) {
                    setValidationError(true);
                    toast.error("กรุณาระบุความรู้สึกหงุดหงิด/ไม่สบายใจ");
                    return;
                }
                if (!impactAssessment.burdenOnOthers) {
                    setValidationError(true);
                    toast.error("กรุณาระบุข้อมูลผลกระทบต่อคนรอบข้าง");
                    return;
                }

                // Validate social impairment domains depending on informantType
                const domains = informantType === 'teacher'
                    ? ['peer', 'classroom']
                    : ['home', 'peer', 'classroom', 'leisure'];

                for (const dom of domains) {
                    if (!impactAssessment.socialImpairment[dom]) {
                        setValidationError(true);
                        toast.error(`กรุณากรอกข้อมูลในหัวข้อ: ${t(`sdq.impact.impairment.${dom}`)}`);
                        return;
                    }
                }
            }

            if (informantType === 'teacher') {
                if (!impactAssessment.teacherSpecific.hoursPerDay) {
                    setValidationError(true);
                    toast.error("กรุณาระบุชั่วโมงที่เด็กอยู่ร่วมกันกับครูต่อสัปดาห์");
                    return;
                }
                if (!impactAssessment.teacherSpecific.relationshipQuality || !impactAssessment.teacherSpecific.relationshipQuality.trim()) {
                    setValidationError(true);
                    toast.error("กรุณาระบุความสัมพันธ์กับเด็ก");
                    return;
                }
            }

            // All validations passed. Submit assessment
            setValidationError(false);
            if (onSubmit) {
                const finalImpact = {
                    hasImpactProblems: impactAssessment.hasImpactProblems,
                    distress: impactAssessment.hasImpactProblems === 'no' ? null : impactAssessment.distress,
                    duration: impactAssessment.hasImpactProblems === 'no' ? null : impactAssessment.duration,
                    socialImpairment: {
                        home: (informantType === 'teacher' || impactAssessment.hasImpactProblems === 'no') ? null : impactAssessment.socialImpairment.home,
                        peer: impactAssessment.hasImpactProblems === 'no' ? null : impactAssessment.socialImpairment.peer,
                        classroom: impactAssessment.hasImpactProblems === 'no' ? null : impactAssessment.socialImpairment.classroom,
                        leisure: (informantType === 'teacher' || impactAssessment.hasImpactProblems === 'no') ? null : impactAssessment.socialImpairment.leisure,
                    },
                    burdenOnOthers: impactAssessment.hasImpactProblems === 'no' ? null : impactAssessment.burdenOnOthers,
                    teacherSpecific: informantType === 'teacher' ? {
                        hoursPerDay: parseFloat(impactAssessment.teacherSpecific.hoursPerDay) || null,
                        relationshipQuality: impactAssessment.teacherSpecific.relationshipQuality.trim()
                    } : null
                };

                await onSubmit(responses, finalImpact);
            }
        } else {
            // Move to Impact section
            setCurrentPage(5);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const keyMap = {
        student: 'sdqItemsStudent',
        teacher: 'sdqItemsTeacher',
        parent: 'sdqItemsParent'
    };
    const informantKey = keyMap[informantType] || 'sdqItemsStudent';
    const socialDomains = informantType === 'teacher'
        ? ['peer', 'classroom']
        : ['home', 'peer', 'classroom', 'leisure'];

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto px-4 md:px-0">
            {/* Header info */}
            <div className="mb-6 text-center md:text-left bg-primary/5 rounded-3xl p-6 border border-primary/10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                            SDQ-{informantType.charAt(0).toUpperCase()} ({t(`sdq.assessmentType.${assessmentType}`)})
                        </span>
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mt-2">
                            {studentName ? `${t('sdq.form.title')} - ${studentName}` : t('sdq.form.title')}
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">
                            {t(`sdq.informant.${informantType}`)}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-600">
                            {currentPage < 5 
                                ? t('sdq.form.progress', { current: answeredCount, total: TOTAL_ITEMS })
                                : t('sdq.impact.title')
                            }
                        </div>
                        <div className="w-32 bg-slate-200 h-2 rounded-full mt-2 overflow-hidden ml-auto">
                            <div 
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${currentPage < 5 ? progressPercent : 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Switcher */}
            {currentPage < 5 ? (
                /* Part 1: Main 25 Questions */
                <div className="space-y-6">
                    {pageItems.map((itemIndex) => {
                        const isUnanswered = responses[itemIndex] === null;
                        const value = responses[itemIndex];
                        const questionLabel = t(`${informantKey}.item${itemIndex + 1}`);

                        return (
                            <div 
                                key={itemIndex}
                                id={`question-container-${itemIndex}`}
                                ref={el => questionRefs.current[itemIndex] = el}
                                className={`p-6 rounded-2xl border transition-all duration-300 bg-white ${
                                    isUnanswered && validationError
                                        ? 'border-rose-300 shadow-rose-50/50 shadow-lg'
                                        : 'border-slate-100 shadow-sm'
                                }`}
                            >
                                {/* Question Title & Tag */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                            {t('sdq.form.itemLabel', { n: itemIndex + 1 })}
                                        </span>
                                        {isUnanswered && (
                                            <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                                                <AlertCircle size={12} />
                                                Required
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-base font-bold text-slate-800 leading-relaxed">
                                        {questionLabel}
                                    </p>
                                </div>

                                {/* Option Buttons */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { val: 0, labelKey: 'sdq.form.options.notTrue' },
                                        { val: 1, labelKey: 'sdq.form.options.somewhatTrue' },
                                        { val: 2, labelKey: 'sdq.form.options.certainlyTrue' }
                                    ].map((opt) => {
                                        const isSelected = value === opt.val;
                                        return (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => handleSelectOption(itemIndex, opt.val)}
                                                className={`py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                                                    isSelected
                                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{t(opt.labelKey)}</span>
                                                {isSelected && <Check size={16} className="text-white shrink-0 ml-2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Part 2: Impact Assessment sub-form */
                <div className="space-y-6">
                    {/* 1. Main Severity Selector */}
                    <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white">
                        <div className="mb-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                                {t('sdq.impact.title')}
                            </span>
                            <p className="text-base font-bold text-slate-800 leading-relaxed mt-2">
                                {t('sdq.impact.hasProblems.question')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { val: 'no', labelKey: 'sdq.impact.hasProblems.no' },
                                { val: 'minor', labelKey: 'sdq.impact.hasProblems.minor' },
                                { val: 'definite', labelKey: 'sdq.impact.hasProblems.definite' },
                                { val: 'severe', labelKey: 'sdq.impact.hasProblems.severe' }
                            ].map((opt) => {
                                const isSelected = impactAssessment.hasImpactProblems === opt.val;
                                return (
                                    <button
                                        key={opt.val}
                                        type="button"
                                        onClick={() => handleSelectImpact('hasImpactProblems', opt.val)}
                                        className={`py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                                            isSelected
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>{t(opt.labelKey)}</span>
                                        {isSelected && <Check size={16} className="text-white shrink-0 ml-2" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Sub-questions visible only if difficulties are present */}
                    {impactAssessment.hasImpactProblems && impactAssessment.hasImpactProblems !== 'no' && (
                        <>
                            {/* Duration */}
                            <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white">
                                <p className="text-base font-bold text-slate-800 leading-relaxed mb-4">
                                    {t('sdq.impact.duration.question')}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { val: 'less_than_1_month', labelKey: 'sdq.impact.duration.lessThan1Month' },
                                        { val: '1_to_5_months', labelKey: 'sdq.impact.duration.oneToFiveMonths' },
                                        { val: '6_to_12_months', labelKey: 'sdq.impact.duration.sixToTwelveMonths' },
                                        { val: 'more_than_1_year', labelKey: 'sdq.impact.duration.moreThan1Year' }
                                    ].map((opt) => {
                                        const isSelected = impactAssessment.duration === opt.val;
                                        return (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => handleSelectImpact('duration', opt.val)}
                                                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                                                    isSelected
                                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{t(opt.labelKey)}</span>
                                                {isSelected && <Check size={16} className="text-white shrink-0 ml-2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Distress */}
                            <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white">
                                <p className="text-base font-bold text-slate-800 leading-relaxed mb-4">
                                    {t('sdq.impact.distress')}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { val: 'not_at_all', labelKey: 'sdq.impact.fourPoint.notAtAll' },
                                        { val: 'only_a_little', labelKey: 'sdq.impact.fourPoint.onlyALittle' },
                                        { val: 'quite_a_lot', labelKey: 'sdq.impact.fourPoint.quiteALot' },
                                        { val: 'a_great_deal', labelKey: 'sdq.impact.fourPoint.aGreatDeal' }
                                    ].map((opt) => {
                                        const isSelected = impactAssessment.distress === opt.val;
                                        return (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => handleSelectImpact('distress', opt.val)}
                                                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                                                    isSelected
                                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{t(opt.labelKey)}</span>
                                                {isSelected && <Check size={16} className="text-white shrink-0 ml-2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Social Impairment */}
                            <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white space-y-6">
                                <div>
                                    <p className="text-base font-bold text-slate-800 leading-relaxed">
                                        {t('sdq.impact.impairment.title')}
                                    </p>
                                </div>
                                {socialDomains.map((domain) => {
                                    const value = impactAssessment.socialImpairment[domain];
                                    return (
                                        <div key={domain} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                                            <p className="text-sm font-bold text-slate-700 mb-2">
                                                • {t(`sdq.impact.impairment.${domain}`)}
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {[
                                                    { val: 'not_at_all', labelKey: 'sdq.impact.fourPoint.notAtAll' },
                                                    { val: 'only_a_little', labelKey: 'sdq.impact.fourPoint.onlyALittle' },
                                                    { val: 'quite_a_lot', labelKey: 'sdq.impact.fourPoint.quiteALot' },
                                                    { val: 'a_great_deal', labelKey: 'sdq.impact.fourPoint.aGreatDeal' }
                                                ].map((opt) => {
                                                    const isSelected = value === opt.val;
                                                    return (
                                                        <button
                                                            key={opt.val}
                                                            type="button"
                                                            onClick={() => handleSelectSocialImpairment(domain, opt.val)}
                                                            className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                                                                isSelected
                                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <span>{t(opt.labelKey)}</span>
                                                            {isSelected && <Check size={12} className="text-white shrink-0 ml-1" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Burden */}
                            <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white">
                                <p className="text-base font-bold text-slate-800 leading-relaxed mb-4">
                                    {t('sdq.impact.burden')}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { val: 'not_at_all', labelKey: 'sdq.impact.fourPoint.notAtAll' },
                                        { val: 'only_a_little', labelKey: 'sdq.impact.fourPoint.onlyALittle' },
                                        { val: 'quite_a_lot', labelKey: 'sdq.impact.fourPoint.quiteALot' },
                                        { val: 'a_great_deal', labelKey: 'sdq.impact.fourPoint.aGreatDeal' }
                                    ].map((opt) => {
                                        const isSelected = impactAssessment.burdenOnOthers === opt.val;
                                        return (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => handleSelectImpact('burdenOnOthers', opt.val)}
                                                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                                                    isSelected
                                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{t(opt.labelKey)}</span>
                                                {isSelected && <Check size={16} className="text-white shrink-0 ml-2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* 3. Teacher Context (always shown to teachers) */}
                    {informantType === 'teacher' && (
                        <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white space-y-4">
                            <div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                                    ข้อมูลเพิ่มเติมสำหรับครู
                                </span>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    {t('sdq.impact.teacherSpecific.hoursPerWeek')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="168"
                                    value={impactAssessment.teacherSpecific.hoursPerDay}
                                    onChange={(e) => handleTeacherSpecificChange('hoursPerDay', e.target.value)}
                                    className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="ระบุตัวเลข เช่น 5"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    {t('sdq.impact.teacherSpecific.relationship')}
                                </label>
                                <input
                                    type="text"
                                    value={impactAssessment.teacherSpecific.relationshipQuality}
                                    onChange={(e) => handleTeacherSpecificChange('relationshipQuality', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="ระบุบทบาทการดูแล เช่น ครูประจำชั้น, ครูผู้สอนคณิตศาสตร์"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 mb-12">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePrev}
                    disabled={currentPage === 0}
                    className={`flex items-center gap-2 ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <ArrowLeft size={18} />
                    <span>ก่อนหน้า</span>
                </Button>

                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    หน้า {currentPage + 1} / {totalPages}
                </div>

                {currentPage < totalPages - 1 ? (
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleNext}
                        className="flex items-center gap-2"
                    >
                        <span>ถัดไป</span>
                        <ArrowRight size={18} />
                    </Button>
                ) : (
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                        className={`flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white ${
                            !isCompleted ? 'opacity-90 hover:bg-emerald-600' : ''
                        }`}
                    >
                        {isSubmitting ? 'กำลังส่ง...' : t('sdq.form.submit')}
                        <Check size={18} />
                    </Button>
                )}
            </div>
        </form>
    );
}
