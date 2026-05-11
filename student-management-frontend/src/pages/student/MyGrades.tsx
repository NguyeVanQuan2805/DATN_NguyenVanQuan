// pages/student/MyGrades.tsx
import React, { useEffect, useState, useContext } from 'react';
import {
    Card, Row, Col, Table, Tag, Progress, Spin,
    message, Typography, Select, Button, Empty, Alert, Space,
    Tabs, Tooltip, Divider, Badge, Statistic,
} from 'antd';
import {
    TrophyOutlined, BookOutlined, ReloadOutlined, StarOutlined,
    CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
    LineChartOutlined, PieChartOutlined, DownloadOutlined,
    FireOutlined, ThunderboltOutlined, ClockCircleOutlined,
    SaveOutlined, FileTextOutlined, CalendarOutlined,
    SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { AuthContext } from '../../context/AuthContext';
import { useAcademicSummary, getScoreColor, getGpaColor, getGpaClassification } from '../../hooks/useAcademicSummary';

const { Title, Text } = Typography;
const { Option } = Select;

// ============================================================
// Constants - GIỮ NGUYÊN NHƯ CŨ
// ============================================================
const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode; description: string }> = {
    SAVED: {
        color: 'purple',
        label: 'Đã lưu',
        icon: <SaveOutlined />,
        description: 'Giảng viên đã nhập điểm nhưng chưa gửi duyệt'
    },
    SUBMITTED: {
        color: 'orange',
        label: 'Chờ duyệt',
        icon: <ClockCircleOutlined />,
        description: 'Đã gửi lên phòng đào tạo, đang chờ xác nhận'
    },
    APPROVED: {
        color: 'green',
        label: 'Đã duyệt',
        icon: <CheckCircleOutlined />,
        description: 'Điểm đã được xác nhận chính thức'
    },
};

const LETTER_GRADE_MAP: Record<string, { gpa4: number; color: string; bg: string; description: string }> = {
    'A': { gpa4: 4.0, color: '#00c853', bg: '#e8f5e9', description: 'Giỏi xuất sắc' },
    'B+': { gpa4: 3.5, color: '#00bcd4', bg: '#e0f7fa', description: 'Giỏi' },
    'B': { gpa4: 3.0, color: '#2979ff', bg: '#e3f2fd', description: 'Khá giỏi' },
    'C+': { gpa4: 2.5, color: '#7c4dff', bg: '#ede7f6', description: 'Khá' },
    'C': { gpa4: 2.0, color: '#ff9100', bg: '#fff3e0', description: 'Trung bình' },
    'D+': { gpa4: 1.5, color: '#ff6d00', bg: '#fbe9e7', description: 'Dưới trung bình' },
    'D': { gpa4: 1.0, color: '#ff9100', bg: '#fff3e0', description: 'Dưới trung bình (Đạt)' },
    'F': { gpa4: 0.0, color: '#d50000', bg: '#ffebee', description: 'Trượt' },
};

const GPA_CLASSIFICATION = [
    { min: 3.6, max: 4.0, label: 'Xuất sắc', color: '#00c853', gradient: 'linear-gradient(135deg,#00c853,#69f0ae)' },
    { min: 3.2, max: 3.59, label: 'Giỏi', color: '#2979ff', gradient: 'linear-gradient(135deg,#2979ff,#82b1ff)' },
    { min: 2.5, max: 3.19, label: 'Khá', color: '#7c4dff', gradient: 'linear-gradient(135deg,#7c4dff,#b388ff)' },
    { min: 2.0, max: 2.49, label: 'Trung bình', color: '#ff9100', gradient: 'linear-gradient(135deg,#ff9100,#ffcc80)' },
    { min: 1.0, max: 1.99, label: 'Yếu', color: '#ff1744', gradient: 'linear-gradient(135deg,#ff1744,#ff8a80)' },
    { min: 0, max: 0.99, label: 'Kém', color: '#d50000', gradient: 'linear-gradient(135deg,#d50000,#ff5131)' },
];

const getGpaInfo = (gpa: number | null) => {
    if (gpa === null || gpa === undefined)
        return { color: '#9e9e9e', gradient: 'linear-gradient(135deg,#9e9e9e,#bdbdbd)', label: 'Chưa có dữ liệu' };
    return GPA_CLASSIFICATION.find(c => gpa >= c.min && gpa <= c.max)
        || { color: '#9e9e9e', gradient: 'linear-gradient(135deg,#9e9e9e,#bdbdbd)', label: 'Không xác định' };
};

