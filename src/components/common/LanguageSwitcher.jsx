import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const LanguageSwitcher = () => {
    const { language, changeLanguage } = useLanguage();

    return (
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
                onClick={() => changeLanguage('th')}
                className={`px-3 py-1 rounded-md text-sm font-bold transition-all ${language === 'th' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                ไทย
            </button>
            <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded-md text-sm font-bold transition-all ${language === 'en' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                EN
            </button>
        </div>
    );
};

export default LanguageSwitcher;
