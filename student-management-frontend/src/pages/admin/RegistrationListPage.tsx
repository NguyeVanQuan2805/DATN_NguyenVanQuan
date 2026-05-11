// src/pages/admin/RegistrationListPage.tsx
import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Tag,
    Space,
    Typography,
    Card,
    Row,
    Col,
    Statistic,
    Input,
    Select,
    message,
    Modal,
    Avatar,
    Tooltip,
    Badge,
    Divider,
    Descriptions,
    Popconfirm,
    Alert,
    Spin,
    Empty,
} from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    UserOutlined,
    SearchOutlined,
    DownloadOutlined,
    ReloadOutlined,
    TeamOutlined,
    LockOutlined,
    UnlockOutlined,
    FilterOutlined,
    ExclamationCircleOutlined,
    MailOutlined,
    PhoneOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

// ============================================================
// Interfaces
// ============================================================
interface ClassMeta {
    classId: string;
    classCode: string;
    subjectName: string;
    semesterName: string;
    teacherName: string;
    maxStudents: number;
    currentStudents: number;
    status: string;
    schedule: string;
}

interface RegistrationItem {
    registrationId: number;
    studentId: string;
    studentCode: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    registeredAt: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DROPPED';
}

// ============================================================
// Constants
// ============================================================
const REG_STATUS = {
    PENDING: { color: 'warning', label: 'Chờ duyệt', icon: '⏳' },
    APPROVED: { color: 'success', label: 'Đã duyệt', icon: '✅' },
    REJECTED: { color: 'error', label: 'Từ chối', icon: '❌' },
    DROPPED: { color: 'default', label: 'Đã hủy', icon: '🚫' },
} as const;

const DAY_MAP: Record<number, string> = {
    2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4',
    5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'CN',
};

