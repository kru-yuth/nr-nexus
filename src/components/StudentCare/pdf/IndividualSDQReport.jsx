import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import './fonts'; // Registers Sarabun font
import { PDF_COLORS } from './pdfColors';
import { translations } from '../../../i18n/translations';
import { aggregateSDQResults } from '../../../services/careService';

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Sarabun',
        padding: 35,
        fontSize: 10,
        color: PDF_COLORS.textDark,
        backgroundColor: PDF_COLORS.white,
    },
    headerContainer: {
        borderBottomWidth: 2,
        borderBottomColor: PDF_COLORS.primary,
        paddingBottom: 12,
        marginBottom: 15,
        textAlign: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: PDF_COLORS.primary,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 11,
        color: PDF_COLORS.textMuted,
        fontWeight: 'bold',
    },
    studentInfoContainer: {
        backgroundColor: PDF_COLORS.grayBg,
        borderColor: PDF_COLORS.grayBorder,
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginBottom: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    infoCol: {
        width: '50%',
        marginBottom: 4,
    },
    infoLabel: {
        color: PDF_COLORS.textMuted,
        fontWeight: 'bold',
        fontSize: 9,
    },
    infoVal: {
        fontSize: 9,
        fontWeight: 'normal',
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: PDF_COLORS.primary,
        marginBottom: 8,
    },
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: PDF_COLORS.borderLight,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 15,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: PDF_COLORS.borderLight,
        alignItems: 'center',
        minHeight: 25,
    },
    tableHeaderRow: {
        backgroundColor: PDF_COLORS.primaryLight,
        borderBottomWidth: 1,
        borderBottomColor: PDF_COLORS.borderLight,
        minHeight: 25,
    },
    colLabelHeader: {
        width: '40%',
        padding: 6,
        fontSize: 9,
        fontWeight: 'bold',
        color: PDF_COLORS.textDark,
        borderRightWidth: 1,
        borderRightColor: PDF_COLORS.borderLight,
    },
    colValHeader: {
        width: '20%',
        padding: 6,
        fontSize: 9,
        fontWeight: 'bold',
        color: PDF_COLORS.textDark,
        textAlign: 'center',
        borderRightWidth: 1,
        borderRightColor: PDF_COLORS.borderLight,
    },
    colValHeaderLast: {
        width: '20%',
        padding: 6,
        fontSize: 9,
        fontWeight: 'bold',
        color: PDF_COLORS.textDark,
        textAlign: 'center',
    },
    colLabel: {
        width: '40%',
        padding: 6,
        fontSize: 8.5,
        borderRightWidth: 1,
        borderRightColor: PDF_COLORS.borderLight,
        fontWeight: 'bold',
    },
    colVal: {
        width: '20%',
        padding: 6,
        fontSize: 8,
        textAlign: 'center',
        borderRightWidth: 1,
        borderRightColor: PDF_COLORS.borderLight,
    },
    colValLast: {
        width: '20%',
        padding: 6,
        fontSize: 8,
        textAlign: 'center',
    },
    statusNormal: {
        backgroundColor: PDF_COLORS.greenBg,
        color: PDF_COLORS.greenText,
        fontWeight: 'bold',
    },
    statusWatch: {
        backgroundColor: PDF_COLORS.yellowBg,
        color: PDF_COLORS.yellowText,
        fontWeight: 'bold',
    },
    statusAttention: {
        backgroundColor: PDF_COLORS.redBg,
        color: PDF_COLORS.redText,
        fontWeight: 'bold',
    },
    statusNoData: {
        backgroundColor: PDF_COLORS.grayBg,
        color: PDF_COLORS.grayText,
    },
    summaryContainer: {
        borderColor: PDF_COLORS.borderLight,
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginBottom: 15,
        backgroundColor: '#fafafa',
    },
    summaryTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    summaryText: {
        fontSize: 9,
        lineHeight: 1.4,
    },
    recommendationBox: {
        backgroundColor: '#fff1f2',
        borderColor: '#ffe4e6',
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginBottom: 15,
    },
    recommendationText: {
        color: PDF_COLORS.redText,
        fontWeight: 'bold',
        fontSize: 9.5,
    },
    footer: {
        position: 'absolute',
        bottom: 25,
        left: 35,
        right: 35,
        borderTopWidth: 1,
        borderTopColor: PDF_COLORS.borderLight,
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        color: PDF_COLORS.textMuted,
        fontSize: 8,
    }
});

