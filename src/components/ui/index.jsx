import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Standard Button component for NR Nexus.
 */
export const Button = ({ variant = 'primary', children, className = '', ...props }) => {
  const styles = {
    primary: "bg-primary text-white hover:bg-primary-dark",
    secondary: "bg-white border border-primary text-primary",
    danger: "bg-absent text-white",
    ghost: "text-primary hover:bg-primary-light",
  };

  return (
    <button 
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${styles[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Standard Status Badge for NR Nexus.
 */
export const StatusBadge = ({ status, className = '' }) => {
  const { t } = useLanguage();
  
  const config = {
    present: { label: t('present'), color: 'bg-present' },
    absent:  { label: t('absent'),  color: 'bg-absent' },
    late:    { label: t('late'),    color: 'bg-late' },
    leave_sick: { label: t('leave_sick'), color: 'bg-leave' },
    leave_personal: { label: t('leave_personal'), color: 'bg-leave' },
    active: { label: t('active') || 'Active', color: 'bg-present' },
    pending: { label: t('pending') || 'Pending', color: 'bg-slate-400' },
  };

  const style = config[status] || { label: status, color: 'bg-slate-500' };

  return (
    <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${style.color} ${className}`}>
      {style.label}
    </span>
  );
};

/**
 * Standard Card component.
 */
export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${className}`}>
    {children}
  </div>
);

/**
 * Standard Page Header component.
 */
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

/**
 * Standard Empty State component.
 */
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="text-center py-12">
    <div className="text-4xl mb-3">{icon}</div>
    <p className="font-medium text-gray-700">{title}</p>
    {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/**
 * Standard Loading Spinner component.
 */
export const LoadingSpinner = ({ size = "md", className = "" }) => {
  const sizes = { 
    sm: "w-4 h-4", 
    md: "w-8 h-8", 
    lg: "w-12 h-12" 
  };
  return (
    <div className={`${sizes[size]} border-2 border-gray-200 border-t-primary rounded-full animate-spin ${className}`} />
  );
};
