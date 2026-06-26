/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Check localStorage first, default to 'th'
        const savedLanguage = localStorage.getItem('appLanguage');
        return savedLanguage || 'th';
    });

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
        // Optional: Update HTML lang attribute
        document.documentElement.lang = language;
    }, [language]);

    const t = (key, params = {}) => {
        if (!translations[language][key]) {
            console.warn(`Missing translation key: ${key} for language: ${language}`);
            return key;
        }
        
        let text = translations[language][key];

        // Basic interpolation support: replace {varName} with params.varName
        Object.keys(params).forEach(paramKey => {
            const regex = new RegExp(`\\{${paramKey}\\}`, 'g');
            text = text.replace(regex, params[paramKey]);
        });

        return text;
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'th' ? 'en' : 'th');
    };

    const changeLanguage = (lang) => {
        if (translations[lang]) {
            setLanguage(lang);
        }
    };

    // Helper for date formatting
    const formatDate = (dateString, options = {}) => {
        if (!dateString) return '';

        // Handle Firestore Timestamp objects or objects with { seconds, nanoseconds }
        let dateVal = dateString;
        if (dateString && typeof dateString.toDate === 'function') {
            dateVal = dateString.toDate();
        } else if (dateString && typeof dateString.seconds === 'number') {
            dateVal = new Date(dateString.seconds * 1000);
        }

        // Ensure we have a Date object
        const date = new Date(dateVal);
        if (isNaN(date.getTime())) return String(dateString); // Return string representation to avoid React error #31

        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        };

        const locale = language === 'th' ? 'th-TH' : 'en-US';
        return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(date);
    };
    // Helper for number formatting
    const formatNumber = (number) => {
        const locale = language === 'th' ? 'th-TH' : 'en-US';
        return new Intl.NumberFormat(locale).format(number);
    };

    return (
        <LanguageContext.Provider value={{ language, t, toggleLanguage, changeLanguage, formatDate, formatNumber }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
