// src/pages/admin/TuitionConfig.tsx
import React, { useState, useEffect } from 'react';
import {
    Card,
    Form,
    InputNumber,
    Button,
    message,
    Space,
    Typography,
    Divider,
    Table,
    Tag,
    Spin,
    Modal,
    Select,
    Alert,
    Statistic,
    Row,
    Col,
    Tooltip,
    Tabs,
    Image,
    Input,
    DatePicker,
    Popconfirm,
    Descriptions
} from 'antd';
import {
    DollarOutlined,
    SettingOutlined,
    CalculatorOutlined,
    ReloadOutlined,
    EyeOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    BankOutlined,
    CheckOutlined,
    CloseOutlined,
    FileImageOutlined,
    FilterOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface TuitionConfig {
    pricePerCredit: number;
    paymentDeadline: number;
    lateFee: number;
    currentSemester: string;
}

interface StudentTuition {
    studentId: string;
    studentCode: string;
    fullName: string;
    totalCredits: number;
    totalAmount: number;
    amountPaid: number;
    remaining: number;
    status: string;
    dueDate: string;
}

interface Semester {
    semesterId: string;
    semesterName: string;
    academicYear: number;
}

interface PendingPayment {
    paymentId: number;
    tuitionId: number;
    studentId: string;
    studentCode: string;
    studentName: string;
    semesterName: string;
    amountSubmitted: number;
    paymentDate: string;
    evidenceFile: string;
    status: string;
    transactionId?: string;
}

interface PaymentHistory {
    paymentId: number;
    tuitionId: number;
    studentCode: string;
    studentName: string;
    semesterName: string;
    amountSubmitted: number;
    paymentDate: string;
    status: string;
    reviewNote: string;
    reviewedAt: string;
    reviewedBy: string;
}

const TuitionConfig: React.FC = () => {
    const [config, setConfig] = useState<TuitionConfig>({
        pricePerCredit: 300000,
        paymentDeadline: 30,
        lateFee: 0,
        currentSemester: ''
    });
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<StudentTuition[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [calculateModalVisible, setCalculateModalVisible] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [form] = Form.useForm();

    // Payment approval states
    const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
    const [reviewForm] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<string>('config');

    // Fetch tuition config
    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await api.get('/SystemConfigs/tuition-config');
            setConfig({
                pricePerCredit: parseFloat(response.data.pricePerCredit) || 300000,
                paymentDeadline: parseInt(response.data.paymentDeadline) || 30,
                lateFee: parseFloat(response.data.lateFee) || 0,
                currentSemester: response.data.currentSemester || ''
            });
            form.setFieldsValue({
                pricePerCredit: parseFloat(response.data.pricePerCredit) || 300000,
                paymentDeadline: parseInt(response.data.paymentDeadline) || 30,
                lateFee: parseFloat(response.data.lateFee) || 0
            });
        } catch (error: any) {
            console.error('Error fetching config:', error);
            message.error(error.response?.data?.message || 'Không thể tải cấu hình học phí');
        } finally {
            setLoading(false);
        }
    };

    // Update tuition config
    const handleUpdateConfig = async (values: any) => {
        setLoading(true);
        try {
            await api.put('/SystemConfigs/tuition-config', values);
            message.success('Cập nhật cấu hình học phí thành công');
            fetchConfig();
        } catch (error: any) {
            console.error('Error updating config:', error);
            message.error(error.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setLoading(false);
        }
    };

    // Fetch semesters
    const fetchSemesters = async () => {
        try {
            const response = await api.get('/Semesters');
            setSemesters(response.data || []);
            if (response.data?.length > 0 && !selectedSemester) {
                setSelectedSemester(response.data[0].semesterId);
            }
        } catch (error) {
            console.error('Error fetching semesters:', error);
            message.error('Không thể tải danh sách học kỳ');
        }
    };

    // Fetch student tuitions
    const fetchStudentTuitions = async () => {
        if (!selectedSemester) return;

        setStudentsLoading(true);
        try {
            const response = await api.get('/Tuitions', {
                params: { semesterId: selectedSemester }
            });

            const tuitionsData = response.data || [];
            const formattedStudents: StudentTuition[] = tuitionsData.map((tuition: any) => ({
                studentId: tuition.studentId,
                studentCode: tuition.studentCode || 'N/A',
                fullName: tuition.studentName || 'N/A',
                totalCredits: tuition.totalCredits || 0,
                totalAmount: tuition.amount || 0,
                amountPaid: tuition.amountPaid || 0,
                remaining: (tuition.amount || 0) - (tuition.amountPaid || 0),
                status: tuition.status || 'UNPAID',
                dueDate: tuition.dueDate
            }));

            setStudents(formattedStudents);
        } catch (error: any) {
            console.error('Error fetching tuitions:', error);
            if (error.response?.status === 500) {
                message.error('Lỗi server. Vui lòng kiểm tra backend API /api/Tuitions');
            } else {
                message.error(error.response?.data?.message || 'Không thể tải danh sách học phí');
            }
            setStudents([]);
        } finally {
            setStudentsLoading(false);
        }
    };

    // Fetch pending payments
    const fetchPendingPayments = async () => {
        setPendingLoading(true);
        try {
            const response = await api.get('/Tuitions/payments/pending');
            setPendingPayments(response.data || []);
        } catch (error: any) {
            console.error('Error fetching pending payments:', error);
            message.error('Không thể tải danh sách thanh toán chờ duyệt');
        } finally {
            setPendingLoading(false);
        }
    };

    // Fetch payment history
    const fetchPaymentHistory = async () => {
        setHistoryLoading(true);
        try {
            const response = await api.get('/Tuitions/payments/history');
            setPaymentHistory(response.data || []);
        } catch (error: any) {
            console.error('Error fetching payment history:', error);
            message.error('Không thể tải lịch sử thanh toán');
        } finally {
            setHistoryLoading(false);
        }
    };

    // Calculate tuition for a student
    const handleCalculateTuition = async (studentId: string) => {
        if (!selectedSemester) {
            message.warning('Vui lòng chọn học kỳ');
            return;
        }

        Modal.confirm({
            title: 'Tính học phí',
            content: 'Bạn có chắc chắn muốn tính học phí cho sinh viên này?',
            onOk: async () => {
                try {
                    await api.post(`/Tuitions/calculate/${studentId}/${selectedSemester}`);
                    message.success('Tính học phí thành công');
                    fetchStudentTuitions();
                } catch (error: any) {
                    console.error('Error calculating tuition:', error);
                    message.error(error.response?.data?.message || 'Tính học phí thất bại');
                }
            }
        });
    };

    // Calculate tuition for all students
    const handleCalculateAll = async () => {
        if (!selectedSemester) {
            message.warning('Vui lòng chọn học kỳ');
            return;
        }

        setCalculateModalVisible(false);
        setCalculating(true);

        try {
            const response = await api.post(`/Tuitions/calculate-batch/${selectedSemester}`);
            message.success(
                `Tính học phí thành công cho ${response.data.successCount}/${response.data.totalStudents} sinh viên`
            );
            fetchStudentTuitions();
        } catch (error: any) {
            console.error('Error calculating all:', error);
            message.error(error.response?.data?.message || 'Tính học phí thất bại');
        } finally {
            setCalculating(false);
        }
    };

    // Confirm or reject payment
    const handleReviewPayment = async (values: any) => {
        if (!selectedPayment) return;

        try {
            await api.put(`/Tuitions/payment/${selectedPayment.paymentId}/confirm`, {
                approved: values.approved,
                reviewNote: values.reviewNote
            });

            message.success(values.approved ? 'Đã xác nhận thanh toán' : 'Đã từ chối thanh toán');
            setReviewModalVisible(false);
            reviewForm.resetFields();
            fetchPendingPayments();
            fetchPaymentHistory();
            fetchStudentTuitions(); // Refresh student tuitions to update status
        } catch (error: any) {
            console.error('Error reviewing payment:', error);
            message.error(error.response?.data?.message || 'Xử lý thất bại');
        }
    };

    const getStatusTag = (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
            PAID: { color: 'green', text: 'Đã thanh toán' },
            PARTIAL: { color: 'orange', text: 'Thanh toán một phần' },
            UNPAID: { color: 'red', text: 'Chưa thanh toán' },
            OVERDUE: { color: 'red', text: 'Quá hạn' }
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
    };

    const getPaymentStatusTag = (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
            PENDING: { color: 'orange', text: 'Chờ duyệt' },
            APPROVED: { color: 'green', text: 'Đã duyệt' },
            REJECTED: { color: 'red', text: 'Từ chối' }
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
    };

    // Student tuition columns
    const tuitionColumns = [
        {
            title: 'Mã sinh viên',
            dataIndex: 'studentCode',
            key: 'studentCode',
            width: 120,
        },
        {
            title: 'Họ tên',
            dataIndex: 'fullName',
            key: 'fullName',
            width: 200,
        },
        {
            title: 'Tổng học phí',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: 150,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: '#f50' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: 'Đã thanh toán',
            dataIndex: 'amountPaid',
            key: 'amountPaid',
            width: 150,
            align: 'right' as const,
            render: (amount: number) => (
                <Text style={{ color: '#52c41a' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: 'Còn lại',
            dataIndex: 'remaining',
            key: 'remaining',
            width: 150,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: amount > 0 ? '#f50' : '#52c41a' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: 'Hạn thanh toán',
            dataIndex: 'dueDate',
            key: 'dueDate',
            width: 120,
            render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : 'Chưa có',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => getStatusTag(status),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            render: (_: any, record: StudentTuition) => (
                <Tooltip title="Tính học phí">
                    <Button
                        type="link"
                        icon={<CalculatorOutlined />}
                        onClick={() => handleCalculateTuition(record.studentId)}
                    >
                        Tính
                    </Button>
                </Tooltip>
            ),
        },
    ];

    // Pending payments columns
    const pendingColumns = [
        {
            title: 'Mã SV',
            dataIndex: 'studentCode',
            key: 'studentCode',
            width: 100,
        },
        {
            title: 'Họ tên SV',
            dataIndex: 'studentName',
            key: 'studentName',
            width: 150,
        },
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 150,
        },
        {
            title: 'Số tiền',
            dataIndex: 'amountSubmitted',
            key: 'amountSubmitted',
            width: 120,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: '#52c41a' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'paymentDate',
            key: 'paymentDate',
            width: 160,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Minh chứng',
            dataIndex: 'evidenceFile',
            key: 'evidenceFile',
            width: 100,
            render: (file: string) => file ? (
                <Image
                    src={file}
                    width={40}
                    height={40}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                    preview={{ mask: <FileImageOutlined /> }}
                />
            ) : 'Chưa có'
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            fixed: 'right' as const,
            render: (_: any, record: PendingPayment) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => {
                            setSelectedPayment(record);
                            reviewForm.setFieldsValue({ approved: true, reviewNote: '' });
                            setReviewModalVisible(true);
                        }}
                    >
                        Duyệt
                    </Button>
                    <Button
                        danger
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => {
                            setSelectedPayment(record);
                            reviewForm.setFieldsValue({ approved: false, reviewNote: '' });
                            setReviewModalVisible(true);
                        }}
                    >
                        Từ chối
                    </Button>
                </Space>
            ),
        },
    ];

    // Payment history columns
    const historyColumns = [
        {
            title: 'Mã SV',
            dataIndex: 'studentCode',
            key: 'studentCode',
            width: 100,
        },
        {
            title: 'Họ tên SV',
            dataIndex: 'studentName',
            key: 'studentName',
            width: 150,
        },
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 150,
        },
        {
            title: 'Số tiền',
            dataIndex: 'amountSubmitted',
            key: 'amountSubmitted',
            width: 120,
            align: 'right' as const,
            render: (amount: number) => (
                <Text strong style={{ color: '#52c41a' }}>
                    {amount?.toLocaleString('vi-VN') || 0}đ
                </Text>
            ),
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'paymentDate',
            key: 'paymentDate',
            width: 160,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => getPaymentStatusTag(status),
        },
        {
            title: 'Người duyệt',
            dataIndex: 'reviewedBy',
            key: 'reviewedBy',
            width: 100,
            render: (reviewer: string) => reviewer || 'Chưa duyệt',
        },
        {
            title: 'Ghi chú',
            dataIndex: 'reviewNote',
            key: 'reviewNote',
            width: 200,
            ellipsis: true,
        },
    ];

    const stats = {
        totalStudents: students.length,
        totalAmount: students.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
        totalPaid: students.reduce((sum, s) => sum + (s.amountPaid || 0), 0),
        totalRemaining: students.reduce((sum, s) => sum + (s.remaining || 0), 0),
        paidCount: students.filter(s => s.status === 'PAID').length,
        unpaidCount: students.filter(s => s.status !== 'PAID').length,
        pendingCount: pendingPayments.length,
    };

    useEffect(() => {
        fetchConfig();
        fetchSemesters();
        fetchPendingPayments();
        fetchPaymentHistory();
    }, []);

    useEffect(() => {
        if (selectedSemester) {
            fetchStudentTuitions();
        }
    }, [selectedSemester]);

    return (
        <div>
            <Title level={2}>Quản lý học phí</Title>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                {/* Tab 1: Cấu hình & Danh sách học phí */}
                <TabPane
                    tab={
                        <span>
                            <SettingOutlined />
                            Cấu hình & Học phí
                        </span>
                    }
                    key="config"
                >
                    {/* Tuition Configuration Card */}
                    <Card
                        title={
                            <Space>
                                <SettingOutlined />
                                <span>Cấu hình học phí</span>
                            </Space>
                        }
                        style={{ marginBottom: 24 }}
                    >
                        <Form
                            form={form}
                            layout="inline"
                            onFinish={handleUpdateConfig}
                            initialValues={config}
                        >
                            <Form.Item
                                name="pricePerCredit"
                                label="Giá mỗi tín chỉ"
                                rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
                            >
                                <InputNumber
                                    min={0}
                                    step={10000}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
                                    style={{ width: 200 }}
                                    prefix="₫"
                                />
                            </Form.Item>

                            <Form.Item
                                name="paymentDeadline"
                                label="Hạn thanh toán (ngày)"
                                rules={[{ required: true, message: 'Vui lòng nhập số ngày' }]}
                            >
                                <InputNumber
                                    min={1}
                                    max={90}
                                    style={{ width: 150 }}
                                />
                                <Text style={{ marginLeft: 8 }}>ngày</Text>
                            </Form.Item>

                            <Form.Item
                                name="lateFee"
                                label="Phí phạt trễ hạn"
                                rules={[{ required: true, message: 'Vui lòng nhập phí phạt' }]}
                            >
                                <InputNumber
                                    min={0}
                                    max={100}
                                    style={{ width: 120 }}
                                />
                                <Text style={{ marginLeft: 8 }}>%</Text>
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading}>
                                    Lưu cấu hình
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    {/* Statistics */}
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Tổng số sinh viên"
                                    value={stats.totalStudents}
                                    prefix={<EyeOutlined />}
                                    valueStyle={{ color: '#1890ff' }}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Tổng học phí"
                                    value={stats.totalAmount}
                                    prefix={<DollarOutlined />}
                                    suffix="đ"
                                    valueStyle={{ color: '#f50' }}
                                    formatter={(value) => (value as number).toLocaleString('vi-VN')}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Đã thanh toán"
                                    value={stats.totalPaid}
                                    prefix={<CheckCircleOutlined />}
                                    suffix="đ"
                                    valueStyle={{ color: '#52c41a' }}
                                    formatter={(value) => (value as number).toLocaleString('vi-VN')}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Còn nợ"
                                    value={stats.totalRemaining}
                                    prefix={<WarningOutlined />}
                                    suffix="đ"
                                    valueStyle={{ color: stats.totalRemaining > 0 ? '#f50' : '#52c41a' }}
                                    formatter={(value) => (value as number).toLocaleString('vi-VN')}
                                />
                            </Card>
                        </Col>
                    </Row>

                    {/* Student Tuition List */}
                    <Card
                        title={<Space><BankOutlined />Danh sách học phí sinh viên</Space>}
                        extra={
                            <Space>
                                <Select
                                    style={{ width: 220 }}
                                    value={selectedSemester}
                                    onChange={setSelectedSemester}
                                    placeholder="Chọn học kỳ"
                                    loading={semesters.length === 0}
                                >
                                    {semesters.map((sem: Semester) => (
                                        <Option key={sem.semesterId} value={sem.semesterId}>
                                            {sem.semesterName} ({sem.academicYear})
                                        </Option>
                                    ))}
                                </Select>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={fetchStudentTuitions}
                                >
                                    Làm mới
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<CalculatorOutlined />}
                                    onClick={() => setCalculateModalVisible(true)}
                                >
                                    Tính học phí tất cả
                                </Button>
                            </Space>
                        }
                    >
                        <Spin spinning={studentsLoading}>
                            {students.length === 0 && !studentsLoading ? (
                                <Alert
                                    message="Không có dữ liệu"
                                    description="Chưa có học phí nào cho học kỳ này. Hãy nhấn 'Tính học phí tất cả' để tạo học phí cho sinh viên."
                                    type="info"
                                    showIcon
                                />
                            ) : (
                                <Table
                                    columns={tuitionColumns}
                                    dataSource={students}
                                    rowKey="studentId"
                                    scroll={{ x: 1200 }}
                                    pagination={{
                                        showSizeChanger: true,
                                        showTotal: (total) => `Tổng số ${total} sinh viên`,
                                        pageSizeOptions: ['10', '20', '50'],
                                        defaultPageSize: 10
                                    }}
                                />
                            )}
                        </Spin>
                    </Card>
                </TabPane>

                {/* Tab 2: Duyệt thanh toán */}
                <TabPane
                    tab={
                        <span>
                            <CheckCircleOutlined />
                            Duyệt thanh toán
                            {stats.pendingCount > 0 && (
                                <Tag color="orange" style={{ marginLeft: 8 }}>{stats.pendingCount}</Tag>
                            )}
                        </span>
                    }
                    key="approval"
                >
                    <Card
                        title={
                            <Space>
                                <CheckCircleOutlined />
                                <span>Xác nhận thanh toán từ sinh viên</span>
                            </Space>
                        }
                        extra={
                            <Button icon={<ReloadOutlined />} onClick={fetchPendingPayments}>
                                Làm mới
                            </Button>
                        }
                    >
                        <Spin spinning={pendingLoading}>
                            {pendingPayments.length === 0 && !pendingLoading ? (
                                <Alert
                                    message="Không có yêu cầu nào"
                                    description="Hiện không có yêu cầu thanh toán nào đang chờ duyệt."
                                    type="info"
                                    showIcon
                                />
                            ) : (
                                <Table
                                    columns={pendingColumns}
                                    dataSource={pendingPayments}
                                    rowKey="paymentId"
                                    scroll={{ x: 1100 }}
                                    pagination={{
                                        showSizeChanger: true,
                                        showTotal: (total) => `Tổng số ${total} yêu cầu`,
                                        pageSizeOptions: ['10', '20', '50'],
                                        defaultPageSize: 10
                                    }}
                                />
                            )}
                        </Spin>
                    </Card>
                </TabPane>

                {/* Tab 3: Lịch sử thanh toán */}
                <TabPane
                    tab={
                        <span>
                            <HistoryOutlined />
                            Lịch sử thanh toán
                        </span>
                    }
                    key="history"
                >
                    <Card
                        title="Lịch sử xử lý thanh toán"
                        extra={
                            <Space>
                                <Select
                                    style={{ width: 150 }}
                                    value={filterStatus}
                                    onChange={setFilterStatus}
                                    suffixIcon={<FilterOutlined />}
                                >
                                    <Option value="all">Tất cả</Option>
                                    <Option value="APPROVED">Đã duyệt</Option>
                                    <Option value="REJECTED">Từ chối</Option>
                                    <Option value="PENDING">Chờ duyệt</Option>
                                </Select>
                                <Button icon={<ReloadOutlined />} onClick={fetchPaymentHistory}>
                                    Làm mới
                                </Button>
                            </Space>
                        }
                    >
                        <Spin spinning={historyLoading}>
                            <Table
                                columns={historyColumns}
                                dataSource={paymentHistory.filter(p =>
                                    filterStatus === 'all' || p.status === filterStatus
                                )}
                                rowKey="paymentId"
                                scroll={{ x: 1200 }}
                                pagination={{
                                    showSizeChanger: true,
                                    showTotal: (total) => `Tổng số ${total} giao dịch`,
                                    pageSizeOptions: ['10', '20', '50'],
                                    defaultPageSize: 10
                                }}
                            />
                        </Spin>
                    </Card>
                </TabPane>
            </Tabs>

            {/* Calculate All Modal */}
            <Modal
                title="Xác nhận tính học phí"
                open={calculateModalVisible}
                onOk={handleCalculateAll}
                onCancel={() => setCalculateModalVisible(false)}
                confirmLoading={calculating}
                okText="Tính học phí"
                cancelText="Hủy"
            >
                <Alert
                    message="Xác nhận tính học phí"
                    description={`Bạn có chắc chắn muốn tính học phí cho tất cả sinh viên trong học kỳ ${semesters.find(s => s.semesterId === selectedSemester)?.semesterName || selectedSemester}?`}
                    type="warning"
                    showIcon
                />
                <Divider />
                <Text type="secondary">
                    Học phí sẽ được tính dựa trên tổng số tín chỉ các môn đã đăng ký và được duyệt.
                    Giá mỗi tín chỉ: {config.pricePerCredit.toLocaleString('vi-VN')}đ
                </Text>
            </Modal>

            {/* Review Payment Modal */}
            <Modal
                title={
                    <Space>
                        {reviewForm.getFieldValue('approved') ? (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        ) : (
                            <CloseOutlined style={{ color: '#ff4d4f' }} />
                        )}
                        <span>
                            {reviewForm.getFieldValue('approved') ? 'Xác nhận thanh toán' : 'Từ chối thanh toán'}
                        </span>
                    </Space>
                }
                open={reviewModalVisible}
                onCancel={() => {
                    setReviewModalVisible(false);
                    reviewForm.resetFields();
                }}
                footer={null}
                width={500}
            >
                {selectedPayment && (
                    <>
                        <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Mã sinh viên" span={2}>
                                {selectedPayment.studentCode}
                            </Descriptions.Item>
                            <Descriptions.Item label="Họ tên" span={2}>
                                {selectedPayment.studentName}
                            </Descriptions.Item>
                            <Descriptions.Item label="Học kỳ" span={2}>
                                {selectedPayment.semesterName}
                            </Descriptions.Item>
                            <Descriptions.Item label="Số tiền">
                                <Text strong style={{ color: '#52c41a' }}>
                                    {selectedPayment.amountSubmitted.toLocaleString('vi-VN')}đ
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày gửi">
                                {dayjs(selectedPayment.paymentDate).format('DD/MM/YYYY HH:mm')}
                            </Descriptions.Item>
                        </Descriptions>

                        {selectedPayment.evidenceFile && (
                            <div style={{ marginBottom: 16, textAlign: 'center' }}>
                                <Text type="secondary">Minh chứng thanh toán:</Text>
                                <div style={{ marginTop: 8 }}>
                                    <Image
                                        src={selectedPayment.evidenceFile}
                                        width="100%"
                                        style={{ maxWidth: 300 }}
                                        alt="Evidence"
                                    />
                                </div>
                            </div>
                        )}

                        <Form form={reviewForm} onFinish={handleReviewPayment} layout="vertical">
                            <Form.Item
                                name="approved"
                                hidden
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item
                                name="reviewNote"
                                label="Ghi chú"
                                rules={[{ required: true, message: 'Vui lòng nhập ghi chú' }]}
                            >
                                <Input.TextArea
                                    rows={3}
                                    placeholder={reviewForm.getFieldValue('approved')
                                        ? 'Nhập ghi chú xác nhận thanh toán...'
                                        : 'Nhập lý do từ chối...'}
                                />
                            </Form.Item>

                            <Form.Item>
                                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                    <Button onClick={() => setReviewModalVisible(false)}>
                                        Hủy
                                    </Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        danger={!reviewForm.getFieldValue('approved')}
                                        icon={reviewForm.getFieldValue('approved') ? <CheckOutlined /> : <CloseOutlined />}
                                    >
                                        {reviewForm.getFieldValue('approved') ? 'Xác nhận' : 'Từ chối'}
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default TuitionConfig;