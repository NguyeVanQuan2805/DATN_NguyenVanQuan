import React, { useState, useEffect, useContext } from 'react';
import {
    Table,
    Select,
    InputNumber,
    Button,
    message,
    Spin,
    Space,
    Tag,
    Modal,
    Typography,
    Card,
    Empty,
    Tooltip,
    Row,
    Col,
    Statistic,
    Alert,
    Checkbox,
} from 'antd';
import {
    SaveOutlined,
    ReloadOutlined,
    ExportOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EditOutlined,
    LockOutlined,
    InfoCircleOutlined,
    SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const { Option } = Select;
const { Title, Text } = Typography;

// ============================================================
// Interfaces
// ============================================================
interface MyClass {
    classId: string;
    classCode: string;
    subject: { subjectCode: string; subjectName: string; credits: number };
    semester: { semesterId: string; semesterName: string };
    currentStudents: number;
    maxStudents: number;
    status: string;
}

interface StudentGrade {
    gradeId: number;
    studentId: string;
    studentCode: string;
    fullName: string;
    processScore: number | null;
    midtermScore: number | null;
    finalScore: number | null;
    totalScore: number | null;
    letterGrade: string | null;
    status: 'SAVED' | 'SUBMITTED' | 'APPROVED';
    isSelected?: boolean;
}

// ============================================================
// Constants
// ============================================================
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    SAVED: { color: 'purple', icon: <SaveOutlined />, label: 'Đã lưu' },
    SUBMITTED: { color: 'orange', icon: <ClockCircleOutlined />, label: 'Chờ duyệt' },
    APPROVED: { color: 'green', icon: <CheckCircleOutlined />, label: 'Đã duyệt' },
};

const LETTER_CONFIG: Record<string, string> = {
    A: 'success',
    'B+': 'processing',
    B: 'processing',
    'C+': 'warning',
    C: 'warning',
    'D+': 'default',
    D: 'default',
    F: 'error',
};

// ============================================================
// Helper Functions
// ============================================================
const calcTotal = (p: number | null, m: number | null, f: number | null): number | null => {
    if (p === null || m === null || f === null) return null;
    return Number(((p * 0.3) + (m * 0.3) + (f * 0.4)).toFixed(1));
};

const calcLetter = (total: number | null): string | null => {
    if (total === null) return null;
    if (total >= 8.5) return 'A';
    if (total >= 8.0) return 'B+';
    if (total >= 7.0) return 'B';
    if (total >= 6.5) return 'C+';
    if (total >= 5.5) return 'C';
    if (total >= 5.0) return 'D+';
    if (total >= 4.0) return 'D';
    return 'F';
};

const sortByTotalScore = (a: StudentGrade, b: StudentGrade): number => {
    return (a.totalScore ?? -1) - (b.totalScore ?? -1);
};

