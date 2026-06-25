import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { generateParentSDQToken } from '../../services/careService';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { Card, Button, LoadingSpinner } from '../ui';
import { Link, Copy, Check, Calendar, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SDQTokenGenerator({ caseId, studentId, schoolYear, classId = null }) {
    const { user: currentUser } = useAuth();
    const { t, formatDate } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [tokenData, setTokenData] = useState(null); // { token, url, expiresAt }
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const checkExistingToken = async () => {
            try {
                if (!studentId) return;

                const constraints = [
                    where('studentId', '==', studentId),
                    where('schoolYear', '==', schoolYear || '2569')
                ];
                if (classId) {
                    constraints.push(where('classId', '==', classId));
                }
                const q = query(collection(db, 'sdqTokens'), ...constraints);

                const snap = await getDocs(q);
                const now = new Date();

                // Find active, unused, unexpired token
                const active = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .find(tData => {
                        const isUsed = !!tData.usedAt;
                        const expiresDate = tData.expiresAt?.toDate 
                            ? tData.expiresAt.toDate() 
                            : new Date(tData.expiresAt);
                        const isExpired = expiresDate < now;
                        return !isUsed && !isExpired;
                    });

                if (active) {
                    setTokenData({
                        token: active.token,
                        url: `${window.location.origin}/sdq/parent/${active.token}`,
                        expiresAt: active.expiresAt
                    });
                } else {
                    setTokenData(null);
                }
            } catch (err) {
                console.error("Error checking existing SDQ tokens:", err);
            } finally {
                setLoading(false);
            }
        };

        checkExistingToken();
    }, [studentId, schoolYear]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const result = await generateParentSDQToken(
                studentId,
                currentUser,
                caseId || null,
                schoolYear || '2569'
            );
            // Result is { token, url }. We'll fetch the doc to get expiresAt or construct a client timestamp
            // Default token expires in 30 days
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            setTokenData({
                token: result.token,
                url: result.url,
                expiresAt: expiresAt
            });
            toast.success("สร้างลิงก์สำหรับผู้ปกครองสำเร็จ!");
        } catch (err) {
            console.error("Error generating parent SDQ token:", err);
            toast.error("ไม่สามารถสร้างลิงก์ได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!tokenData?.url) return;
        navigator.clipboard.writeText(tokenData.url);
        setCopied(true);
        toast.success(t('sdq.tokenGenerator.copied'));
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <LoadingSpinner size="sm" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Checking active links...</span>
            </div>
        );
    }

    return (
        <Card className="p-5 border border-slate-100 bg-slate-50/30">
            {tokenData ? (
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                                <Check size={12} />
                                Active Token Link Available
                            </span>
                            <p className="text-xs text-slate-500 font-semibold mt-1">
                                ลิงก์สำหรับผู้ปกครองในการทำแบบประเมิน SDQ
                            </p>
                        </div>
                        {tokenData.expiresAt && (
                            <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <Calendar size={10} />
                                {t('sdq.tokenGenerator.expiresOn', { 
                                    date: formatDate(tokenData.expiresAt.toDate ? tokenData.expiresAt.toDate() : tokenData.expiresAt, { hour: undefined, minute: undefined }) 
                                })}
                            </span>
                        )}
                    </div>

                    {/* Link display & copy */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 pl-3 shadow-inner">
                        <Link size={14} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            readOnly
                            value={tokenData.url}
                            className="bg-transparent border-none outline-none text-xs text-slate-600 font-mono w-full select-all"
                        />
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`p-2 rounded-lg transition-colors shrink-0 flex items-center justify-center ${
                                copied 
                                    ? 'bg-emerald-50 text-emerald-600' 
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-sm font-black text-slate-800 tracking-tight">
                            แบบประเมินผู้ปกครอง (SDQ-P)
                        </h4>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                            สร้างลิงก์สำหรับส่งให้ผู้ปกครองทำแบบประเมินคัดกรองออนไลน์
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleGenerate}
                        className="flex items-center justify-center gap-2 text-xs py-2.5 px-4"
                    >
                        <Link size={14} />
                        <span>{t('sdq.tokenGenerator.generate')}</span>
                    </Button>
                </div>
            )}
        </Card>
    );
}
