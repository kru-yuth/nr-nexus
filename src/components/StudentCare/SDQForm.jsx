import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Card } from '../ui';
import { toast } from 'react-hot-toast';
import { Check, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

const ITEMS_PER_PAGE = 5;
const TOTAL_ITEMS = 29;

export default function SDQForm({
    informantType = 'student',
    studentName = '',
    onSubmit,
    assessmentType = 'initial',
    isSubmitting = false,
}) {
    const { t } = useLanguage();

    // Initialize state
    // For teacher, default all 29 items to 0 (Not True)
    // For parent/student, initialize all 29 items to null (Unanswered)
    const [responses, setResponses] = useState(() => {
        if (informantType === 'teacher') {
            return Array(TOTAL_ITEMS).fill(0);
        }
        return Array(TOTAL_ITEMS).fill(null);
    });

    const [currentPage, setCurrentPage] = useState(0);
    const [validationError, setValidationError] = useState(false);
    
    // Create refs for questions to support smooth scrolling to unanswered questions
    const questionRefs = useRef([]);

    // Calculate total pages (29 items / 5 = 6 pages: 5, 5, 5, 5, 5, 4)
    const totalPages = Math.ceil(TOTAL_ITEMS / ITEMS_PER_PAGE);

    const answeredCount = responses.filter(r => r !== null).length;
    const progressPercent = Math.round((answeredCount / TOTAL_ITEMS) * 100);
    const isCompleted = answeredCount === TOTAL_ITEMS;

    // Determine items for current page
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, TOTAL_ITEMS);
    const pageItems = Array.from(
        { length: endIndex - startIndex },
        (_, i) => startIndex + i
    );

    const handleSelectOption = (itemIndex, val) => {
        setResponses(prev => {
            const next = [...prev];
            next[itemIndex] = val;
            return next;
        });
    };

    const handleNext = () => {
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

        // Check if all items are answered
        const firstUnanswered = responses.findIndex(r => r === null);
        if (firstUnanswered !== -1) {
            setValidationError(true);
            toast.error(t('sdq.form.incomplete'));
            
            // Calculate which page the unanswered item resides on
            const targetPage = Math.floor(firstUnanswered / ITEMS_PER_PAGE);
            setCurrentPage(targetPage);

            // Wait for state transition to complete, then scroll
            setTimeout(() => {
                const element = document.getElementById(`question-container-${firstUnanswered}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Visual feedback shake/flash
                    element.classList.add('border-rose-400', 'bg-rose-50/50');
                    setTimeout(() => {
                        element.classList.remove('border-rose-400', 'bg-rose-50/50');
                    }, 2000);
                }
            }, 100);
            return;
        }

        setValidationError(false);
        if (onSubmit) {
            await onSubmit(responses);
        }
    };

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
                            {t('sdq.form.progress', { current: answeredCount, total: TOTAL_ITEMS })}
                        </div>
                        <div className="w-32 bg-slate-200 h-2 rounded-full mt-2 overflow-hidden ml-auto">
                            <div 
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions list */}
            <div className="space-y-6">
                {pageItems.map((itemIndex) => {
                    const isUnanswered = responses[itemIndex] === null;
                    const value = responses[itemIndex];
                    const questionLabel = t(`sdq.items.item${itemIndex + 1}`);
                    const isImpactItem = itemIndex >= 25;

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
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                        isImpactItem 
                                            ? 'bg-amber-100 text-amber-700' 
                                            : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {isImpactItem ? 'Impact Section' : `Item ${itemIndex + 1}`}
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