// ============================================================
// Main Component
// ============================================================
const GradingPage: React.FC = () => {
    const { user } = useContext(AuthContext)!;
    const [searchParams] = useSearchParams();
    const preselectedClassId = searchParams.get('classId');

    const [myClasses, setMyClasses] = useState<MyClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(preselectedClassId);
    const [students, setStudents] = useState<StudentGrade[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingGrades, setLoadingGrades] = useState(false);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [hasUnsaved, setHasUnsaved] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Load danh sách lớp của giảng viên
    useEffect(() => {
        const fetchMyClasses = async () => {
            setLoadingClasses(true);
            try {
                const res = await api.get('/Classes/my-classes');
                const classList: MyClass[] = res.data || [];
                setMyClasses(classList);

                if (preselectedClassId && classList.some(c => c.classId === preselectedClassId)) {
                    setSelectedClassId(preselectedClassId);
                } else if (!selectedClassId && classList.length > 0) {
                    setSelectedClassId(classList[0].classId);
                }
            } catch (err: any) {
                message.error('Không thể tải danh sách lớp: ' + (err.response?.data?.message || err.message));
            } finally {
                setLoadingClasses(false);
            }
        };
        fetchMyClasses();
    }, []);

    // Load sinh viên và điểm khi chọn lớp
    useEffect(() => {
        if (selectedClassId) {
            loadStudentsAndGrades(selectedClassId);
            setCurrentPage(1);
        } else {
            setStudents([]);
            setHasUnsaved(false);
        }
    }, [selectedClassId]);

    const loadStudentsAndGrades = async (classId: string) => {
        setLoadingGrades(true);
        setHasUnsaved(false);
        setSelectAll(false);

        try {
            // Lấy danh sách sinh viên trong lớp
            const studentsRes = await api.get(`/Classes/${classId}/students`);
            const studentList = studentsRes.data.students || [];

            // Lấy điểm của lớp
            let gradeMap = new Map<string, any>();
            try {
                const gradesRes = await api.get(`/Grades/class/${classId}`);
                for (const g of gradesRes.data) {
                    gradeMap.set(g.studentId, g);
                }
            } catch (err) {
                console.warn('Không lấy được điểm:', err);
            }

            const merged: StudentGrade[] = studentList.map((s: any) => {
                const g = gradeMap.get(s.studentId);
                return {
                    gradeId: g?.gradeId ?? 0,
                    studentId: s.studentId,
                    studentCode: s.studentCode,
                    fullName: s.fullName,
                    processScore: g?.processScore ?? null,
                    midtermScore: g?.midtermScore ?? null,
                    finalScore: g?.finalScore ?? null,
                    totalScore: g?.totalScore ?? null,
                    letterGrade: g?.letterGrade ?? null,
                    status: g?.status ?? 'SAVED',
                    isSelected: false,
                };
            });
            setStudents(merged);
        } catch (err: any) {
            if (err.response?.status === 403) {
                message.error('Bạn không có quyền truy cập lớp này');
            } else {
                message.error('Không thể tải dữ liệu lớp: ' + (err.response?.data?.message || err.message));
            }
            setStudents([]);
        } finally {
            setLoadingGrades(false);
        }
    };

    const updateScore = (
        studentId: string,
        field: 'processScore' | 'midtermScore' | 'finalScore',
        value: number | null
    ) => {
        if (value !== null && (value < 0 || value > 10)) {
            message.error('Điểm phải từ 0 đến 10');
            return;
        }

        setHasUnsaved(true);
        setStudents(prev =>
            prev.map(s => {
                if (s.studentId !== studentId) return s;
                if (s.status !== 'SAVED') return s;

                const updated = { ...s, [field]: value };
                const total = calcTotal(updated.processScore, updated.midtermScore, updated.finalScore);
                return {
                    ...updated,
                    totalScore: total,
                    letterGrade: calcLetter(total),
                };
            })
        );
    };

    const handleSave = async () => {
        if (!selectedClassId) return;

        const toSave = students.filter(s => s.status === 'SAVED');

        if (toSave.length === 0) {
            message.info('Không có điểm nào cần lưu');
            return;
        }

        setSaving(true);
        try {
            await api.post('/Grades/bulk', {
                classId: selectedClassId,
                records: toSave.map(s => ({
                    studentId: s.studentId,
                    processScore: s.processScore,
                    midtermScore: s.midtermScore,
                    finalScore: s.finalScore,
                })),
            });
            message.success(`Đã lưu điểm thành công cho ${toSave.length} sinh viên!`);
            setHasUnsaved(false);
            await loadStudentsAndGrades(selectedClassId);
        } catch (err: any) {
            message.error('Lưu điểm thất bại: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedClassId) return;

        const selectedStudents = students.filter(s => s.isSelected && s.status === 'SAVED');

        if (selectedStudents.length === 0) {
            message.warning('Vui lòng chọn sinh viên có trạng thái "Đã lưu"');
            return;
        }

        const incomplete = selectedStudents.some(
            s => s.processScore === null || s.midtermScore === null || s.finalScore === null
        );

        if (incomplete) {
            message.error('Vui lòng nhập đủ 3 cột điểm trước khi gửi duyệt');
            return;
        }

        Modal.confirm({
            title: 'Xác nhận gửi duyệt',
            content: (
                <div>
                    <p>Bạn có chắc muốn gửi yêu cầu duyệt điểm cho <Text strong>{selectedStudents.length}</Text> sinh viên?</p>
                    <p>Sau khi gửi, điểm sẽ được chuyển đến Admin để xét duyệt.</p>
                    <p style={{ color: '#ff4d4f' }}>
                        Lưu ý: Sau khi gửi, bạn sẽ KHÔNG thể chỉnh sửa điểm cho đến khi Admin duyệt hoặc từ chối!
                    </p>
                </div>
            ),
            okText: 'Gửi duyệt',
            okType: 'primary',
            cancelText: 'Hủy',
            onOk: async () => {
                setSubmitting(true);
                try {
                    await api.post('/Grades/submit', {
                        classId: selectedClassId,
                        studentIds: selectedStudents.map(s => s.studentId),
                    });
                    message.success(`Đã gửi yêu cầu duyệt điểm cho ${selectedStudents.length} sinh viên thành công!`);
                    await loadStudentsAndGrades(selectedClassId);
                    setSelectAll(false);
                } catch (err: any) {
                    message.error('Gửi duyệt thất bại: ' + (err.response?.data?.message || err.message));
                } finally {
                    setSubmitting(false);
                }
            },
        });
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;

        setStudents(prev =>
            prev.map((s, idx) => {
                if (idx >= start && idx < end && s.status === 'SAVED') {
                    return { ...s, isSelected: checked };
                }
                return s;
            })
        );
    };

    const handleSelectStudent = (studentId: string, checked: boolean) => {
        setStudents(prev =>
            prev.map(s =>
                s.studentId === studentId ? { ...s, isSelected: checked } : s
            )
        );

        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageStudents = students.slice(start, end).filter(s => s.status === 'SAVED');
        const allSelected = pageStudents.length > 0 && pageStudents.every(s =>
            s.studentId === studentId ? checked : s.isSelected
        );
        setSelectAll(allSelected);
    };

    const handlePageChange = (page: number, newPageSize?: number) => {
        setCurrentPage(page);
        if (newPageSize && newPageSize !== pageSize) {
            setPageSize(newPageSize);
            setCurrentPage(1);
            setSelectAll(false);
        } else {
            setSelectAll(false);
        }
    };

    const exportExcel = () => {
        if (!selectedClassId || students.length === 0) {
            message.warning('Không có dữ liệu để xuất');
            return;
        }

        const currentClass = myClasses.find(c => c.classId === selectedClassId);
        const data = students.map((s, i) => ({
            STT: i + 1,
            'Mã SV': s.studentCode,
            'Họ và tên': s.fullName,
            'Quá trình (30%)': s.processScore ?? '',
            'Giữa kỳ (30%)': s.midtermScore ?? '',
            'Cuối kỳ (40%)': s.finalScore ?? '',
            'Tổng điểm': s.totalScore?.toFixed(1) ?? '',
            'Điểm chữ': s.letterGrade ?? '',
            'Kết quả': s.totalScore ? (s.totalScore >= 5 ? 'Đạt' : 'Không đạt') : '',
            'Trạng thái': STATUS_CONFIG[s.status]?.label ?? s.status,
        }));

        const ws = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(ws, [
            [`BẢNG ĐIỂM - ${currentClass?.subject.subjectName || ''} (${currentClass?.classCode || ''})`],
            [`Học kỳ: ${currentClass?.semester.semesterName || ''}`],
            [`Xuất ngày: ${dayjs().format('DD/MM/YYYY HH:mm')}`],
            [],
        ]);
        XLSX.utils.sheet_add_json(ws, data, { origin: 'A5' });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'BangDiem');
        XLSX.writeFile(wb, `BangDiem_${currentClass?.classCode || 'unknown'}_${dayjs().format('YYYYMMDD')}.xlsx`);
        message.success('Đã xuất file Excel!');
    };

    // Thống kê
    const stats = {
        total: students.length,
        saved: students.filter(s => s.status === 'SAVED').length,
        submitted: students.filter(s => s.status === 'SUBMITTED').length,
        approved: students.filter(s => s.status === 'APPROVED').length,
        passed: students.filter(s => s.totalScore !== null && s.totalScore >= 5).length,
        entered: students.filter(s => s.processScore !== null && s.midtermScore !== null && s.finalScore !== null).length,
    };

    const startIndex = (currentPage - 1) * pageSize;
    const selectableCount = students.slice(startIndex, startIndex + pageSize).filter(s => s.status === 'SAVED').length;
    const selectedCount = students.filter(s => s.isSelected && s.status === 'SAVED').length;
    const currentClass = myClasses.find(c => c.classId === selectedClassId);

    // Columns definition with proper TypeScript types
    const columns: ColumnsType<StudentGrade> = [
        {
            title: (
                <Checkbox
                    checked={selectAll && selectableCount > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={selectableCount === 0}
                />
            ),
            key: 'select',
            width: 50,
            render: (_: any, record: StudentGrade) => (
                <Checkbox
                    checked={record.isSelected}
                    onChange={(e) => handleSelectStudent(record.studentId, e.target.checked)}
                    disabled={record.status !== 'SAVED'}
                />
            ),
        },
        {
            title: 'STT',
            width: 60,
            render: (_: any, __: StudentGrade, idx: number) => startIndex + idx + 1,
        },
        {
            title: 'Sinh viên',
            width: 220,
            fixed: 'left' as const,
            render: (_: any, record: StudentGrade) => (
                <div>
                    <Text strong style={{ fontSize: '15px' }}>{record.fullName}</Text>
                    {record.status === 'APPROVED' && (
                        <Tooltip title="Điểm đã được duyệt">
                            <LockOutlined style={{ marginLeft: 8, color: '#52c41a', fontSize: 14 }} />
                        </Tooltip>
                    )}
                    {record.status === 'SUBMITTED' && (
                        <Tooltip title="Đã gửi duyệt, chờ admin xác nhận">
                            <ClockCircleOutlined style={{ marginLeft: 8, color: '#faad14', fontSize: 14 }} />
                        </Tooltip>
                    )}
                    <div>
                        <Text type="secondary" style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                            {record.studentCode}
                        </Text>
                    </div>
                </div>
            ),
        },
        {
            title: (
                <Tooltip title="Điểm quá trình - hệ số 30%">
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>
                        Quá trình <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: '13px' }} />
                    </span>
                </Tooltip>
            ),
            key: 'process',
            width: 150,
            render: (_: any, record: StudentGrade) => (
                <InputNumber
                    step={0.5}
                    precision={1}
                    value={record.processScore}
                    onChange={(val) => updateScore(record.studentId, 'processScore', val)}
                    disabled={record.status !== 'SAVED'}
                    style={{ width: '100%', fontSize: '14px' }}
                    placeholder="0–10"
                    status={record.processScore !== null && (record.processScore < 0 || record.processScore > 10) ? 'error' : undefined}
                />
            ),
        },
        {
            title: (
                <Tooltip title="Điểm giữa kỳ - hệ số 30%">
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>
                        Giữa kỳ <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: '13px' }} />
                    </span>
                </Tooltip>
            ),
            key: 'midterm',
            width: 150,
            render: (_: any, record: StudentGrade) => (
                <InputNumber
                    step={0.5}
                    precision={1}
                    value={record.midtermScore}
                    onChange={(val) => updateScore(record.studentId, 'midtermScore', val)}
                    disabled={record.status !== 'SAVED'}
                    style={{ width: '100%', fontSize: '14px' }}
                    placeholder="0–10"
                    status={record.midtermScore !== null && (record.midtermScore < 0 || record.midtermScore > 10) ? 'error' : undefined}
                />
            ),
        },
        {
            title: (
                <Tooltip title="Điểm cuối kỳ - hệ số 40%">
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>
                        Cuối kỳ <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: '13px' }} />
                    </span>
                </Tooltip>
            ),
            key: 'final',
            width: 150,
            render: (_: any, record: StudentGrade) => (
                <InputNumber
                    step={0.5}
                    precision={1}
                    value={record.finalScore}
                    onChange={(val) => updateScore(record.studentId, 'finalScore', val)}
                    disabled={record.status !== 'SAVED'}
                    style={{ width: '100%', fontSize: '14px' }}
                    placeholder="0–10"
                    status={record.finalScore !== null && (record.finalScore < 0 || record.finalScore > 10) ? 'error' : undefined}
                />
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Tổng điểm</span>,
            dataIndex: 'totalScore',
            width: 120,
            align: 'center' as const,
            sorter: sortByTotalScore,
            render: (v: number | null) =>
                v !== null ? (
                    <Text strong style={{ color: v >= 4.0 ? '#52c41a' : '#ff4d4f', fontSize: '17px' }}>
                        {v.toFixed(1)}
                    </Text>
                ) : (
                    <Text type="secondary" style={{ fontSize: '14px' }}>—</Text>
                ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Điểm chữ</span>,
            dataIndex: 'letterGrade',
            width: 100,
            align: 'center' as const,
            render: (g: string | null) =>
                g ? (
                    <Tag color={LETTER_CONFIG[g] || 'default'} style={{ fontSize: '14px', padding: '4px 8px' }}>
                        {g}
                    </Tag>
                ) : (
                    <Text type="secondary" style={{ fontSize: '14px' }}>—</Text>
                ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Kết quả</span>,
            width: 110,
            align: 'center' as const,
            render: (_: any, record: StudentGrade) => {
                if (record.totalScore === null) return <Tag color="default" style={{ fontSize: '13px' }}>Chờ nhập</Tag>;
                return record.totalScore >= 4.0 ?
                    <Tag color="success" style={{ fontSize: '13px' }}>Đạt</Tag> :
                    <Tag color="error" style={{ fontSize: '13px' }}>Không đạt</Tag>;
            },
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Trạng thái</span>,
            dataIndex: 'status',
            width: 140,
            align: 'center' as const,
            render: (status: string) => {
                const cfg = STATUS_CONFIG[status];
                return cfg ? (
                    <Tag icon={cfg.icon} color={cfg.color} style={{ fontSize: '13px', padding: '4px 10px' }}>
                        {cfg.label}
                    </Tag>
                ) : (
                    <Tag style={{ fontSize: '13px' }}>{status}</Tag>
                );
            },
        },
    ];

    return (
        <div style={{ padding: '0 24px' }}>
            {/* Header */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                    borderRadius: 12,
                    padding: '24px 28px',
                    marginBottom: 24,
                    boxShadow: '0 4px 16px rgba(22,119,255,0.25)',
                }}
            >
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={2} style={{ color: '#fff', margin: 0, fontSize: '24px' }}>
                            <EditOutlined style={{ marginRight: 12, fontSize: '24px' }} />
                            Nhập điểm học phần
                        </Title>
                        {currentClass && (
                            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', marginTop: 8, display: 'block' }}>
                                {currentClass.classCode} · {currentClass.subject.subjectName} · {currentClass.semester.semesterName}
                            </Text>
                        )}
                    </Col>
                    <Col>
                        <Space size="middle">
                            <Button
                                icon={<ExportOutlined />}
                                onClick={exportExcel}
                                disabled={!selectedClassId || students.length === 0}
                                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: '14px', height: '40px' }}
                            >
                                Xuất Excel
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={saving}
                                onClick={handleSave}
                                disabled={!selectedClassId || loadingGrades || !hasUnsaved}
                                style={{ background: '#fff', color: '#1677ff', fontWeight: 600, border: 'none', fontSize: '14px', height: '40px' }}
                            >
                                {saving ? 'Đang lưu...' : hasUnsaved ? 'Lưu điểm *' : 'Lưu điểm'}
                            </Button>
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                loading={submitting}
                                onClick={handleSubmit}
                                disabled={!selectedClassId || loadingGrades || selectedCount === 0}
                                style={{ background: '#722ed1', borderColor: '#722ed1', fontWeight: 600, fontSize: '14px', height: '40px' }}
                            >
                                {submitting ? 'Đang gửi...' : `Gửi duyệt (${selectedCount})`}
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Chọn lớp */}
            <Card size="small" style={{ marginBottom: 20, borderRadius: 10 }}>
                <Row gutter={16} align="middle">
                    <Col>
                        <Text strong style={{ fontSize: '15px' }}>Chọn lớp:</Text>
                    </Col>
                    <Col flex="auto">
                        <Select
                            placeholder="Chọn lớp đang dạy..."
                            style={{ width: '100%', maxWidth: 450 }}
                            loading={loadingClasses}
                            value={selectedClassId}
                            onChange={(val) => {
                                setSelectedClassId(val);
                                setHasUnsaved(false);
                                setCurrentPage(1);
                                setSelectAll(false);
                            }}
                            showSearch
                            optionFilterProp="children"
                            notFoundContent={loadingClasses ? "Đang tải..." : "Không có lớp nào"}
                        >
                            {myClasses.map((c) => (
                                <Option key={c.classId} value={c.classId}>
                                    {c.classCode} – {c.subject.subjectName} ({c.semester.semesterName})
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => selectedClassId && loadStudentsAndGrades(selectedClassId)}
                            loading={loadingGrades}
                        >
                            Tải lại
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Cảnh báo chưa lưu */}
            {hasUnsaved && (
                <Alert
                    type="warning"
                    showIcon
                    message={<span style={{ fontSize: '14px' }}>Có thay đổi chưa được lưu</span>}
                    description={<span style={{ fontSize: '13px' }}>Nhấn 'Lưu điểm' để lưu các thay đổi, hoặc tải lại trang sẽ mất dữ liệu.</span>}
                    style={{ marginBottom: 20, borderRadius: 8 }}
                    action={
                        <Button size="middle" type="primary" onClick={handleSave} loading={saving}>
                            Lưu ngay
                        </Button>
                    }
                    closable
                />
            )}

            {/* Thống kê nhanh */}
            {selectedClassId && !loadingGrades && students.length > 0 && (
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Tổng SV', value: stats.total, color: '#1677ff', bg: '#e6f4ff' },
                        { label: 'Đã nhập đủ', value: stats.entered, color: '#52c41a', bg: '#f6ffed' },
                        { label: 'Đã lưu', value: stats.saved, color: '#722ed1', bg: '#f9f0ff' },
                        { label: 'Chờ duyệt', value: stats.submitted, color: '#faad14', bg: '#fff7e6' },
                        { label: 'Đã duyệt', value: stats.approved, color: '#00c853', bg: '#e8f5e9' },
                        { label: 'Đạt (≥4.0)', value: stats.passed, color: '#d46b08', bg: '#fff7e6' },
                    ].map((s) => (
                        <Col key={s.label} xs={12} sm={8} md={4}>
                            <Card
                                size="small"
                                style={{ background: s.bg, border: 'none', borderRadius: 10, minWidth: 110 }}
                                bodyStyle={{ padding: '12px 8px' }}
                            >
                                <Statistic
                                    title={<Text style={{ fontSize: '13px', fontWeight: 500 }}>{s.label}</Text>}
                                    value={s.value}
                                    valueStyle={{ color: s.color, fontSize: '22px', fontWeight: 700 }}
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Bảng điểm chính */}
            <Card style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }} bodyStyle={{ padding: 0 }}>
                {!selectedClassId ? (
                    <div style={{ padding: 80, textAlign: 'center' }}>
                        <Empty description={<span style={{ fontSize: '15px' }}>Vui lòng chọn lớp học phần để nhập điểm</span>} />
                    </div>
                ) : loadingGrades ? (
                    <div style={{ padding: 80, textAlign: 'center' }}>
                        <Spin size="large" tip={<span style={{ fontSize: '14px' }}>Đang tải danh sách sinh viên và điểm...</span>} />
                    </div>
                ) : students.length === 0 ? (
                    <div style={{ padding: 80 }}>
                        <Empty description={<span style={{ fontSize: '15px' }}>Lớp này chưa có sinh viên đăng ký</span>} />
                    </div>
                ) : (
                    <>
                        <Table
                            rowKey="studentId"
                            columns={columns}
                            dataSource={students}
                            pagination={{
                                pageSize: pageSize,
                                current: currentPage,
                                showTotal: (total) => <span style={{ fontSize: '14px' }}>Tổng {total} sinh viên</span>,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50', '100'],
                                onChange: handlePageChange,
                                onShowSizeChange: (current, size) => {
                                    setPageSize(size);
                                    setCurrentPage(1);
                                    setSelectAll(false);
                                },
                            }}
                            scroll={{ x: 1400 }}
                            rowClassName={(record: StudentGrade) => {
                                if (record.status === 'APPROVED') return 'row-approved';
                                if (record.status === 'SUBMITTED') return 'row-submitted';
                                if (record.totalScore !== null && record.totalScore < 4.0) return 'row-fail';
                                return '';
                            }}
                            size="middle"
                            summary={() => (
                                <Table.Summary fixed>
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={3}>
                                            <Text strong style={{ fontSize: '14px' }}>Tổng: {students.length} sinh viên</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={3} colSpan={6}>
                                            <Text strong style={{ color: '#52c41a', marginRight: 20, fontSize: '14px' }}>
                                                Đạt: {students.filter((s) => s.totalScore !== null && s.totalScore >= 4.0).length}
                                            </Text>
                                            <Text strong style={{ color: '#ff4d4f', marginRight: 20, fontSize: '14px' }}>
                                                Không đạt: {students.filter((s) => s.totalScore !== null && s.totalScore < 4.0).length}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: '13px' }}>
                                                ĐTB lớp:{' '}
                                                {students.filter((s) => s.totalScore !== null).length > 0
                                                    ? (
                                                        students
                                                            .filter((s) => s.totalScore !== null)
                                                            .reduce((sum, s) => sum + (s.totalScore ?? 0), 0) /
                                                        students.filter((s) => s.totalScore !== null).length
                                                    ).toFixed(2)
                                                    : '—'}
                                            </Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            )}
                        />

                        {/* Nút hành động cuối bảng */}
                        <div
                            style={{
                                padding: '16px 24px',
                                borderTop: '1px solid #f0f0f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            <div>
                                <Text style={{ fontSize: '14px' }}>
                                    Đã chọn <Text strong style={{ color: '#722ed1', fontSize: '15px' }}>{selectedCount}</Text> sinh viên
                                </Text>
                            </div>
                            <Space size="middle">
                                <Button icon={<ReloadOutlined />} onClick={() => selectedClassId && loadStudentsAndGrades(selectedClassId)}>
                                    Tải lại
                                </Button>
                                <Button icon={<ExportOutlined />} onClick={exportExcel}>
                                    Xuất Excel
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    loading={saving}
                                    onClick={handleSave}
                                    disabled={!hasUnsaved}
                                >
                                    {hasUnsaved ? 'Lưu điểm (có thay đổi)' : 'Lưu điểm'}
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    loading={submitting}
                                    onClick={handleSubmit}
                                    disabled={selectedCount === 0}
                                    style={{ background: '#722ed1', borderColor: '#722ed1' }}
                                >
                                    Gửi duyệt ({selectedCount})
                                </Button>
                            </Space>
                        </div>
                    </>
                )}
            </Card>

            <style>{`
                .row-approved td { background: #f6ffed !important; opacity: 0.9; }
                .row-submitted td { background: #fff7e6 !important; }
                .row-fail td { background: #fff1f0 !important; }
                .ant-table-thead > tr > th {
                    background: #fafafa !important;
                    font-weight: 700 !important;
                    border-bottom: 2px solid #f0f0f0 !important;
                    font-size: 15px !important;
                    padding: 16px 8px !important;
                }
                .ant-table-tbody > tr > td {
                    padding: 14px 8px !important;
                    font-size: 14px !important;
                }
                .ant-input-number-status-error {
                    border-color: #ff4d4f !important;
                }
                .ant-input-number-input {
                    font-size: 14px !important;
                    padding: 8px 11px !important;
                }
                .ant-select-selector {
                    font-size: 14px !important;
                    padding: 8px 11px !important;
                }
                .ant-statistic-title {
                    font-size: 13px !important;
                }
                .ant-statistic-content {
                    font-size: 22px !important;
                }
                .ant-tag {
                    font-size: 13px !important;
                    padding: 4px 10px !important;
                }
                .ant-btn {
                    font-size: 14px !important;
                    height: 36px !important;
                }
                .ant-pagination-item {
                    font-size: 14px !important;
                }
                .ant-pagination-total-text {
                    font-size: 14px !important;
                }
            `}</style>
        </div>
    );
};

export default GradingPage;