// ============================================================
// Sub-components - GIỮ NGUYÊN NHƯ CŨ
// ============================================================
const GpaRing: React.FC<{ gpa: number | null; size?: number; label?: string }> = ({ gpa, size = 120, label }) => {
    const info = getGpaInfo(gpa);
    const pct = gpa !== null ? Math.round((gpa / 4) * 100) : 0;
    const r = (size - 16) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={8} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={info.color} strokeWidth={8}
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div style={{ textAlign: 'center', zIndex: 1 }}>
                <div style={{ fontSize: size > 100 ? 22 : 16, fontWeight: 800, color: info.color, lineHeight: 1 }}>
                    {gpa !== null ? gpa.toFixed(2) : '—'}
                </div>
                {label && <div style={{ fontSize: 10, color: '#8c8c8c', marginTop: 2 }}>{label}</div>}
            </div>
        </div>
    );
};

const ScoreBar: React.FC<{ score: number | null; max?: number }> = ({ score, max = 10 }) => {
    if (score === null) return <Text type="secondary" style={{ fontSize: 13 }}>—</Text>;
    const pct = (score / max) * 100;
    const color = getScoreColor(score);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
            <Text strong style={{ color, fontSize: 13, minWidth: 28 }}>{score.toFixed(1)}</Text>
        </div>
    );
};

