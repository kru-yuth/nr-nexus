import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button, LoadingSpinner } from '../../ui';
import { useLanguage } from '../../../context/LanguageContext';
import IndividualSDQReport from './IndividualSDQReport';
import ClassSDQReport from './ClassSDQReport';
import { FileText } from 'lucide-react';

export default function PDFExportButton({ type, data, fileName, className }) {
    const { t } = useLanguage();

    const getDocument = () => {
        if (type === 'individual') {
            return (
                <IndividualSDQReport 
                    studentInfo={data.studentInfo}
                    sdqAssessments={data.sdqAssessments}
                    schoolInfo={data.schoolInfo}
                />
            );
        } else if (type === 'class') {
            return (
                <ClassSDQReport 
                    homeroomClass={data.homeroomClass}
                    schoolYear={data.schoolYear}
                    classSummary={data.classSummary}
                />
            );
        }
        return null;
    };

    const doc = getDocument();
    if (!doc) return null;

    const labelKey = type === 'class' ? 'careCase.pdf.exportClass' : 'careCase.pdf.exportIndividual';

    return (
        <PDFDownloadLink document={doc} fileName={fileName} style={{ textDecoration: 'none' }}>
            {({ loading }) => (
                <Button
                    type="button"
                    variant="secondary"
                    disabled={loading}
                    className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest ${className || ''}`}
                >
                    {loading ? (
                        <>
                            <LoadingSpinner size="sm" />
                            <span>{t('careCase.pdf.generating')}</span>
                        </>
                    ) : (
                        <>
                            <FileText size={14} />
                            <span>{t(labelKey)}</span>
                        </>
                    )}
                </Button>
            )}
        </PDFDownloadLink>
    );
}
