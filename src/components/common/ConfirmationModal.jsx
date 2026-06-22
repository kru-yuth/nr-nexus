import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    isLoading = false,
    variant = 'danger' // 'danger' | 'success' | 'info'
}) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    const colors = {
        danger: 'bg-rose-500 hover:bg-rose-600 shadow-rose-100',
        success: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100',
        info: 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 relative overflow-hidden animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-900 transition-all rounded-full hover:bg-slate-50">
                    <X size={24} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 ${variant === 'danger' ? 'bg-rose-50 text-rose-500' : variant === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        {variant === 'danger' ? <AlertCircle size={40} /> : <CheckCircle2 size={40} />}
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase italic mb-4">{title}</h2>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-wide leading-loose mb-10">{message}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all"
                        >
                            {cancelText || t('cancel_btn')}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95 disabled:opacity-50 ${colors[variant]}`}
                        >
                            {isLoading ? t('processing') : (confirmText || t('ok'))}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
