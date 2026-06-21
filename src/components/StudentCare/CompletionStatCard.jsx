import React from 'react';
import { Card } from '../ui';

export default function CompletionStatCard({ label, completed = 0, total = 0, colorAccent = 'primary' }) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Harmonious modern colors based on informant type
    const accentStyles = {
        primary: {
            text: 'text-primary',
            bg: 'bg-primary-light',
            progress: 'bg-primary',
            border: 'border-primary/10'
        },
        parent: {
            text: 'text-indigo-600',
            bg: 'bg-indigo-50',
            progress: 'bg-indigo-600',
            border: 'border-indigo-100'
        },
        student: {
            text: 'text-amber-600',
            bg: 'bg-amber-50',
            progress: 'bg-amber-500',
            border: 'border-amber-100'
        }
    };

    const style = accentStyles[colorAccent] || accentStyles.primary;

    return (
        <Card className={`p-6 border ${style.border} bg-white transition-all hover:scale-[1.01] hover:shadow-md duration-300 flex flex-col justify-between`}>
            <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    {label}
                </span>
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                        {percentage}%
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                        {completed} / {total}
                    </span>
                </div>
            </div>

            {/* Progress bar visual indicator */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden shadow-inner">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${style.progress}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </Card>
    );
}