const getTranslation = (key, lang = 'th') => {
    const parts = key.split('.');
    let current = translations[lang];
    for (const part of parts) {
        if (!current || current[part] === undefined) {
            if (translations[lang]?.[key] !== undefined) {
                return translations[lang][key];
            }
            return key;
        }
        current = current[part];
    }
    return current;
};

export default function IndividualSDQReport({ studentInfo, sdqAssessments, schoolInfo }) {
    const schoolYear = schoolInfo?.schoolYear || '2569';
    const schoolName = schoolInfo?.schoolName || 'โรงเรียนฤทธิณรงค์รอน';

    const aggregation = aggregateSDQResults(sdqAssessments);
    const { byInformant = {}, overallTrafficLight = 'green' } = aggregation;

    const teacherAss = byInformant.teacher;
    const parentAss = byInformant.parent;
    const studentAss = byInformant.student;

    const requires9Q = sdqAssessments.some(a => a.result?.requires9Q === true);

    const getStatusCellStyle = (band) => {
        switch (band) {
            case 'abnormal':
                return styles.statusAttention;
            case 'borderline':
                return styles.statusWatch;
            case 'normal':
                return styles.statusNormal;
            default:
                return styles.statusNoData;
        }
    };

    const renderCell = (assessment, subscaleKey, isTotal = false, isLast = false) => {
        const colStyle = isLast ? styles.colValLast : styles.colVal;
        if (!assessment || !assessment.result) {
            return (
                <Text style={[colStyle, styles.statusNoData]}>
                    {getTranslation('careCase.pdf.notAssessed')}
                </Text>
            );
        }

        const result = assessment.result;
        let score;
        let band;

        if (isTotal) {
            score = result.totalDifficultyScore;
            band = result.band;
        } else {
            score = result[subscaleKey];
            band = result.subscaleBands?.[subscaleKey];
        }

        const bandLabel = getTranslation(`careCase.dashboard.riskLevel.${band === 'abnormal' ? 'attention' : band === 'borderline' ? 'watch' : 'normal'}`);
        const cellStyle = getStatusCellStyle(band);

        return (
            <Text style={[colStyle, cellStyle]}>
                {score} ({bandLabel})
            </Text>
        );
    };

    const formattedDate = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const getOverallDescription = () => {
        if (overallTrafficLight === 'red') {
            return 'จากการประเมินร่วมกัน พบปัญหาสัญญาณความเสี่ยงสูงด้านพฤติกรรมหรืออารมณ์ในระดับที่ต้องดูแลช่วยเหลืออย่างใกล้ชิด (Attention)';
        } else if (overallTrafficLight === 'yellow') {
            return 'จากการประเมินร่วมกัน พบสัญญาณความเสี่ยงในระดับปานกลาง (Watch / At Risk) ควรได้รับการติดตามพฤติกรรมอย่างใกล้ชิด';
        } else {
            return 'จากการประเมินร่วมกัน ผลอยู่ในเกณฑ์ปกติ (Normal) ไม่มีข้อบ่งชี้ความเสี่ยงรุนแรง';
        }
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>{getTranslation('careCase.pdf.reportTitle')}</Text>
                    <Text style={styles.subtitle}>{schoolName}</Text>
                </View>

                {/* Student Metadata */}
                <View style={styles.studentInfoContainer}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>ชื่อ-สกุลนักเรียน:</Text>
                        <Text style={styles.infoVal}>{studentInfo?.name || 'Unknown'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>รหัสประจำตัว:</Text>
                        <Text style={styles.infoVal}>{studentInfo?.studentNo || studentInfo?.studentId || '-'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>ระดับชั้นเรียน:</Text>
                        <Text style={styles.infoVal}>ชั้น ม.{studentInfo?.level || '-'}{studentInfo?.class ? `/${studentInfo.class}` : ''}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>{getTranslation('careCase.pdf.schoolYear')}:</Text>
                        <Text style={styles.infoVal}>{schoolYear}</Text>
                    </View>
                </View>

                {/* Subscales Matrix Table */}
                <Text style={styles.sectionTitle}>ผลการประเมินแยกตามผู้ประเมิน</Text>
                <View style={styles.table}>
                    {/* Header Row */}
                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                        <Text style={styles.colLabelHeader}>ด้านที่ประเมิน (SDQ Subscale)</Text>
                        <Text style={styles.colValHeader}>{getTranslation('careCase.pdf.informant.teacher')}</Text>
                        <Text style={styles.colValHeader}>{getTranslation('careCase.pdf.informant.parent')}</Text>
                        <Text style={styles.colValHeaderLast}>{getTranslation('careCase.pdf.informant.student')}</Text>
                    </View>

                    {/* Emotional */}
                    <View style={styles.tableRow}>
                        <Text style={styles.colLabel}>1. ด้านอาการทางอารมณ์ (Emotional Symptoms)</Text>
                        {renderCell(teacherAss, 'emotional', false, false)}
                        {renderCell(parentAss, 'emotional', false, false)}
                        {renderCell(studentAss, 'emotional', false, true)}
                    </View>

                    {/* Conduct */}
                    <View style={styles.tableRow}>
                        <Text style={styles.colLabel}>2. ด้านปัญหาความประพฤติ (Conduct Problems)</Text>
                        {renderCell(teacherAss, 'conduct', false, false)}
                        {renderCell(parentAss, 'conduct', false, false)}
                        {renderCell(studentAss, 'conduct', false, true)}
                    </View>

                    {/* Hyperactivity */}
                    <View style={styles.tableRow}>
                        <Text style={styles.colLabel}>3. ด้านสมาธิสั้น/ไม่อยู่นิ่ง (Hyperactivity/Inattention)</Text>
                        {renderCell(teacherAss, 'hyperactivity', false, false)}
                        {renderCell(parentAss, 'hyperactivity', false, false)}
                        {renderCell(studentAss, 'hyperactivity', false, true)}
                    </View>

                    {/* Peer Problems */}
                    <View style={styles.tableRow}>
                        <Text style={styles.colLabel}>4. ด้านปัญหาความสัมพันธ์กับเพื่อน (Peer Problems)</Text>
                        {renderCell(teacherAss, 'peer', false, false)}
                        {renderCell(parentAss, 'peer', false, false)}
                        {renderCell(studentAss, 'peer', false, true)}
                    </View>

                    {/* Prosocial */}
                    <View style={styles.tableRow}>
                        <Text style={styles.colLabel}>5. ด้านสัมพันธภาพทางสังคม (Prosocial Behavior)</Text>
                        {renderCell(teacherAss, 'prosocial', false, false)}
                        {renderCell(parentAss, 'prosocial', false, false)}
                        {renderCell(studentAss, 'prosocial', false, true)}
                    </View>

                    {/* Total Difficulty */}
                    <View style={[styles.tableRow, { backgroundColor: '#fcfcfc', borderBottomWidth: 0 }]}>
                        <Text style={[styles.colLabel, { fontWeight: 'bold' }]}>คะแนนรวมความยากลำบาก (Total Difficulty)</Text>
                        {renderCell(teacherAss, '', true, false)}
                        {renderCell(parentAss, '', true, false)}
                        {renderCell(studentAss, '', true, true)}
                    </View>
                </View>

                {/* Overall Summary */}
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>สรุปผลการวิเคราะห์ระดับชั้นเรียน</Text>
                    <Text style={styles.summaryText}>{getOverallDescription()}</Text>
                </View>

                {/* 9Q Recommendation Alert */}
                {requires9Q && (
                    <View style={styles.recommendationBox}>
                        <Text style={styles.recommendationText}>
                            ⚠ ข้อแนะนำทางการแพทย์: นักเรียนมีผลประเมินบางด้าน (เช่น ด้านอารมณ์ หรือคะแนนผลกระทบ) เกินเกณฑ์เฉลี่ยมาตรฐาน สมควรได้รับการติดตามและส่งต่อทำแบบประเมินโรคซึมเศร้า 9Q เพิ่มเติม
                        </Text>
                    </View>
                )}

                {/* Page Footer */}
                <View style={styles.footer} fixed>
                    <Text>พิมพ์ผ่านระบบ NR Nexus</Text>
                    <Text>{getTranslation('careCase.pdf.printedOn')}: {formattedDate}</Text>
                </View>
            </Page>
        </Document>
    );
}