// ============================================================
// Main Component
// ============================================================
const MyGrades: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const studentId = user?.studentId;

    const { data: summary, loading: summaryLoading, refresh } = useAcademicSummary({
        autoFetch: true,
        includeDetails: true,
    });

    const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState('grades');
    const [loading, setLoading] = useState({ refresh: false });

    // Chuyển đổi dữ liệu điểm từ summary
    const grades = React.useMemo(() => {
        if (!summary?.subjectGradeDetails) return [];
        return summary.subjectGradeDetails.map(g => ({
            gradeId: 0,
            studentId: summary.studentId,
            classId: g.subjectId,
            classCode: g.subjectCode,
            subjectName: g.subjectName,
            credits: g.credits,
            semesterId: g.semesterId,
            semesterName: g.semesterName,
            academicYear: 0,
            semesterNumber: 0,
            processScore: g.processScore,
            midtermScore: g.midtermScore,
            finalScore: g.finalScore,
            totalScore: g.totalScore,
            letterGrade: g.letterGrade,
            status: g.status as 'SAVED' | 'SUBMITTED' | 'APPROVED',
        }));
    }, [summary?.subjectGradeDetails]);

    // Lấy danh sách học kỳ từ semesterGpas
    const semesters = React.useMemo(() => {
        if (!summary?.semesterGpas) return [];
        return summary.semesterGpas.map(s => ({
            semesterId: s.semesterId,
            semesterName: s.semesterName,
            academicYear: s.academicYear,
            semesterNumber: s.semesterNumber,
        }));
    }, [summary?.semesterGpas]);

    const gpaHistory = React.useMemo(() => {
        if (!summary?.semesterGpas) return [];

        let cumulativePoints = 0;
        let cumulativeCredits = 0;

        return summary.semesterGpas.map(s => {
            // Cộng dồn GPA học kỳ hiện tại
            cumulativePoints += s.gpa * s.earnedCredits;
            cumulativeCredits += s.earnedCredits;

            // Tính cumulative GPA đến học kỳ này
            const cumulativeGpa = cumulativeCredits > 0
                ? cumulativePoints / cumulativeCredits
                : 0;

            return {
                semesterId: s.semesterId,
                semesterName: s.semesterName,
                academicYear: s.academicYear,
                semesterNumber: s.semesterNumber,
                gpa: s.gpa,
                cumulativeGpa: Math.round(cumulativeGpa * 100) / 100,  // ✅ Tính thủ công
                earnedCredits: s.earnedCredits,
                registeredCredits: s.registeredCredits,
                startDate: s.startDate,
                endDate: s.endDate,
            };
        });
    }, [summary?.semesterGpas]);

    // Lọc điểm theo học kỳ
    const filteredGrades = React.useMemo(() => {
        if (selectedSemester === 'ALL') return grades;
        return grades.filter(g => g.semesterId === selectedSemester);
    }, [grades, selectedSemester]);

    // Tính stats dựa trên filteredGrades
    const stats = React.useMemo(() => {
        const filtered = filteredGrades;
        const totalCredits = filtered.reduce((s, g) => s + (g.credits || 0), 0);
        const gradedCourses = filtered.filter(g => g.totalScore !== null);
        const passedCourses = gradedCourses.filter(g => (g.totalScore ?? 0) >= 4.0).length;
        const failedCourses = gradedCourses.filter(g => (g.totalScore ?? 0) < 4.0).length;
        const pendingCourses = filtered.filter(g => g.totalScore === null).length;
        const submittedCourses = filtered.filter(g => g.status === 'SUBMITTED').length;
        const avgScore = gradedCourses.length > 0
            ? Number((gradedCourses.reduce((s, g) => s + (g.totalScore ?? 0), 0) / gradedCourses.length).toFixed(2))
            : 0;

        let semesterGpa = null;
        let cumulativeGpa = null;
        if (selectedSemester !== 'ALL') {
            const semesterData = summary?.semesterGpas.find(s => s.semesterId === selectedSemester);
            semesterGpa = semesterData?.gpa || null;
            cumulativeGpa = semesterData?.cumulativeGpa || null;  
        } else {
            cumulativeGpa = summary?.cumulativeGpa || null;
        }

        const totalCreditsEarned = filtered.filter(g => g.totalScore !== null && g.totalScore >= 5)
            .reduce((s, g) => s + (g.credits || 0), 0);

        return {
            totalCredits,
            totalCourses: filtered.length,
            passedCourses,
            failedCourses,
            pendingCourses,
            submittedCourses,
            avgScore,
            semesterGpa,
            cumulativeGpa,
            totalCreditsEarned,
            completionRate: totalCredits > 0 ? Math.round((totalCreditsEarned / totalCredits) * 100) : 0,
        };
    }, [filteredGrades, summary, selectedSemester]);

    const isLoading = summaryLoading || loading.refresh;
    const totalGradedCount = stats.totalCourses - stats.pendingCourses;
    const gpaInfo = getGpaInfo(stats.cumulativeGpa);

    const handleRefresh = async () => {
        setLoading(prev => ({ ...prev, refresh: true }));
        await refresh();
        setLoading(prev => ({ ...prev, refresh: false }));
        message.success('Đã làm mới dữ liệu');
    };

    const handleExportExcel = () => {
        const data = filteredGrades.map((g, i) => ({
            STT: i + 1,
            'Học kỳ': g.semesterName,
            'Mã lớp': g.classCode,
            'Môn học': g.subjectName,
            'Số TC': g.credits,
            'Điểm QT': g.processScore ?? '',
            'Điểm GK': g.midtermScore ?? '',
            'Điểm CK': g.finalScore ?? '',
            'Tổng điểm': g.totalScore != null ? g.totalScore.toFixed(1) : '',
            'Điểm chữ': g.letterGrade ?? '',
            'Kết quả': g.totalScore == null ? 'Chờ điểm' : (g.totalScore >= 5 ? 'Đạt' : 'Không đạt'),
            'Trạng thái': STATUS_CONFIG[g.status]?.label ?? g.status,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'BangDiem');
        const sem = selectedSemester === 'ALL' ? 'TatCa'
            : semesters.find(s => s.semesterId === selectedSemester)?.semesterName?.replace(/\s+/g, '_') || 'HocKy';
        XLSX.writeFile(wb, `BangDiem_${summary?.studentCode}_${sem}_${dayjs().format('YYYYMMDD')}.xlsx`);
        message.success('Xuất Excel thành công!');
    };

    // Table columns - GIỮ NGUYÊN NHƯ CŨ
    const columns: ColumnsType<typeof filteredGrades[0]> = [
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 160,
            fixed: 'left',
            render: (name: string) => (
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'linear-gradient(135deg,#7c4dff,#b388ff)',
                    color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                }}>{name}</span>
            ),
        },
        {
            title: 'Mã lớp',
            dataIndex: 'classCode',
            key: 'classCode',
            width: 110,
            render: (code: string) => (
                <code style={{ background: '#f3e5f5', color: '#7c4dff', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                    {code}
                </code>
            ),
        },
        {
            title: 'Môn học',
            dataIndex: 'subjectName',
            key: 'subjectName',
            render: (name: string, record) => (
                <div>
                    <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 13 }}>{name}</div>
                    <span style={{ background: '#e3f2fd', color: '#2979ff', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                        {record.credits} tín chỉ
                    </span>
                </div>
            ),
        },
        {
            title: 'Điểm QT',
            dataIndex: 'processScore',
            key: 'processScore',
            width: 120,
            align: 'center' as const,
            render: (s: number | null) => <ScoreBar score={s} />,
        },
        {
            title: 'Điểm GK',
            dataIndex: 'midtermScore',
            key: 'midtermScore',
            width: 120,
            align: 'center' as const,
            render: (s: number | null) => <ScoreBar score={s} />,
        },
        {
            title: 'Điểm CK',
            dataIndex: 'finalScore',
            key: 'finalScore',
            width: 120,
            align: 'center' as const,
            render: (s: number | null) => <ScoreBar score={s} />,
        },
        {
            title: 'Tổng điểm',
            dataIndex: 'totalScore',
            key: 'totalScore',
            width: 110,
            align: 'center' as const,
            sorter: (a, b) => (a.totalScore ?? -1) - (b.totalScore ?? -1),
            render: (score: number | null) => {
                if (score === null) return (
                    <Tooltip title="Chưa có điểm tổng kết">
                        <span style={{ color: '#bdbdbd', fontSize: 13 }}>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />Chờ
                        </span>
                    </Tooltip>
                );
                const color = getScoreColor(score);
                return (
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: color + '18', border: `2px solid ${color}`,
                        fontWeight: 800, fontSize: 14, color,
                    }}>
                        {score.toFixed(1)}
                    </div>
                );
            },
        },
        {
            title: 'Điểm chữ',
            dataIndex: 'letterGrade',
            key: 'letterGrade',
            width: 90,
            align: 'center' as const,
            render: (letter: string | null) => {
                if (!letter) return <Text type="secondary">—</Text>;
                const info = LETTER_GRADE_MAP[letter];
                return (
                    <Tooltip title={info?.description}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 36, borderRadius: 8,
                            background: info?.bg || '#f5f5f5', color: info?.color || '#666',
                            fontWeight: 800, fontSize: 15, cursor: 'default',
                        }}>{letter}</span>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Kết quả',
            key: 'result',
            width: 110,
            align: 'center' as const,
            render: (_, record) => {
                if (record.totalScore === null)
                    return <Tag color="default" icon={<ClockCircleOutlined />}>Chờ điểm</Tag>;
                return record.totalScore >= 4.0
                    ? <Tag color="success" icon={<CheckCircleOutlined />}>Đạt</Tag>
                    : <Tag color="error" icon={<CloseCircleOutlined />}>Trượt</Tag>;
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            align: 'center' as const,
            render: (status: string) => {
                const cfg = STATUS_CONFIG[status];
                if (!cfg) return <Tag>{status}</Tag>;
                return (
                    <Tooltip title={cfg.description}>
                        <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: '12px', padding: '2px 8px' }}>
                            {cfg.label}
                        </Tag>
                    </Tooltip>
                );
            },
        },
    ];

    // GPA History columns - GIỮ NGUYÊN
    const gpaColumns: ColumnsType<any> = [
        {
            title: 'Học kỳ',
            key: 'semesterName',
            render: (_, r) => (
                <span style={{
                    background: 'linear-gradient(135deg,#7c4dff,#b388ff)',
                    color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                }}>{r.semesterName}</span>
            ),
        },
        {
            title: 'GPA học kỳ',
            key: 'gpa',
            align: 'center' as const,
            render: (_, r) => {
                const info = getGpaInfo(r.gpa);
                return <span style={{ color: info.color, fontWeight: 800, fontSize: 18 }}>{r.gpa.toFixed(2)}</span>;
            },
            sorter: (a, b) => a.gpa - b.gpa,
        },
        {
            title: 'GPA tích lũy',
            key: 'cumulativeGpa',
            align: 'center' as const,
            render: (_, r) => {
                const info = getGpaInfo(r.cumulativeGpa);
                return <span style={{ color: info.color, fontWeight: 800, fontSize: 18 }}>{r.cumulativeGpa.toFixed(2)}</span>;
            },
        },
        {
            title: 'TC đạt / Đăng ký',
            key: 'credits',
            align: 'center' as const,
            render: (_, r) => {
                const semGrades = grades.filter(g => g.semesterId === r.semesterId);
                const semEarned = semGrades
                    .filter(g => g.totalScore !== null && g.totalScore >= 5)
                    .reduce((sum, g) => sum + (g.credits || 0), 0);
                const semRegistered = semGrades.reduce((sum, g) => sum + (g.credits || 0), 0);
                return (
                    <span>
                        <span style={{ color: '#00c853', fontWeight: 700 }}>{semEarned}</span>
                        <span style={{ color: '#9e9e9e' }}> / </span>
                        <span style={{ color: '#7c4dff', fontWeight: 700 }}>{semRegistered}</span>
                        <span style={{ color: '#9e9e9e', fontSize: 11 }}> TC</span>
                    </span>
                );
            },
        },
        {
            title: 'Tiến độ',
            key: 'progress',
            width: 160,
            render: (_, r) => {
                const semGrades = grades.filter(g => g.semesterId === r.semesterId);
                const semEarned = semGrades
                    .filter(g => g.totalScore !== null && g.totalScore >= 5)
                    .reduce((sum, g) => sum + (g.credits || 0), 0);
                const semRegistered = semGrades.reduce((sum, g) => sum + (g.credits || 0), 0);
                const pct = semRegistered > 0 ? Math.round((semEarned / semRegistered) * 100) : 0;
                const info = getGpaInfo(r.gpa);
                return <Progress percent={pct} size="small" strokeColor={info.color} />;
            },
        },
    ];

    // Tab items
    const tabItems = [
        {
            key: 'grades',
            label: (
                <span style={{ fontWeight: 600 }}>
                    <BookOutlined style={{ marginRight: 6 }} />Bảng điểm
                    <Badge count={filteredGrades.length} style={{ marginLeft: 8, backgroundColor: '#7c4dff' }} />
                </span>
            ),
            children: (
                <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                    {isLoading && grades.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 80 }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 16, color: '#9e9e9e' }}>Đang tải bảng điểm...</div>
                        </div>
                    ) : filteredGrades.length === 0 ? (
                        <Empty style={{ padding: 60 }} description={
                            <span>Chưa có môn học nào<br />
                                <span style={{ color: '#bdbdbd', fontSize: 12 }}>Chọn học kỳ khác hoặc kiểm tra đăng ký môn</span>
                            </span>
                        } />
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={filteredGrades}
                            rowKey={(r, idx) => `${r.classCode}-${idx}`}
                            pagination={{ pageSize: 10, showTotal: (total) => `${total} môn học`, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
                            scroll={{ x: 1300 }}
                            rowClassName={(r) => {
                                if (r.totalScore === null) return 'row-pending';
                                if (r.status === 'SUBMITTED') return 'row-submitted';
                                if (r.status === 'APPROVED') return 'row-approved';
                                return r.totalScore >= 5 ? 'row-passed' : 'row-failed';
                            }}
                            summary={() => (
                                <Table.Summary fixed>
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={3}>
                                            <span style={{ fontWeight: 700, color: '#1a1a2e' }}>Tổng kết</span>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={3} colSpan={3}>
                                            <span style={{ color: '#2979ff', fontWeight: 600 }}>
                                                TB: {stats.avgScore > 0 ? stats.avgScore.toFixed(2) : '—'}
                                            </span>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={6} colSpan={2}>
                                            <span style={{ color: '#00c853', fontWeight: 600 }}>✓ {stats.passedCourses} đạt</span>
                                            <span style={{ margin: '0 6px', color: '#e0e0e0' }}>|</span>
                                            <span style={{ color: '#ff1744', fontWeight: 600 }}>✗ {stats.failedCourses} trượt</span>
                                            {stats.pendingCourses > 0 && (
                                                <>
                                                    <span style={{ margin: '0 6px', color: '#e0e0e0' }}>|</span>
                                                    <span style={{ color: '#bdbdbd', fontWeight: 600 }}>⏳ {stats.pendingCourses} chờ</span>
                                                </>
                                            )}
                                            {stats.submittedCourses > 0 && (
                                                <>
                                                    <span style={{ margin: '0 6px', color: '#e0e0e0' }}>|</span>
                                                    <span style={{ color: '#faad14', fontWeight: 600 }}>📤 {stats.submittedCourses} chờ duyệt</span>
                                                </>
                                            )}
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            )}
                        />
                    )}
                </div>
            ),
        },
        {
            key: 'gpa',
            label: (
                <span style={{ fontWeight: 600 }}>
                    <LineChartOutlined style={{ marginRight: 6 }} />Lịch sử GPA
                    <Badge count={gpaHistory.length} style={{ marginLeft: 8, backgroundColor: '#00c853' }} />
                </span>
            ),
            children: (
                <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                    {isLoading && gpaHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
                    ) : gpaHistory.length === 0 ? (
                        <Empty description="Chưa có dữ liệu GPA" />
                    ) : (
                        <>
                            <Table
                                columns={gpaColumns}
                                dataSource={gpaHistory}
                                rowKey="semesterId"
                                pagination={{ pageSize: 5 }}
                                scroll={{ x: 700 }}
                            />
                            <Divider />
                            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>
                                <FireOutlined style={{ marginRight: 8, color: '#ff9100' }} />Biểu đồ GPA theo học kỳ
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {gpaHistory.map((item) => {
                                    const info = getGpaInfo(item.gpa);
                                    const cumInfo = getGpaInfo(item.cumulativeGpa);
                                    const semGrades = grades.filter(g => g.semesterId === item.semesterId);
                                    const semEarned = semGrades
                                        .filter(g => g.totalScore !== null && g.totalScore >= 5)
                                        .reduce((sum, g) => sum + (g.credits || 0), 0);
                                    const semRegistered = semGrades.reduce((sum, g) => sum + (g.credits || 0), 0);
                                    return (
                                        <div key={item.semesterId} style={{
                                            background: '#fafafa', borderRadius: 10,
                                            padding: '12px 16px', border: '1px solid #f0f0f0'
                                        }}>
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                marginBottom: 8, alignItems: 'center', flexWrap: 'wrap', gap: 8
                                            }}>
                                                <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 13 }}>
                                                    {item.semesterName}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <span style={{ fontSize: 12, color: '#9e9e9e' }}>
                                                        TC đạt:{' '}
                                                        <span style={{ color: '#00c853', fontWeight: 700 }}>{semEarned}</span>
                                                        <span style={{ color: '#9e9e9e' }}> / {semRegistered}</span>
                                                    </span>
                                                    <span style={{ fontSize: 12, color: '#9e9e9e' }}>
                                                        Tích lũy:{' '}
                                                        <span style={{ color: cumInfo.color, fontWeight: 700 }}>
                                                            {item.cumulativeGpa.toFixed(2)}
                                                        </span>
                                                    </span>
                                                    <span style={{
                                                        background: info.gradient, color: '#fff',
                                                        padding: '2px 10px', borderRadius: 12, fontWeight: 800, fontSize: 14,
                                                    }}>
                                                        {item.gpa.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <Progress
                                                percent={Math.round((item.gpa / 4) * 100)}
                                                strokeColor={info.color}
                                                showInfo={false}
                                                size="small"
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#bdbdbd' }}>
                                                <span>0.0</span><span>4.0</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <Divider />
                            <Row gutter={[16, 16]}>
                                {[
                                    { label: 'GPA cao nhất', value: Math.max(...gpaHistory.map(g => g.gpa)).toFixed(2), color: '#00c853', icon: <TrophyOutlined /> },
                                    { label: 'GPA thấp nhất', value: Math.min(...gpaHistory.map(g => g.gpa)).toFixed(2), color: '#ff1744', icon: <WarningOutlined /> },
                                    { label: 'Trung bình GPA', value: (gpaHistory.reduce((s, g) => s + g.gpa, 0) / gpaHistory.length).toFixed(2), color: '#2979ff', icon: <StarOutlined /> },
                                    {
                                        label: 'Xu hướng', icon: <ThunderboltOutlined />,
                                        value: gpaHistory.length >= 2
                                            ? (gpaHistory[0].gpa >= gpaHistory[gpaHistory.length - 1].gpa ? '▲ Tăng' : '▼ Giảm')
                                            : '—',
                                        color: gpaHistory.length >= 2
                                            ? (gpaHistory[0].gpa >= gpaHistory[gpaHistory.length - 1].gpa ? '#00c853' : '#ff1744')
                                            : '#9e9e9e',
                                    },
                                ].map(stat => (
                                    <Col xs={12} md={6} key={stat.label}>
                                        <div style={{ background: stat.color + '10', border: `1px solid ${stat.color}30`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
                                            <div style={{ fontSize: 22, color: stat.color, marginBottom: 4 }}>{stat.icon}</div>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                                            <div style={{ fontSize: 12, color: '#9e9e9e' }}>{stat.label}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </>
                    )}
                </div>
            ),
        },
        {
            key: 'summary',
            label: (
                <span style={{ fontWeight: 600 }}>
                    <PieChartOutlined style={{ marginRight: 6 }} />Tổng kết toàn khóa
                </span>
            ),
            children: (
                <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                    {/* Thông tin chương trình đào tạo */}
                    <Row gutter={[20, 20]}>
                        <Col xs={24} md={12}>
                            <div style={{ background: '#fafafa', borderRadius: 12, padding: 20, border: '1px solid #f0f0f0' }}>
                                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: '#1a1a2e' }}>
                                    <BookOutlined style={{ marginRight: 8, color: '#7c4dff' }} />Thông tin học tập
                                </div>
                                {[
                                    { label: 'Tổng số học kỳ', value: new Set(grades.map(g => g.semesterId)).size, color: '#7c4dff', icon: <CalendarOutlined /> },
                                    { label: 'Tổng số môn đã học', value: grades.length, color: '#2979ff', icon: <BookOutlined /> },
                                    { label: 'Tổng tín chỉ đăng ký', value: stats.totalCredits, color: '#00bcd4', icon: <FileTextOutlined /> },
                                    { label: 'Môn chờ điểm', value: stats.pendingCourses, color: '#ff9100', icon: <ClockCircleOutlined /> },
                                    { label: 'Môn chờ duyệt', value: stats.submittedCourses, color: '#faad14', icon: <SendOutlined /> },
                                ].map(item => (
                                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                                        <span style={{ color: '#666', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {item.icon} {item.label}
                                        </span>
                                        <span style={{ fontWeight: 700, fontSize: 16, color: item.color }}>{item.value}</span>
                                    </div>
                                ))}
                                <div style={{ marginTop: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 13, color: '#666' }}>Tỷ lệ hoàn thành (môn đạt)</span>
                                        <span style={{ fontWeight: 700, color: '#7c4dff' }}>
                                            {totalGradedCount > 0 ? Math.round((stats.passedCourses / totalGradedCount) * 100) : 0}%
                                        </span>
                                    </div>
                                    <Progress
                                        percent={totalGradedCount > 0 ? Math.round((stats.passedCourses / totalGradedCount) * 100) : 0}
                                        strokeColor={{ '0%': '#ff1744', '50%': '#ff9100', '100%': '#00c853' }}
                                    />
                                </div>
                            </div>
                        </Col>

                        {/* Card hiển thị tín chỉ theo chương trình đào tạo */}
                        <Col xs={24} md={12}>
                            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 12, padding: 20, color: '#fff', minHeight: 200 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <TrophyOutlined style={{ fontSize: 24, opacity: 0.9 }} />
                                    <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>CHƯƠNG TRÌNH ĐÀO TẠO</span>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                                    {summary?.curriculumName || 'Đang tải...'}
                                </div>
                                <Row gutter={[12, 12]}>
                                    <Col span={12}>
                                        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>Tổng TC yêu cầu</div>
                                            <div style={{ fontSize: 24, fontWeight: 800 }}>{summary?.totalCreditsRequired || 0}</div>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>TC đã tích lũy</div>
                                            <div style={{ fontSize: 24, fontWeight: 800 }}>{summary?.completedCredits || 0}</div>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>TC còn lại</div>
                                            <div style={{ fontSize: 24, fontWeight: 800 }}>{summary?.remainingCredits || 0}</div>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>GPA hiện tại</div>
                                            <div style={{ fontSize: 24, fontWeight: 800 }}>{summary?.cumulativeGpa?.toFixed(2) || '—'}</div>
                                        </div>
                                    </Col>
                                </Row>
                                <div style={{ marginTop: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, opacity: 0.85 }}>
                                        <span>Tiến độ hoàn thành</span>
                                        <span>{summary?.progressPercentage || 0}%</span>
                                    </div>
                                    <Progress
                                        percent={summary?.progressPercentage || 0}
                                        strokeColor="#52c41a"
                                        trailColor="rgba(255,255,255,0.3)"
                                        showInfo={false}
                                    />
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Divider />

                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: '#1a1a2e' }}>
                        <FireOutlined style={{ marginRight: 8, color: '#ff9100' }} />Phân bố điểm theo học kỳ
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {Array.from(new Set(grades.map(g => g.semesterId))).map(semId => {
                            const semGrades = grades.filter(g => g.semesterId === semId);
                            const semName = semGrades[0]?.semesterName || semId;
                            const graded = semGrades.filter(g => g.totalScore !== null);
                            const passed = graded.filter(g => g.totalScore! >= 5).length;
                            const pending = semGrades.filter(g => g.totalScore === null).length;
                            const submitted = semGrades.filter(g => g.status === 'SUBMITTED').length;
                            const pct = graded.length > 0 ? Math.round((passed / graded.length) * 100) : 0;
                            const color = pct === 100 ? '#00c853' : pct >= 70 ? '#2979ff' : '#ff9100';
                            const gpaRec = gpaHistory.find(g => g.semesterId === semId);
                            return (
                                <div key={semId} style={{ background: '#fafafa', borderRadius: 10, padding: '12px 16px', border: '1px solid #f0f0f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                        <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 13 }}>{semName}</span>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                            {gpaRec && (
                                                <span style={{ fontSize: 12, color: getGpaInfo(gpaRec.gpa).color, fontWeight: 700 }}>
                                                    GPA: {gpaRec.gpa.toFixed(2)}
                                                </span>
                                            )}
                                            <span style={{ fontSize: 13 }}>
                                                <span style={{ color: '#00c853', fontWeight: 700 }}>{passed}</span>
                                                <span style={{ color: '#9e9e9e' }}>/{graded.length} đạt</span>
                                                {pending > 0 && <span style={{ color: '#bdbdbd', marginLeft: 8 }}>({pending} chờ)</span>}
                                                {submitted > 0 && <span style={{ color: '#faad14', marginLeft: 8 }}>({submitted} chờ duyệt)</span>}
                                            </span>
                                        </div>
                                    </div>
                                    <Progress percent={pct} strokeColor={color} size="small" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 20px 32px', background: '#f8f7ff', minHeight: '100vh' }}>
            {/* Hero Header */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                borderRadius: '0 0 28px 28px', padding: '28px 32px 32px',
                marginBottom: 24, marginLeft: -20, marginRight: -20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,77,255,0.3) 0%, transparent 70%)' }} />
                <div style={{ position: 'absolute', bottom: -20, left: 100, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(41,121,255,0.25) 0%, transparent 70%)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#7c4dff,#b388ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <TrophyOutlined style={{ color: '#fff' }} />
                            </div>
                            <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>
                                Kết quả học tập
                            </Title>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginLeft: 54 }}>
                            <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '2px 10px', marginRight: 8, fontWeight: 600 }}>{summary?.studentCode || studentId}</span>
                            {summary?.fullName || user?.fullName || user?.username}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Button icon={<DownloadOutlined />} onClick={handleExportExcel} disabled={filteredGrades.length === 0}
                            style={{ background: 'rgba(124,77,255,0.3)', color: '#fff', border: '1px solid rgba(124,77,255,0.5)', borderRadius: 10, fontWeight: 600 }}>
                            Xuất Excel
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}
                            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10 }}>
                            Làm mới
                        </Button>
                    </div>
                </div>

                {/* GPA Summary Row */}
                <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '12px 20px', flex: 1, minWidth: 220 }}>
                        {selectedSemester !== 'ALL' ? (
                            <>
                                <GpaRing gpa={stats.semesterGpa} size={70} label="GPA HK" />
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>GPA học kỳ</div>
                                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                                        {stats.semesterGpa !== null ? stats.semesterGpa.toFixed(2) : '—'}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <GpaRing gpa={stats.cumulativeGpa} size={70} label="GPA" />
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>GPA tích lũy toàn khóa</div>
                                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                                        {stats.cumulativeGpa !== null ? stats.cumulativeGpa.toFixed(2) : '—'}
                                    </div>
                                    <div style={{ background: gpaInfo.color + '30', color: gpaInfo.color, borderRadius: 8, padding: '1px 10px', fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
                                        {gpaInfo.label}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 20px', flex: 1, minWidth: 150 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00bcd4', marginBottom: 4, fontSize: 14 }}>
                            <BookOutlined /> <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Tín chỉ tích lũy</span>
                        </div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                            {isLoading ? '...' : `${summary?.completedCredits || 0} / ${summary?.totalCreditsRequired || 0} TC`}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                            {summary?.progressPercentage || 0}% hoàn thành chương trình
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 20px', flex: 1, minWidth: 130 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00c853', marginBottom: 4, fontSize: 14 }}>
                            <CheckCircleOutlined /> <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Môn học</span>
                        </div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                            {stats.passedCourses}/{totalGradedCount} đạt
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 20px', flex: 1, minWidth: 130 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff9100', marginBottom: 4, fontSize: 14 }}>
                            <StarOutlined /> <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Điểm TB</span>
                        </div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                            {stats.avgScore > 0 ? stats.avgScore.toFixed(2) : '—'} <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>/ 10.0</span>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 20px', flex: 1, minWidth: 130 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#bdbdbd', marginBottom: 4, fontSize: 14 }}>
                            <ClockCircleOutlined /> <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Đang chờ điểm</span>
                        </div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                            {stats.pendingCourses} <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>môn</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* GPA Warning */}
            {stats.cumulativeGpa !== null && stats.cumulativeGpa < 1.5 && (
                <Alert
                    type="error"
                    showIcon
                    icon={<WarningOutlined />}
                    message="Cảnh báo học vụ"
                    description="GPA của bạn dưới 1.5. Vui lòng gặp cố vấn học tập để được hỗ trợ."
                    style={{ marginBottom: 16, borderRadius: 12 }}
                />
            )}

            {/* Controls Bar */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#9e9e9e', fontSize: 12, fontWeight: 600 }}>LỌC HỌC KỲ</span>
                    <Select
                        value={selectedSemester}
                        onChange={setSelectedSemester}
                        style={{ width: 220 }}
                        loading={isLoading}
                        placeholder="Chọn học kỳ"
                    >
                        <Option value="ALL">📚 Tất cả học kỳ</Option>
                        {semesters.map(sem => (
                            <Option key={sem.semesterId} value={sem.semesterId}>{sem.semesterName}</Option>
                        ))}
                    </Select>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(totalGradedCount - stats.passedCourses) > 0 && (
                        <Tag color="error" icon={<CloseCircleOutlined />}>{totalGradedCount - stats.passedCourses} môn trượt</Tag>
                    )}
                    <Tag color="success" icon={<CheckCircleOutlined />}>{stats.passedCourses} môn đạt</Tag>
                    {stats.pendingCourses > 0 && (
                        <Tag icon={<ClockCircleOutlined />} color="default">{stats.pendingCourses} chờ điểm</Tag>
                    )}
                    {stats.submittedCourses > 0 && (
                        <Tag icon={<SendOutlined />} color="orange">{stats.submittedCourses} chờ duyệt</Tag>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                style={{ background: 'transparent' }}
                tabBarStyle={{ background: 'transparent', borderBottom: 'none', marginBottom: 0 }}
            />

            <style>{`
                .ant-tabs-tab { background: #fff !important; border-radius: 12px 12px 0 0 !important; border: none !important; padding: 10px 20px !important; margin-right: 4px !important; box-shadow: 0 -2px 8px rgba(0,0,0,0.04); }
                .ant-tabs-tab-active { background: #fff !important; box-shadow: 0 -3px 0 #7c4dff inset, 0 -2px 8px rgba(0,0,0,0.04) !important; }
                .ant-tabs-tab-active .ant-tabs-tab-btn { color: #7c4dff !important; }
                .ant-tabs-nav::before { border: none !important; }
                .row-passed > td { background: #f1fff6 !important; }
                .row-failed > td { background: #fff5f5 !important; }
                .row-pending > td { background: #fafafa !important; }
                .row-submitted > td { background: #fff7e6 !important; }
                .row-approved > td { background: #f6ffed !important; }
                .row-passed:hover > td { background: #e6ffed !important; }
                .row-failed:hover > td { background: #ffe7e7 !important; }
                .row-pending:hover > td { background: #f0f0f0 !important; }
                .row-submitted:hover > td { background: #fff1e0 !important; }
                .row-approved:hover > td { background: #e6ffed !important; }
                .ant-table-thead > tr > th { background: #fafafa !important; font-weight: 700 !important; font-size: 12px !important; color: #666 !important; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f0f0f0 !important; }
                .ant-select-selector { border-radius: 10px !important; }
                .ant-pagination-item-active { border-color: #7c4dff !important; }
                .ant-pagination-item-active a { color: #7c4dff !important; }
                .ant-badge-count { font-size: 11px !important; }
            `}</style>
        </div>
    );
};

export default MyGrades;