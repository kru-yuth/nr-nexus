import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import './fonts'; // Registers Sarabun font
import { PDF_COLORS } from './pdfColors';
import { translations } from '../../../i18n/translations';

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Sarabun',
        padding: 40,
        fontSize: 10,
        color: PDF_COLORS.textDark,
        backgroundColor: PDF_COLORS.white,
        position: 'relative',
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
    summaryBar: {
        backgroundColor: PDF_COLORS.grayBg,
        borderColor: PDF_COLORS.grayBorder,
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    dotGreen: { backgroundColor: PDF_COLORS.greenText },
    dotYellow: { backgroundColor: PDF_COLORS.yellowText },
    dotRed: { backgroundColor: PDF_COLORS.redText },
    dotGray: { backgroundColor: PDF_COLORS.grayText },
    summaryText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: PDF_COLORS.borderLight,
        borderRadius: 6,
        overflow: 'hidden',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: PDF_COLORS.borderLight,
        alignItems: 'center',
        minHeight: 26,
    },
    tableHeaderRow: {
        backgroundColor: PDF_COLORS.primaryLight,
        borderBottomWidth: 1,
        borderBottomColor: PDF_COLORS.borderLight,
        minHeight: 28,
    },
    colNo: {
        width: '20%',
        padding: 6,
        textAlign: 'center',
        borderRightWidth: 1,
        borderRightColor: PDF_COLORS.borderLight,
    },
    colName: {
        width: '45%',
        padding: 6,
        borderRightWidth: 1,
        borderRightColor: PDF_COLORS.borderLight,
    },
    colResult: {
        width: '35%',
        padding: 6,
        textAlign: 'center',
    },
    textHeader: {
        fontSize: 9,
        fontWeight: 'bold',
        color: PDF_COLORS.textDark,
    },
    textCell: {
        fontSize: 8.5,
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
    footer: {
        position: 'absolute',
        bottom: 25,
        left: 40,
        right: 40,
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

export default function ClassSDQReport({ homeroomClass, schoolYear, classSummary }) {
    const schoolName = 'โรงเรียนฤทธิณรงค์รอน';
    
    const { studentRiskList = [], colorCounts = {} } = classSummary || {};
    const noDataCount = studentRiskList.filter(s => s.trafficLight === null).length;

    const subscaleNames = {
        emotional: 'อารมณ์',
        conduct: 'ความประพฤติ',
        hyperactivity: 'ไม่อยู่นิ่ง',
        peer: 'เพื่อน',
        prosocial: 'สัมพันธ์ดี'
    };

    const getStatusStyle = (student) => {
        const light = student.trafficLight;
        const riskText = student.riskSubscales && student.riskSubscales.length > 0
            ? `ด้าน ${student.riskSubscales.map(s => subscaleNames[s] || s).join(', ')}`
            : '';

        switch (light) {
            case 'red':
                return {
                    label: `ต้องดูแล${riskText ? ` (${riskText})` : ''}`,
                    style: styles.statusAttention
                };
            case 'yellow':
                return {
                    label: `เสี่ยง${riskText ? ` (${riskText})` : ''}`,
                    style: styles.statusWatch
                };
            case 'green':
                return {
                    label: getTranslation('careCase.dashboard.riskLevel.normal'),
                    style: styles.statusNormal
                };
            default:
                return {
                    label: getTranslation('careCase.dashboard.riskLevel.noData'),
                    style: styles.statusNoData
                };
        }
    };

    const formattedDate = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>{getTranslation('careCase.pdf.reportTitle')}</Text>
                    <Text style={styles.subtitle}>ชั้นมัธยมศึกษาปีที่ {homeroomClass} • {schoolName} • ปีการศึกษา {schoolYear}</Text>
                </View>

                {/* Summary bar */}
                <View style={styles.summaryBar}>
                    <View style={styles.summaryItem}>
                        <View style={[styles.dot, styles.dotGreen]} />
                        <Text style={styles.summaryText}>ปกติ {colorCounts.green || 0} คน</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <View style={[styles.dot, styles.dotYellow]} />
                        <Text style={styles.summaryText}>เสี่ยง {colorCounts.yellow || 0} คน</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <View style={[styles.dot, styles.dotRed]} />
                        <Text style={styles.summaryText}>ต้องดูแล {colorCounts.red || 0} คน</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <View style={[styles.dot, styles.dotGray]} />
                        <Text style={styles.summaryText}>ไม่มีข้อมูล {noDataCount || 0} คน</Text>
                    </View>
                </View>

                {/* Roster Table */}
                <View style={styles.table}>
                    {/* Header Row */}
                    <View style={[styles.tableRow, styles.tableHeaderRow]} fixed>
                        <Text style={[styles.colNo, styles.textHeader]}>เลขประจำตัว</Text>
                        <Text style={[styles.colName, styles.textHeader]}>ชื่อ-นามสกุล</Text>
                        <Text style={[styles.colResult, styles.textHeader]}>ผลการประเมินความเสี่ยง</Text>
                    </View>

                    {/* Student Rows */}
                    {studentRiskList.map((student) => {
                        const status = getStatusStyle(student);
                        return (
                            <View style={styles.tableRow} key={student.studentId} wrap={false}>
                                <Text style={[styles.colNo, styles.textCell]}>
                                    {student.studentNo || '-'}
                                </Text>
                                <Text style={[styles.colName, styles.textCell]}>
                                    {student.name || 'Unknown'}
                                </Text>
                                <Text style={[styles.colResult, styles.textCell, status.style]}>
                                    {status.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text>พิมพ์ผ่านระบบ NR Nexus</Text>
                    <Text render={({ pageNumber, totalPages }) => `หน้า ${pageNumber} จาก ${totalPages}`} />
                    <Text>{getTranslation('careCase.pdf.printedOn')}: {formattedDate}</Text>
                </View>
            </Page>
        </Document>
    );
}
