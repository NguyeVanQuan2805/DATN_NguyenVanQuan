import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    DatePicker,
    Switch,
    Space,
    message,
    Popconfirm,
    Card,
    Tag,
    Tooltip,
    Row,
    Col,
    Statistic,
    Spin,
    Descriptions,
    Divider,
    Badge,
    Progress,
    Tabs
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    UnlockOutlined,
    LockOutlined,
    BarChartOutlined,
    TeamOutlined,
    BookOutlined,
    FileDoneOutlined,
    WarningOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../../services/api';

interface Semester {
    semesterId: string;
    semesterName: string;
    academicYear: number;
    semesterNumber: number;
    startDate: string;
    endDate: string;
    isRegistrationOpen: boolean;
    totalClasses: number;
    totalRegistrations: number;
    approvedRegistrations: number;
}

interface RegistrationStats {
    totalStudents: number;
    totalRegistrations: number;
    pendingRegistrations: number;
    approvedRegistrations: number;
    rejectedRegistrations: number;
    totalClasses: number;
    totalCreditsRegistered: number;
}

interface ClassToCancel {
    classId: string;
    classCode: string;
    subjectName: string;
    currentStudents: number;
    maxStudents: number;
    percentage: number;
}

const SemesterManagement: React.FC = () => {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
    const [form] = Form.useForm();
    const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
    const [stats, setStats] = useState<RegistrationStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('list');
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        fetchSemesters();
    }, []);

    const fetchSemesters = async () => {
        setLoading(true);
        try {
            const response = await api.get('/SemesterManagement/semesters');
            setSemesters(response.data);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể tải danh sách học kỳ');
        } finally {
            setLoading(false);
        }
    };

    const fetchRegistrationStats = async (semesterId: string) => {
        setStatsLoading(true);
        try {
            const response = await api.get(`/SemesterManagement/registration-stats/${semesterId}`);
            setStats(response.data);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể tải thống kê');
        } finally {
            setStatsLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingSemester(null);
        form.resetFields();
        form.setFieldsValue({
            semesterNumber: 1,
            academicYear: new Date().getFullYear(),
            isRegistrationOpen: false
        });
        setModalVisible(true);
    };

    const handleEdit = (record: Semester) => {
        setEditingSemester(record);
        form.setFieldsValue({
            ...record,
            startDate: dayjs(record.startDate),
            endDate: dayjs(record.endDate)
        });
        setModalVisible(true);
    };

    const handleDelete = async (semesterId: string) => {
        try {
            await api.delete(`/SemesterManagement/semesters/${semesterId}`);
            message.success('Xóa học kỳ thành công');
            fetchSemesters();
            if (selectedSemester?.semesterId === semesterId) {
                setSelectedSemester(null);
                setStats(null);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể xóa học kỳ');
        }
    };

    // Hàm kiểm tra và hủy các lớp có sĩ số < 10%
    const checkAndCancelLowEnrollmentClasses = async (semesterId: string, semesterName: string) => {
        setCancelling(true);
        try {
            // Gọi API để lấy danh sách các lớp có sĩ số < 10%
            const response = await api.get(`/SemesterManagement/check-low-enrollment/${semesterId}`);
            const lowEnrollmentClasses: ClassToCancel[] = response.data || [];

            if (lowEnrollmentClasses.length === 0) {
                message.info(`Học kỳ ${semesterName} không có lớp nào cần hủy do sĩ số thấp`);
                return true;
            }

            // Hiển thị xác nhận hủy lớp
            return new Promise<boolean>((resolve) => {
                Modal.confirm({
                    title: 'Xác nhận hủy lớp học phần',
                    icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
                    width: 700,
                    content: (
                        <div>
                            <p>Khi đóng đăng ký học kỳ <strong>{semesterName}</strong>,
                                các lớp có số sinh viên đăng ký dưới 10% sĩ số tối đa sẽ bị <strong style={{ color: '#ff4d4f' }}>HỦY</strong>.</p>
                            <Divider style={{ margin: '12px 0' }} />
                            <p><strong>Danh sách lớp sẽ bị hủy ({lowEnrollmentClasses.length} lớp):</strong></p>
                            <Table
                                dataSource={lowEnrollmentClasses}
                                rowKey="classId"
                                size="small"
                                pagination={false}
                                columns={[
                                    { title: 'Mã lớp', dataIndex: 'classCode', width: 120 },
                                    { title: 'Môn học', dataIndex: 'subjectName', width: 200 },
                                    {
                                        title: 'Sĩ số',
                                        width: 150,
                                        render: (_: any, record: ClassToCancel) => (
                                            <span>
                                                {record.currentStudents}/{record.maxStudents}
                                                (<span style={{ color: '#ff4d4f' }}>{record.percentage}%</span>)
                                            </span>
                                        )
                                    },
                                    {
                                        title: 'Trạng thái mới',
                                        width: 120,
                                        render: () => <Tag color="error">Đã hủy</Tag>
                                    }
                                ]}
                            />
                            <Divider style={{ margin: '12px 0' }} />
                            <p style={{ color: '#ff4d4f' }}>
                                <WarningOutlined /> Lưu ý: Hành động này không thể hoàn tác. Sinh viên đã đăng ký các lớp này sẽ bị hủy đăng ký.
                            </p>
                        </div>
                    ),
                    okText: 'Xác nhận đóng và hủy lớp',
                    okType: 'danger',
                    cancelText: 'Hủy bỏ',
                    onOk: async () => {
                        try {
                            await api.post(`/SemesterManagement/cancel-low-enrollment/${semesterId}`);
                            message.success(`Đã hủy ${lowEnrollmentClasses.length} lớp có sĩ số thấp`);
                            resolve(true);
                        } catch (error: any) {
                            message.error(error.response?.data?.message || 'Lỗi khi hủy lớp');
                            resolve(false);
                        }
                    },
                    onCancel: () => {
                        resolve(false);
                    }
                });
            });
        } catch (error: any) {
            console.error('Lỗi kiểm tra lớp:', error);
            message.error('Không thể kiểm tra danh sách lớp');
            setCancelling(false);
            return false;
        }
    };

    const handleToggleRegistration = async (semester: Semester) => {
        const newStatus = !semester.isRegistrationOpen;

        // Nếu là ĐÓNG đăng ký (từ mở -> đóng), cần kiểm tra lớp có sĩ số thấp
        if (!newStatus && semester.isRegistrationOpen) {
            const shouldProceed = await checkAndCancelLowEnrollmentClasses(semester.semesterId, semester.semesterName);
            if (!shouldProceed) {
                return;
            }
        }

        try {
            await api.put(`/SemesterManagement/toggle-registration/${semester.semesterId}`, { isOpen: newStatus });
            message.success(newStatus ? 'Đã mở đăng ký' : 'Đã đóng đăng ký');
            fetchSemesters();
            if (selectedSemester?.semesterId === semester.semesterId) {
                setSelectedSemester({ ...semester, isRegistrationOpen: newStatus });
            }

            // Cập nhật lại danh sách lớp sau khi thay đổi
            // Gửi sự kiện để ClassesManagement cập nhật
            window.dispatchEvent(new CustomEvent('semesterStatusChanged', {
                detail: { semesterId: semester.semesterId, isOpen: newStatus }
            }));
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể thay đổi trạng thái');
        } finally {
            setCancelling(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const submitData = {
                ...values,
                startDate: values.startDate.format('YYYY-MM-DD'),
                endDate: values.endDate.format('YYYY-MM-DD')
            };

            if (editingSemester) {
                await api.put(`/SemesterManagement/semesters/${editingSemester.semesterId}`, submitData);
                message.success('Cập nhật học kỳ thành công');
            } else {
                await api.post('/SemesterManagement/semesters', submitData);
                message.success('Thêm học kỳ thành công');
            }
            setModalVisible(false);
            fetchSemesters();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleViewStats = async (record: Semester) => {
        setSelectedSemester(record);
        await fetchRegistrationStats(record.semesterId);
        setActiveTab('stats');
    };

    const columns: ColumnsType<Semester> = [
        {
            title: 'Mã HK',
            dataIndex: 'semesterId',
            key: 'semesterId',
            width: 100,
        },
        {
            title: 'Tên học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 150,
        },
        {
            title: 'Năm học',
            dataIndex: 'academicYear',
            key: 'academicYear',
            width: 100,
            align: 'center',
        },
        {
            title: 'Học kỳ',
            dataIndex: 'semesterNumber',
            key: 'semesterNumber',
            width: 80,
            align: 'center',
            render: (num) => <Tag color="blue">HK{num}</Tag>,
        },
        {
            title: 'Thời gian',
            key: 'duration',
            width: 200,
            render: (_, record) => (
                <span>
                    {dayjs(record.startDate).format('DD/MM/YYYY')} - {dayjs(record.endDate).format('DD/MM/YYYY')}
                </span>
            ),
        },
        {
            title: 'Lớp HP',
            dataIndex: 'totalClasses',
            key: 'totalClasses',
            width: 80,
            align: 'center',
            render: (count) => <Badge count={count} style={{ backgroundColor: '#1890ff' }} />,
        },
        {
            title: 'Đăng ký',
            dataIndex: 'totalRegistrations',
            key: 'totalRegistrations',
            width: 100,
            align: 'center',
            render: (count, record) => (
                <Tooltip title={`Đã duyệt: ${record.approvedRegistrations}`}>
                    <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
                </Tooltip>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isRegistrationOpen',
            key: 'isRegistrationOpen',
            width: 120,
            align: 'center',
            render: (isOpen) => (
                <Tag icon={isOpen ? <UnlockOutlined /> : <LockOutlined />}
                    color={isOpen ? 'green' : 'default'}>
                    {isOpen ? 'Đang mở đăng ký' : 'Đã đóng'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 200,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Tooltip title={record.isRegistrationOpen ? 'Đóng đăng ký' : 'Mở đăng ký'}>
                        <Button
                            type="link"
                            size="small"
                            icon={record.isRegistrationOpen ? <LockOutlined /> : <UnlockOutlined />}
                            onClick={() => handleToggleRegistration(record)}
                            loading={cancelling}
                            style={{ color: record.isRegistrationOpen ? '#ff4d4f' : '#52c41a' }}
                        />
                    </Tooltip>
                    <Tooltip title="Xem thống kê">
                        <Button
                            type="link"
                            size="small"
                            icon={<BarChartOutlined />}
                            onClick={() => handleViewStats(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Sửa">
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <Popconfirm
                            title="Xóa học kỳ"
                            description="Bạn có chắc chắn muốn xóa học kỳ này?"
                            onConfirm={() => handleDelete(record.semesterId)}
                            okText="Xóa"
                            cancelText="Hủy"
                        >
                            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#faad14';
            case 'APPROVED': return '#52c41a';
            case 'REJECTED': return '#ff4d4f';
            default: return '#d9d9d9';
        }
    };

    return (
        <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Tổng số học kỳ"
                            value={semesters.length}
                            prefix={<CalendarOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Đang mở đăng ký"
                            value={semesters.filter(s => s.isRegistrationOpen).length}
                            prefix={<UnlockOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Tổng lớp HP"
                            value={semesters.reduce((sum, s) => sum + (s.totalClasses || 0), 0)}
                            prefix={<BookOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Tổng đăng ký"
                            value={semesters.reduce((sum, s) => sum + (s.totalRegistrations || 0), 0)}
                            prefix={<FileDoneOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                    {
                        key: 'list',
                        label: 'Danh sách học kỳ',
                        children: (
                            <>
                                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Space>
                                        <Button icon={<ReloadOutlined />} onClick={fetchSemesters}>
                                            Làm mới
                                        </Button>
                                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                            Thêm học kỳ
                                        </Button>
                                    </Space>
                                </div>

                                <Table
                                    columns={columns}
                                    dataSource={semesters}
                                    rowKey="semesterId"
                                    loading={loading}
                                    scroll={{ x: 1200 }}
                                    pagination={{
                                        showSizeChanger: true,
                                        showTotal: (total) => `Tổng số ${total} học kỳ`,
                                    }}
                                />
                            </>
                        ),
                    },
                    {
                        key: 'stats',
                        label: 'Thống kê đăng ký',
                        children: selectedSemester ? (
                            <Spin spinning={statsLoading}>
                                <Card
                                    title={
                                        <Space>
                                            <CalendarOutlined />
                                            <span>Thống kê học kỳ: {selectedSemester.semesterName}</span>
                                            <Tag color={selectedSemester.isRegistrationOpen ? 'green' : 'default'}>
                                                {selectedSemester.isRegistrationOpen ? 'Đang mở đăng ký' : 'Đã đóng đăng ký'}
                                            </Tag>
                                        </Space>
                                    }
                                    extra={
                                        <Button onClick={() => setActiveTab('list')}>Quay lại</Button>
                                    }
                                >
                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <Card>
                                                <Statistic
                                                    title="Số sinh viên đăng ký"
                                                    value={stats?.totalStudents || 0}
                                                    prefix={<TeamOutlined />}
                                                    valueStyle={{ color: '#1890ff' }}
                                                />
                                            </Card>
                                        </Col>
                                        <Col span={8}>
                                            <Card>
                                                <Statistic
                                                    title="Tổng số đăng ký"
                                                    value={stats?.totalRegistrations || 0}
                                                    prefix={<FileDoneOutlined />}
                                                    valueStyle={{ color: '#722ed1' }}
                                                />
                                            </Card>
                                        </Col>
                                        <Col span={8}>
                                            <Card>
                                                <Statistic
                                                    title="Tổng tín chỉ đã đăng ký"
                                                    value={stats?.totalCreditsRegistered || 0}
                                                    suffix="TC"
                                                    prefix={<BookOutlined />}
                                                />
                                            </Card>
                                        </Col>
                                    </Row>

                                    <Divider>Chi tiết trạng thái đăng ký</Divider>

                                    <Row gutter={16}>
                                        <Col span={6}>
                                            <Card size="small">
                                                <Statistic
                                                    title="Chờ duyệt"
                                                    value={stats?.pendingRegistrations || 0}
                                                    valueStyle={{ color: '#faad14' }}
                                                />
                                                <Progress
                                                    percent={((stats?.pendingRegistrations || 0) / (stats?.totalRegistrations || 1)) * 100}
                                                    size="small"
                                                    strokeColor="#faad14"
                                                />
                                            </Card>
                                        </Col>
                                        <Col span={6}>
                                            <Card size="small">
                                                <Statistic
                                                    title="Đã duyệt"
                                                    value={stats?.approvedRegistrations || 0}
                                                    valueStyle={{ color: '#52c41a' }}
                                                />
                                                <Progress
                                                    percent={((stats?.approvedRegistrations || 0) / (stats?.totalRegistrations || 1)) * 100}
                                                    size="small"
                                                    strokeColor="#52c41a"
                                                />
                                            </Card>
                                        </Col>
                                        <Col span={6}>
                                            <Card size="small">
                                                <Statistic
                                                    title="Từ chối"
                                                    value={stats?.rejectedRegistrations || 0}
                                                    valueStyle={{ color: '#ff4d4f' }}
                                                />
                                                <Progress
                                                    percent={((stats?.rejectedRegistrations || 0) / (stats?.totalRegistrations || 1)) * 100}
                                                    size="small"
                                                    strokeColor="#ff4d4f"
                                                />
                                            </Card>
                                        </Col>
                                        <Col span={6}>
                                            <Card size="small">
                                                <Statistic
                                                    title="Tỷ lệ duyệt"
                                                    value={((stats?.approvedRegistrations || 0) / (stats?.totalRegistrations || 1) * 100).toFixed(1)}
                                                    suffix="%"
                                                    valueStyle={{ color: '#52c41a' }}
                                                />
                                            </Card>
                                        </Col>
                                    </Row>

                                    <Divider>Thông tin học kỳ</Divider>

                                    <Descriptions bordered column={2}>
                                        <Descriptions.Item label="Mã học kỳ">{selectedSemester.semesterId}</Descriptions.Item>
                                        <Descriptions.Item label="Tên học kỳ">{selectedSemester.semesterName}</Descriptions.Item>
                                        <Descriptions.Item label="Năm học">{selectedSemester.academicYear}</Descriptions.Item>
                                        <Descriptions.Item label="Học kỳ thứ">{selectedSemester.semesterNumber}</Descriptions.Item>
                                        <Descriptions.Item label="Thời gian bắt đầu">{dayjs(selectedSemester.startDate).format('DD/MM/YYYY')}</Descriptions.Item>
                                        <Descriptions.Item label="Thời gian kết thúc">{dayjs(selectedSemester.endDate).format('DD/MM/YYYY')}</Descriptions.Item>
                                        <Descriptions.Item label="Số lớp học phần">{stats?.totalClasses || 0}</Descriptions.Item>
                                        <Descriptions.Item label="Trạng thái">
                                            <Tag color={selectedSemester.isRegistrationOpen ? 'green' : 'default'}>
                                                {selectedSemester.isRegistrationOpen ? 'Đang mở đăng ký' : 'Đã đóng đăng ký'}
                                            </Tag>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </Spin>
                        ) : (
                            <Card>
                                <div style={{ textAlign: 'center', padding: 50 }}>
                                    <BarChartOutlined style={{ fontSize: 48, color: '#ccc' }} />
                                    <p style={{ marginTop: 16, color: '#999' }}>
                                        Chọn một học kỳ để xem thống kê
                                    </p>
                                </div>
                            </Card>
                        ),
                    },
                ]} />
            </Card>

            <Modal
                title={editingSemester ? 'Sửa học kỳ' : 'Thêm học kỳ mới'}
                open={modalVisible}
                onOk={handleSubmit}
                onCancel={() => setModalVisible(false)}
                width={600}
                okText={editingSemester ? 'Cập nhật' : 'Thêm mới'}
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical">
                    {!editingSemester && (
                        <Form.Item
                            name="semesterId"
                            label="Mã học kỳ"
                            rules={[{ required: true, message: 'Vui lòng nhập mã học kỳ' }]}
                            extra="VD: HK2024_1, HK2024_2, HK2025_1"
                        >
                            <Input placeholder="VD: HK2024_1" />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="semesterName"
                        label="Tên học kỳ"
                        rules={[{ required: true, message: 'Vui lòng nhập tên học kỳ' }]}
                    >
                        <Input placeholder="VD: Học kỳ 1 năm học 2024-2025" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="academicYear"
                                label="Năm học"
                                rules={[{ required: true, message: 'Vui lòng nhập năm học' }]}
                            >
                                <InputNumber min={2000} max={2030} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="semesterNumber"
                                label="Học kỳ thứ"
                                rules={[{ required: true, message: 'Vui lòng chọn học kỳ' }]}
                            >
                                <InputNumber min={1} max={3} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="startDate"
                                label="Ngày bắt đầu"
                                rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
                            >
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="endDate"
                                label="Ngày kết thúc"
                                rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc' }]}
                            >
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="isRegistrationOpen" label="Trạng thái" valuePropName="checked">
                        <Switch checkedChildren="Mở đăng ký" unCheckedChildren="Đóng đăng ký" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SemesterManagement;