// ============================================================
// Component
// ============================================================
const RegistrationListPage: React.FC = () => {
    const navigate = useNavigate();
    const { classId } = useParams<{ classId: string }>();
    const location = useLocation();
    const meta = (location.state as ClassMeta | null);

    const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [classInfo, setClassInfo] = useState<ClassMeta | null>(meta);

    // ============================================================
    // Fetch data
    // ============================================================
    const fetchRegistrations = async () => {
        if (!classId) return;

        setLoading(true);
        try {
            // Lấy thông tin lớp nếu chưa có
            if (!classInfo) {
                try {
                    const classRes = await api.get(`/Classes/${classId}`);
                    const data = classRes.data;
                    setClassInfo({
                        classId: data.classId,
                        classCode: data.classCode,
                        subjectName: data.subject?.subjectName || 'N/A',
                        semesterName: data.semester?.semesterName || 'N/A',
                        teacherName: data.teacher?.fullName || 'Chưa phân công',
                        maxStudents: data.maxStudents || 0,
                        currentStudents: data.currentStudents || 0,
                        status: data.status || 'UNKNOWN',
                        schedule: data.schedule
                            ? `${DAY_MAP[data.schedule.dayOfWeek] || ''} T${data.schedule.periodStart}-${data.schedule.periodEnd} ${data.schedule.room || ''}`
                            : 'Chưa có lịch'
                    });
                } catch (err) {
                    console.warn('Không thể lấy thông tin lớp:', err);
                }
            }

            // Lấy danh sách đăng ký - ĐÃ SỬA
            const regRes = await api.get('/CourseRegistrations', {
                params: {
                    classId: classId,
                    ...(filterStatus !== 'ALL' && { status: filterStatus })
                }
            });

            const data = regRes.data || [];

            // Transform dữ liệu
            const transformed: RegistrationItem[] = data.map((item: any) => ({
                registrationId: item.registrationId,
                studentId: item.studentId,
                studentCode: item.student?.studentCode || 'N/A',
                fullName: item.student?.fullName || 'N/A',
                email: item.student?.email || null,
                phone: item.student?.phone || null,
                gender: item.student?.gender || null,
                registeredAt: item.registeredAt || new Date().toISOString(),
                status: item.status || 'PENDING',
            }));

            setRegistrations(transformed);
        } catch (err: any) {
            console.error('Lỗi tải đăng ký:', err);

            if (err.response?.status === 500) {
                message.error('Lỗi server khi tải danh sách đăng ký. Vui lòng thử lại sau!');
            } else {
                message.error('Không thể tải danh sách đăng ký: ' + (err.response?.data?.message || err.message));
            }

            setRegistrations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegistrations();
    }, [classId, filterStatus]);

    // ============================================================
    // Handlers
    // ============================================================
    // Sửa hàm handleApprove để log lỗi chi tiết hơn

    const handleApprove = async (regId: number) => {
        setActionLoading(regId);
        try {
            const response = await api.put(`/CourseRegistrations/approve/${regId}`);
            console.log('Approve response:', response.data);
            message.success('Đã duyệt đăng ký thành công!');
            fetchRegistrations();
        } catch (err: any) {
            console.error('Lỗi duyệt đăng ký:', err);
            console.error('Response data:', err.response?.data);

            let errorMsg = 'Duyệt thất bại';
            if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else if (err.response?.data) {
                errorMsg = JSON.stringify(err.response.data);
            } else if (err.message) {
                errorMsg = err.message;
            }

            message.error(errorMsg);
        } finally {
            setActionLoading(null);
        }
    };

    // Sửa hàm handleReject để dùng endpoint reject riêng

    const handleReject = async (reg: RegistrationItem) => {
        Modal.confirm({
            title: `Từ chối đăng ký của ${reg.fullName}?`,
            icon: <ExclamationCircleOutlined />,
            content: 'Sinh viên này sẽ không được vào lớp học phần.',
            okText: 'Từ chối',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                setActionLoading(reg.registrationId);
                try {
                    // Cách 1: Dùng endpoint PUT /api/CourseRegistrations/{id}
                    await api.put(`/CourseRegistrations/${reg.registrationId}`, {
                        registrationId: reg.registrationId,
                        status: 'REJECTED'
                    });

                    // Cách 2: Dùng endpoint riêng (recommended)
                    // await api.put(`/CourseRegistrations/reject/${reg.registrationId}`);

                    message.success('Đã từ chối đăng ký');
                    fetchRegistrations();
                } catch (err: any) {
                    console.error('Lỗi từ chối:', err);
                    let errorMsg = 'Từ chối thất bại';
                    if (err.response?.data?.message) {
                        errorMsg = err.response.data.message;
                    } else if (err.response?.data) {
                        errorMsg = JSON.stringify(err.response.data);
                    }
                    message.error(errorMsg);
                } finally {
                    setActionLoading(null);
                }
            },
        });
    };

    const toggleClassStatus = async () => {
        if (!classInfo || !classId) return;

        const newStatus = classInfo.status === 'OPEN' ? 'CLOSED' : 'OPEN';
        try {
            await api.put(`/Classes/${classId}`, {
                classId,
                status: newStatus
            });

            message.success(newStatus === 'OPEN' ? 'Đã mở đăng ký' : 'Đã đóng đăng ký');
            setClassInfo({ ...classInfo, status: newStatus });
            fetchRegistrations();
        } catch (err: any) {
            message.error('Cập nhật trạng thái thất bại');
        }
    };

    const handleExport = () => {
        const dataToExport = filtered.map((r, i) => ({
            STT: i + 1,
            'Mã SV': r.studentCode,
            'Họ tên': r.fullName,
            'Email': r.email || '',
            'SĐT': r.phone || '',
            'Giới tính': r.gender === 'M' ? 'Nam' : r.gender === 'F' ? 'Nữ' : 'Khác',
            'Ngày đăng ký': dayjs(r.registeredAt).format('DD/MM/YYYY HH:mm'),
            'Trạng thái': REG_STATUS[r.status]?.label || r.status,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DanhSachDangKy');
        XLSX.writeFile(wb, `DangKy_${classInfo?.classCode || classId}_${dayjs().format('YYYYMMDD')}.xlsx`);
        message.success('Đã xuất file Excel!');
    };

    // ============================================================
    // Filter & Stats
    // ============================================================
    const filtered = registrations.filter(r => {
        const matchSearch =
            r.fullName.toLowerCase().includes(search.toLowerCase()) ||
            r.studentCode.toLowerCase().includes(search.toLowerCase()) ||
            (r.email && r.email.toLowerCase().includes(search.toLowerCase()));
        return matchSearch;
    });

    const counts = {
        total: registrations.length,
        approved: registrations.filter(r => r.status === 'APPROVED').length,
        pending: registrations.filter(r => r.status === 'PENDING').length,
        rejected: registrations.filter(r => r.status === 'REJECTED' || r.status === 'DROPPED').length,
    };

    // ============================================================
    // Columns
    // ============================================================
    const columns: ColumnsType<RegistrationItem> = [
        {
            title: 'STT',
            width: 60,
            render: (_, __, idx) => (
                <Text style={{ color: '#8c8c8c' }}>{idx + 1}</Text>
            ),
        },
        {
            title: 'Sinh viên',
            width: 250,
            render: (_, r) => (
                <Space>
                    <Avatar
                        style={{
                            background: r.gender === 'F' ? '#eb2f96' : '#722ed1',
                            fontSize: 13
                        }}
                        size={36}
                        icon={<UserOutlined />}
                    >
                        {r.fullName.charAt(0)}
                    </Avatar>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.fullName}</div>
                        <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                            {r.studentCode}
                        </Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Liên hệ',
            width: 250,
            render: (_, r) => (
                <Space direction="vertical" size={2}>
                    {r.email && (
                        <Text style={{ fontSize: 12 }}>
                            <MailOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                            {r.email}
                        </Text>
                    )}
                    {r.phone && (
                        <Text style={{ fontSize: 12 }}>
                            <PhoneOutlined style={{ marginRight: 4, color: '#1677ff' }} />
                            {r.phone}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Giới tính',
            width: 90,
            render: (_, r) => {
                const label = r.gender === 'M' ? 'Nam' : r.gender === 'F' ? 'Nữ' : 'Khác';
                const color = r.gender === 'M' ? '#722ed1' : r.gender === 'F' ? '#eb2f96' : '#8c8c8c';
                return <Tag color={color}>{label}</Tag>;
            },
        },
        {
            title: 'Ngày đăng ký',
            width: 120,
            render: (_, r) => dayjs(r.registeredAt).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Trạng thái',
            width: 120,
            render: (_, r) => {
                const cfg = REG_STATUS[r.status];
                return (
                    <Tag color={cfg?.color} icon={cfg?.icon}>
                        {cfg?.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Thao tác',
            width: 180,
            fixed: 'right',
            render: (_, r) => {
                if (r.status !== 'PENDING') {
                    return <Text type="secondary">—</Text>;
                }
                return (
                    <Space size={4}>
                        <Tooltip title="Duyệt đăng ký">
                            <Button
                                size="small"
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                loading={actionLoading === r.registrationId}
                                onClick={() => handleApprove(r.registrationId)}
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                            >
                                Duyệt
                            </Button>
                        </Tooltip>
                        <Tooltip title="Từ chối">
                            <Button
                                size="small"
                                danger
                                icon={<CloseCircleOutlined />}
                                loading={actionLoading === r.registrationId}
                                onClick={() => handleReject(r)}
                            >
                                Từ chối
                            </Button>
                        </Tooltip>
                    </Space>
                );
            },
        },
    ];

    // ============================================================
    // Render
    // ============================================================
    return (
        <div style={{ padding: 24, background: '#f5f7fa', minHeight: '100vh' }}>

            {/* Back button */}
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/classes')}
                style={{ marginBottom: 16, fontWeight: 600 }}
            >
                Quay lại danh sách lớp
            </Button>

            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                borderRadius: 12,
                padding: '24px 28px',
                marginBottom: 20,
                boxShadow: '0 4px 20px rgba(114,46,209,0.3)',
            }}>
                <Row justify="space-between" align="middle" wrap>
                    <Col>
                        <Title level={3} style={{ color: '#fff', margin: 0 }}>
                            <TeamOutlined style={{ marginRight: 10 }} />
                            Danh sách đăng ký lớp học phần
                        </Title>
                        {classInfo && (
                            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                                {classInfo.classCode} - {classInfo.subjectName} · {classInfo.semesterName}
                            </Text>
                        )}
                    </Col>
                    <Col>
                        <Space wrap>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={fetchRegistrations}
                                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                            >
                                Làm mới
                            </Button>
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={handleExport}
                                disabled={registrations.length === 0}
                                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                            >
                                Xuất CSV
                            </Button>
                            {classInfo && (
                                <Button
                                    icon={classInfo.status === 'OPEN' ? <LockOutlined /> : <UnlockOutlined />}
                                    onClick={toggleClassStatus}
                                    danger={classInfo.status === 'OPEN'}
                                    type={classInfo.status !== 'OPEN' ? 'primary' : 'default'}
                                    style={classInfo.status !== 'OPEN'
                                        ? { background: '#52c41a', borderColor: '#52c41a', color: '#fff' }
                                        : { background: 'rgba(255,255,255,0.9)', fontWeight: 600 }
                                    }
                                >
                                    {classInfo.status === 'OPEN' ? 'Đóng đăng ký' : 'Mở đăng ký'}
                                </Button>
                            )}
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Class Info */}
            {classInfo && (
                <Card style={{ borderRadius: 10, marginBottom: 20, borderColor: '#e0d0ff' }}>
                    <Row gutter={[16, 16]}>
                        <Col span={6}>
                            <Text type="secondary">Giảng viên:</Text>
                            <div><Text strong>{classInfo.teacherName}</Text></div>
                        </Col>
                        <Col span={10}>
                            <Text type="secondary">Lịch học:</Text>
                            <div><Text>{classInfo.schedule}</Text></div>
                        </Col>
                        <Col span={4}>
                            <Text type="secondary">Sĩ số:</Text>
                            <div>
                                <Badge
                                    count={`${classInfo.currentStudents}/${classInfo.maxStudents}`}
                                    style={{
                                        backgroundColor: classInfo.currentStudents >= classInfo.maxStudents
                                            ? '#ff4d4f'
                                            : '#52c41a',
                                        fontSize: 13
                                    }}
                                />
                            </div>
                        </Col>
                        <Col span={4}>
                            <Text type="secondary">Trạng thái:</Text>
                            <div>
                                <Tag color={classInfo.status === 'OPEN' ? 'success' : 'default'}>
                                    {classInfo.status === 'OPEN' ? '🟢 Đang mở' : '⚪ Đã đóng'}
                                </Tag>
                            </div>
                        </Col>
                    </Row>
                </Card>
            )}

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                {[
                    { label: 'Tổng đăng ký', value: counts.total, color: '#722ed1', bg: '#f9f0ff' },
                    { label: 'Đã duyệt', value: counts.approved, color: '#52c41a', bg: '#f6ffed' },
                    { label: 'Chờ duyệt', value: counts.pending, color: '#faad14', bg: '#fff7e6' },
                    { label: 'Từ chối / Hủy', value: counts.rejected, color: '#ff4d4f', bg: '#fff1f0' },
                ].map(s => (
                    <Col xs={24} sm={12} md={6} key={s.label}>
                        <Card size="small" style={{ background: s.bg, borderRadius: 10 }}>
                            <Statistic
                                title={<Text style={{ fontSize: 12 }}>{s.label}</Text>}
                                value={s.value}
                                styles={{ content: { color: s.color, fontSize: 26, fontWeight: 700 } }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Pending Alert */}
            {counts.pending > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    message={`Có ${counts.pending} đăng ký đang chờ duyệt`}
                    description="Vui lòng xem xét và duyệt hoặc từ chối các đăng ký bên dưới."
                    style={{ marginBottom: 16, borderRadius: 8 }}
                />
            )}

            {/* Filter & Search */}
            <Card style={{ borderRadius: 10, marginBottom: 16 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col flex="auto">
                        <Input
                            placeholder="Tìm theo tên, mã SV, email..."
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            allowClear
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </Col>
                    <Col>
                        <Select
                            value={filterStatus}
                            onChange={setFilterStatus}
                            style={{ width: 160 }}
                        >
                            <Option value="ALL">Tất cả trạng thái</Option>
                            <Option value="PENDING">⏳ Chờ duyệt</Option>
                            <Option value="APPROVED">✅ Đã duyệt</Option>
                            <Option value="REJECTED">❌ Từ chối</Option>
                            <Option value="DROPPED">🚫 Đã hủy</Option>
                        </Select>
                    </Col>
                    <Col>
                        <Text type="secondary">
                            Hiển thị {filtered.length}/{registrations.length} sinh viên
                        </Text>
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <Spin size="large" tip="Đang tải danh sách đăng ký..." />
                    </div>
                ) : registrations.length === 0 ? (
                    <Empty
                        description="Chưa có sinh viên đăng ký lớp này"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <Table
                        rowKey="registrationId"
                        columns={columns}
                        dataSource={filtered}
                        pagination={{
                            pageSize: 15,
                            showTotal: t => `Tổng ${t} sinh viên`,
                            showSizeChanger: true,
                        }}
                        scroll={{ x: 1200 }}
                        rowClassName={r =>
                            r.status === 'PENDING' ? 'row-pending' :
                                r.status === 'REJECTED' ? 'row-rejected' : ''
                        }
                    />
                )}
            </Card>

            {/* CSS */}
            <style>{`
                .row-pending td { background: #fffbe6 !important; }
                .row-pending:hover td { background: #fff1b8 !important; }
                .row-rejected td { background: #fff1f0 !important; opacity: 0.75; }
                .ant-table-thead > tr > th {
                    background: #fafafa !important;
                    font-weight: 700 !important;
                    border-bottom: 2px solid #f0f0f0 !important;
                }
            `}</style>
        </div>
    );
};

export default RegistrationListPage;