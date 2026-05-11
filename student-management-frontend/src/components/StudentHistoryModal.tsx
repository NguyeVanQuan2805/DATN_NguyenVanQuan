// src/components/StudentHistoryModal.tsx
import React, { useEffect, useState } from 'react';
import {
    Modal,
    Descriptions,
    Table,
    Tag,
    Spin,
    message,
    Typography,
    Space,
    Card,
    Row,
    Col,
    Statistic,
    Tabs,
    Empty,
    Progress,
    Button,
} from 'antd';
import {
    BookOutlined,
    CalendarOutlined,
    TrophyOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface StudentHistoryProps {
    visible: boolean;
    studentId: string;
    studentCode: string;
    studentName: string;
    onClose: () => void;
}

interface GradeHistory {
    classCode: string;
    subjectName: string;
    credits: number;
    semesterName: string;
    academicYear: number;
    semesterNumber: number;
    processScore: number | null;
    midtermScore: number | null;
    finalScore: number | null;
    totalScore: number | null;
    letterGrade: string | null;
}

interface WarningHistory {
    warningId: number;
    semesterName: string;
    warningLevel: number;
    warningReason: string;
    issuedDate: string;
    status: string;
}

interface GPAHistory {
    semesterId: string;
    semesterName: string;
    gpa: number;
    cumulativeGpa: number;
    totalCreditsEarned: number;
    totalCreditsRegistered: number;
}

interface StudentStats {
    totalCredits: number;
    totalCourses: number;
    passedCourses: number;
    failedCourses: number;
    currentGpa: number | null;
    warningCount: number;
}

const StudentHistoryModal: React.FC<StudentHistoryProps> = ({
    visible,
    studentId,
    studentCode,
    studentName,
    onClose
}) => {
    const [grades, setGrades] = useState<GradeHistory[]>([]);
    const [warnings, setWarnings] = useState<WarningHistory[]>([]);
    const [gpaHistory, setGpaHistory] = useState<GPAHistory[]>([]);
    const [stats, setStats] = useState<StudentStats>({
        totalCredits: 0,
        totalCourses: 0,
        passedCourses: 0,
        failedCourses: 0,
        currentGpa: null,
        warningCount: 0,
    });
    const [loading, setLoading] = useState({
        grades: false,
        warnings: false,
        gpa: false,
    });

    useEffect(() => {
        if (visible && studentId) {
            fetchAllData();
        }
    }, [visible, studentId]);

    const fetchAllData = async () => {
        fetchGrades();
        fetchWarnings();
        fetchGPA();
    };

    const fetchGrades = async () => {
        setLoading(prev => ({ ...prev, grades: true }));
        try {
            const res = await api.get(`/Grades/student/${studentId}`);
            const gradeData = res.data || [];

            // Lấy thêm thông tin học kỳ cho mỗi điểm
            const enrichedGrades = await Promise.all(
                gradeData.map(async (g: any) => {
                    try {
                        // Lấy thông tin lớp để biết học kỳ
                        const classRes = await api.get(`/Classes/${g.classId}`);
                        return {
                            classCode: g.classCode || classRes.data?.classCode,
                            subjectName: g.subjectName || classRes.data?.subject?.subjectName,
                            credits: g.credits || classRes.data?.subject?.credits || 0,
                            semesterName: classRes.data?.semester?.semesterName || 'N/A',
                            academicYear: classRes.data?.semester?.academicYear || 0,
                            semesterNumber: classRes.data?.semester?.semesterNumber || 0,
                            processScore: g.processScore,
                            midtermScore: g.midtermScore,
                            finalScore: g.finalScore,
                            totalScore: g.totalScore,
                            letterGrade: g.letterGrade,
                        };
                    } catch {
                        return {
                            classCode: g.classCode || 'N/A',
                            subjectName: g.subjectName || 'N/A',
                            credits: g.credits || 0,
                            semesterName: 'N/A',
                            academicYear: 0,
                            semesterNumber: 0,
                            processScore: g.processScore,
                            midtermScore: g.midtermScore,
                            finalScore: g.finalScore,
                            totalScore: g.totalScore,
                            letterGrade: g.letterGrade,
                        };
                    }
                })
            );

            setGrades(enrichedGrades);

            // Tính thống kê
            const totalCredits = enrichedGrades.reduce((sum, g) => sum + (g.credits || 0), 0);
            const passed = enrichedGrades.filter(g => (g.totalScore || 0) >= 5).length;

            setStats(prev => ({
                ...prev,
                totalCredits,
                totalCourses: enrichedGrades.length,
                passedCourses: passed,
                failedCourses: enrichedGrades.length - passed,
            }));

        } catch (err: any) {
            console.error('Lỗi tải điểm:', err);
            message.error('Không thể tải lịch sử điểm');
        } finally {
            setLoading(prev => ({ ...prev, grades: false }));
        }
    };

    const fetchWarnings = async () => {
        setLoading(prev => ({ ...prev, warnings: true }));
        try {
            const res = await api.get('/Warnings');
            const allWarnings = res.data || [];
            const studentWarnings = allWarnings
                .filter((w: any) => w.student?.studentId === studentId)
                .map((w: any) => ({
                    warningId: w.warningId,
                    semesterName: w.semester?.semesterName || 'N/A',
                    warningLevel: w.warningLevel,
                    warningReason: w.warningReason,
                    issuedDate: w.issuedDate,
                    status: w.status,
                }))
                .sort((a: any, b: any) =>
                    dayjs(b.issuedDate).unix() - dayjs(a.issuedDate).unix()
                );

            setWarnings(studentWarnings);
            setStats(prev => ({ ...prev, warningCount: studentWarnings.length }));

        } catch (err: any) {
            console.error('Lỗi tải cảnh báo:', err);
        } finally {
            setLoading(prev => ({ ...prev, warnings: false }));
        }
    };

    const fetchGPA = async () => {
        setLoading(prev => ({ ...prev, gpa: true }));
        try {
            const res = await api.get('/Gpas');
            const allGpas = res.data || [];
            const studentGpas = allGpas
                .filter((g: any) => g.studentId === studentId)
                .map((g: any) => ({
                    semesterId: g.semesterId,
                    semesterName: g.semester?.semesterName || 'N/A',
                    gpa: g.gpa1 || g.gpa,
                    cumulativeGpa: g.cumulativeGpa,
                    totalCreditsEarned: g.totalCreditsEarned,
                    totalCreditsRegistered: g.totalCreditsRegistered,
                }))
                .sort((a: any, b: any) => b.semesterId.localeCompare(a.semesterId));

            setGpaHistory(studentGpas);

            // Lấy GPA mới nhất
            if (studentGpas.length > 0) {
                setStats(prev => ({ ...prev, currentGpa: studentGpas[0].cumulativeGpa }));
            }

        } catch (err: any) {
            console.error('Lỗi tải GPA:', err);
        } finally {
            setLoading(prev => ({ ...prev, gpa: false }));
        }
    };

    const getLetterGradeColor = (letter: string | null) => {
        const colors: Record<string, string> = {
            'A': 'success', 'B+': 'processing', 'B': 'processing',
            'C+': 'warning', 'C': 'warning', 'D+': 'default',
            'D': 'default', 'F': 'error',
        };
        return colors[letter || ''] || 'default';
    };

    const getWarningLevelColor = (level: number) => {
        switch (level) {
            case 1: return 'warning';
            case 2: return 'orange';
            case 3: return 'error';
            default: return 'default';
        }
    };

    const gradeColumns = [
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 120,
        },
        {
            title: 'Mã lớp',
            dataIndex: 'classCode',
            key: 'classCode',
            width: 100,
            render: (code: string) => <Text code>{code}</Text>,
        },
        {
            title: 'Môn học',
            dataIndex: 'subjectName',
            key: 'subjectName',
        },
        {
            title: 'TC',
            dataIndex: 'credits',
            key: 'credits',
            width: 60,
            render: (credits: number) => <Tag color="geekblue">{credits}</Tag>,
        },
        {
            title: 'Điểm',
            dataIndex: 'totalScore',
            key: 'totalScore',
            width: 80,
            render: (score: number | null) =>
                score !== null ? (
                    <Text strong style={{ color: score >= 5 ? '#52c41a' : '#ff4d4f' }}>
                        {score.toFixed(1)}
                    </Text>
                ) : <Text type="secondary">—</Text>,
        },
        {
            title: 'Điểm chữ',
            dataIndex: 'letterGrade',
            key: 'letterGrade',
            width: 80,
            render: (letter: string | null) =>
                letter ? <Tag color={getLetterGradeColor(letter)}>{letter}</Tag> : '—',
        },
        {
            title: 'Kết quả',
            key: 'result',
            width: 80,
            render: (_: any, record: GradeHistory) => {
                if (record.totalScore === null) return <Tag>Chờ</Tag>;
                return record.totalScore >= 5
                    ? <Tag color="success">Đạt</Tag>
                    : <Tag color="error">Không đạt</Tag>;
            },
        },
    ];

    const warningColumns = [
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 120,
        },
        {
            title: 'Mức',
            dataIndex: 'warningLevel',
            key: 'warningLevel',
            width: 80,
            render: (level: number) => (
                <Tag color={getWarningLevelColor(level)}>Mức {level}</Tag>
            ),
        },
        {
            title: 'Lý do',
            dataIndex: 'warningReason',
            key: 'warningReason',
        },
        {
            title: 'Ngày',
            dataIndex: 'issuedDate',
            key: 'issuedDate',
            width: 100,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => (
                <Tag color={status === 'ACTIVE' ? 'error' : 'success'}>
                    {status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã xử lý'}
                </Tag>
            ),
        },
    ];

    const gpaColumns = [
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 150,
        },
        {
            title: 'GPA học kỳ',
            dataIndex: 'gpa',
            key: 'gpa',
            width: 120,
            render: (gpa: number) => gpa?.toFixed(2) || '—',
        },
        {
            title: 'GPA tích lũy',
            dataIndex: 'cumulativeGpa',
            key: 'cumulativeGpa',
            width: 120,
            render: (gpa: number) => gpa?.toFixed(2) || '—',
        },
        {
            title: 'TC đạt',
            dataIndex: 'totalCreditsEarned',
            key: 'totalCreditsEarned',
            width: 80,
        },
        {
            title: 'TC đăng ký',
            dataIndex: 'totalCreditsRegistered',
            key: 'totalCreditsRegistered',
            width: 80,
        },
        {
            title: 'Tỷ lệ',
            key: 'ratio',
            width: 100,
            render: (_: any, record: GPAHistory) => {
                const ratio = record.totalCreditsRegistered > 0
                    ? Math.round((record.totalCreditsEarned / record.totalCreditsRegistered) * 100)
                    : 0;
                return <Progress percent={ratio} size="small" />;
            },
        },
    ];

    return (
        <Modal
            title={
                <Space>
                    <BookOutlined style={{ color: '#722ed1' }} />
                    <span>Lịch sử học tập - {studentName} ({studentCode})</span>
                </Space>
            }
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    Đóng
                </Button>
            ]}
            width={1000}
            style={{ top: 20 }}
        >
            {/* Thống kê nhanh */}
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                <Col span={6}>
                    <Card size="small" style={{ background: '#f9f0ff' }}>
                        <Statistic
                            title="Tổng TC tích lũy"
                            value={stats.totalCredits}
                            prefix={<BookOutlined style={{ color: '#722ed1' }} />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" style={{ background: '#e6f4ff' }}>
                        <Statistic
                            title="Môn đã học"
                            value={stats.totalCourses}
                            prefix={<CalendarOutlined style={{ color: '#1677ff' }} />}
                            valueStyle={{ color: '#1677ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" style={{ background: '#f6ffed' }}>
                        <Statistic
                            title="Đạt/Không đạt"
                            value={`${stats.passedCourses}/${stats.failedCourses}`}
                            prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" style={{ background: stats.warningCount > 0 ? '#fff1f0' : '#f6ffed' }}>
                        <Statistic
                            title="Cảnh báo"
                            value={stats.warningCount}
                            prefix={<WarningOutlined style={{ color: stats.warningCount > 0 ? '#ff4d4f' : '#52c41a' }} />}
                            valueStyle={{ color: stats.warningCount > 0 ? '#ff4d4f' : '#52c41a' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* GPA hiện tại */}
            {stats.currentGpa !== null && (
                <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
                    <Space>
                        <TrophyOutlined style={{ color: '#722ed1', fontSize: 20 }} />
                        <Text strong>GPA tích lũy hiện tại:</Text>
                        <Text strong style={{
                            fontSize: 18,
                            color: stats.currentGpa >= 2.0 ? '#52c41a' : '#ff4d4f'
                        }}>
                            {stats.currentGpa.toFixed(2)} / 4.0
                        </Text>
                        <Progress
                            percent={Math.round((stats.currentGpa / 4) * 100)}
                            size="small"
                            style={{ width: 200 }}
                            strokeColor={stats.currentGpa >= 2.0 ? '#52c41a' : '#ff4d4f'}
                        />
                    </Space>
                </Card>
            )}

            <Tabs defaultActiveKey="1">
                <TabPane
                    tab={<span><BookOutlined /> Bảng điểm ({grades.length})</span>}
                    key="1"
                >
                    <Table
                        columns={gradeColumns}
                        dataSource={grades}
                        rowKey={(record, idx) => `${record.classCode}-${idx}`}
                        loading={loading.grades}
                        pagination={{ pageSize: 10 }}
                        size="small"
                        scroll={{ x: 800 }}
                    />
                </TabPane>

                <TabPane
                    tab={<span><WarningOutlined /> Lịch sử cảnh báo ({warnings.length})</span>}
                    key="2"
                >
                    <Table
                        columns={warningColumns}
                        dataSource={warnings}
                        rowKey="warningId"
                        loading={loading.warnings}
                        pagination={{ pageSize: 10 }}
                        size="small"
                    />
                </TabPane>

                <TabPane
                    tab={<span><TrophyOutlined /> Lịch sử GPA ({gpaHistory.length})</span>}
                    key="3"
                >
                    <Table
                        columns={gpaColumns}
                        dataSource={gpaHistory}
                        rowKey="semesterId"
                        loading={loading.gpa}
                        pagination={{ pageSize: 10 }}
                        size="small"
                    />
                </TabPane>
            </Tabs>
        </Modal>
    );
};

export default StudentHistoryModal;