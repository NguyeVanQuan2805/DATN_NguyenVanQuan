import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Space,
    message,
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
    Tabs,
    Timeline,
    Alert,
    ConfigProvider,
    Typography,
} from 'antd';
import {
    ReloadOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    FileDoneOutlined,
    TeamOutlined,
    DollarOutlined,
    TrophyOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title, Text } = Typography;

interface GraduationRequest {
    requestId: number;
    studentId: string;
    studentCode: string;
    studentName: string;
    semesterId: string;
    semesterName: string;
    submittedAt: string;
    totalCreditsEarned: number;
    cumulativeGpa: number;
    tuitionDebt: number;
    mandatoryDone: boolean;
    status: string;
    reviewedBy: string;
    reviewedAt: string;
    reviewNote: string;
}

interface Statistics {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    averageGpa: number;
    bySemester: Array<{
        semesterId: string;
        total: number;
        approved: number;
    }>;
}

const GraduationManagement: React.FC = () => {
    const [requests, setRequests] = useState<GraduationRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<GraduationRequest | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewForm] = Form.useForm();
    const [stats, setStats] = useState<Statistics | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>();
    const [filterSemester, setFilterSemester] = useState<string>();
    const [semesters, setSemesters] = useState<any[]>([]);

    useEffect(() => {
        fetchRequests();
        fetchStatistics();
        fetchSemesters();
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [filterStatus, filterSemester]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterStatus) params.status = filterStatus;
            if (filterSemester) params.semesterId = filterSemester;

            const response = await api.get('/Graduation/requests', { params });
            setRequests(response.data);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể tải danh sách yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            const response = await api.get('/Graduation/statistics');
            setStats(response.data);
        } catch (error: any) {
            console.error('Error fetching statistics:', error);
        }
    };

    const fetchSemesters = async () => {
        try {
            const response = await api.get('/Semesters');
            setSemesters(response.data);
        } catch (error) {
            console.error('Error fetching semesters:', error);
        }
    };

    const handleViewDetail = (record: GraduationRequest) => {
        setSelectedRequest(record);
        setDetailVisible(true);
    };

    const handleReview = (record: GraduationRequest) => {
        setSelectedRequest(record);
        reviewForm.resetFields();
        setReviewModalVisible(true);
    };

    const handleSubmitReview = async (values: any) => {
        try {
            await api.put(`/Graduation/requests/${selectedRequest?.requestId}/review`, values);
            message.success(values.approved ? 'Đã duyệt yêu cầu tốt nghiệp' : 'Đã từ chối yêu cầu tốt nghiệp');
            setReviewModalVisible(false);
            fetchRequests();
            fetchStatistics();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'orange';
            case 'APPROVED': return 'green';
            case 'REJECTED': return 'red';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING': return 'Chờ duyệt';
            case 'APPROVED': return 'Đã duyệt';
            case 'REJECTED': return 'Từ chối';
            default: return status;
        }
    };

    const columns: ColumnsType<GraduationRequest> = [
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Mã SV</span>,
            dataIndex: 'studentCode',
            key: 'studentCode',
            width: 120,
            render: (code: string) => <Text strong style={{ fontSize: '14px', color: '#1677ff' }}>{code}</Text>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Họ tên</span>,
            dataIndex: 'studentName',
            key: 'studentName',
            width: 180,
            render: (name: string) => <span style={{ fontSize: '14px' }}>{name}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Học kỳ</span>,
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 140,
            render: (semester: string) => <Tag color="geekblue" style={{ fontSize: '13px', padding: '4px 12px' }}>{semester}</Tag>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Tích lũy</span>,
            key: 'credits',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <Tooltip title={`Tín chỉ: ${record.totalCreditsEarned}`}>
                    <Badge
                        count={`${record.totalCreditsEarned} TC`}
                        style={{ backgroundColor: '#1890ff', fontSize: '12px' }}
                    />
                </Tooltip>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>GPA</span>,
            dataIndex: 'cumulativeGpa',
            key: 'cumulativeGpa',
            width: 100,
            align: 'center',
            render: (gpa) => (
                <Tag color={gpa >= 3.2 ? 'green' : gpa >= 2.5 ? 'orange' : 'red'} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {gpa.toFixed(2)}
                </Tag>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Công nợ</span>,
            dataIndex: 'tuitionDebt',
            key: 'tuitionDebt',
            width: 140,
            align: 'right',
            render: (debt) => (
                <span style={{ color: debt > 0 ? '#ff4d4f' : '#52c41a', fontSize: '14px', fontWeight: 500 }}>
                    {debt.toLocaleString('vi-VN')}đ
                </span>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Trạng thái</span>,
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center',
            render: (status) => (
                <Tag color={getStatusColor(status)} style={{ fontSize: '13px', padding: '4px 12px' }}>
                    {getStatusText(status)}
                </Tag>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Ngày gửi</span>,
            dataIndex: 'submittedAt',
            key: 'submittedAt',
            width: 130,
            render: (date) => <span style={{ fontSize: '14px' }}>{dayjs(date).format('DD/MM/YYYY')}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Thao tác</span>,
            key: 'action',
            width: 140,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="link"
                            size="middle"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetail(record)}
                            style={{ fontSize: '14px' }}
                        />
                    </Tooltip>
                    {record.status === 'PENDING' && (
                        <Tooltip title="Xét duyệt">
                            <Button
                                type="link"
                                size="middle"
                                icon={<FileDoneOutlined />}
                                onClick={() => handleReview(record)}
                                style={{ color: '#1890ff', fontSize: '14px' }}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <ConfigProvider
            theme={{
                token: {
                    fontSize: 14,
                },
            }}
        >
            <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                    borderRadius: 12,
                    padding: '24px 28px',
                    marginBottom: 24,
                    boxShadow: '0 4px 20px rgba(22,119,255,0.25)',
                }}>
                    <Title level={2} style={{ color: '#fff', margin: 0, fontSize: '28px' }}>
                        <FileDoneOutlined style={{ marginRight: 12, fontSize: '28px' }} />
                        Quản lý đăng ký tốt nghiệp
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: 8, display: 'block' }}>
                        Quản lý và xét duyệt yêu cầu tốt nghiệp của sinh viên
                    </Text>
                </div>

                {/* Statistics Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Statistic
                                title={<span style={{ fontSize: '14px' }}>Tổng yêu cầu</span>}
                                value={stats?.totalRequests || 0}
                                prefix={<FileDoneOutlined style={{ fontSize: '22px' }} />}
                                valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Statistic
                                title={<span style={{ fontSize: '14px' }}>Chờ duyệt</span>}
                                value={stats?.pendingRequests || 0}
                                prefix={<ClockCircleOutlined style={{ fontSize: '22px' }} />}
                                valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Statistic
                                title={<span style={{ fontSize: '14px' }}>Đã duyệt</span>}
                                value={stats?.approvedRequests || 0}
                                prefix={<CheckCircleOutlined style={{ fontSize: '22px' }} />}
                                valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Statistic
                                title={<span style={{ fontSize: '14px' }}>GPA trung bình</span>}
                                value={stats?.averageGpa.toFixed(2) || 0}
                                prefix={<TrophyOutlined style={{ fontSize: '22px' }} />}
                                valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Main Table */}
                <Card
                    style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
                    title={<span style={{ fontSize: '16px', fontWeight: 600 }}>Danh sách yêu cầu tốt nghiệp</span>}
                    extra={
                        <Space size="middle">
                            <Select
                                placeholder="Lọc theo trạng thái"
                                allowClear
                                style={{ width: 140 }}
                                onChange={setFilterStatus}
                                size="large"
                                options={[
                                    { label: 'Chờ duyệt', value: 'PENDING' },
                                    { label: 'Đã duyệt', value: 'APPROVED' },
                                    { label: 'Từ chối', value: 'REJECTED' },
                                ]}
                            />
                            <Select
                                placeholder="Lọc theo học kỳ"
                                allowClear
                                style={{ width: 160 }}
                                onChange={setFilterSemester}
                                size="large"
                                options={semesters.map(s => ({
                                    label: s.semesterName,
                                    value: s.semesterId
                                }))}
                            />
                            <Button icon={<ReloadOutlined />} onClick={fetchRequests} size="large">
                                Làm mới
                            </Button>
                        </Space>
                    }
                >
                    <Table
                        columns={columns}
                        dataSource={requests}
                        rowKey="requestId"
                        loading={loading}
                        scroll={{ x: 1300 }}
                        size="middle"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => <span style={{ fontSize: '14px' }}>Tổng số {total} yêu cầu</span>,
                        }}
                    />
                </Card>

                {/* Detail Modal */}
                <Modal
                    title={<span style={{ fontSize: '18px', fontWeight: 600 }}>Chi tiết yêu cầu tốt nghiệp</span>}
                    open={detailVisible}
                    onCancel={() => setDetailVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setDetailVisible(false)} size="large">
                            Đóng
                        </Button>
                    ]}
                    width={800}
                    styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
                >
                    {selectedRequest && (
                        <Spin spinning={loading}>
                            <Descriptions bordered column={2} size="middle">
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Mã sinh viên</span>} span={2}>
                                    <Text strong style={{ fontSize: '15px', color: '#1677ff' }}>{selectedRequest.studentCode}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Họ tên</span>} span={2}>
                                    <span style={{ fontSize: '15px' }}>{selectedRequest.studentName}</span>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Học kỳ đăng ký</span>}>
                                    <span style={{ fontSize: '14px' }}>{selectedRequest.semesterName}</span>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Ngày gửi</span>}>
                                    <span style={{ fontSize: '14px' }}>{dayjs(selectedRequest.submittedAt).format('DD/MM/YYYY HH:mm')}</span>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Tổng tín chỉ tích lũy</span>}>
                                    <Badge
                                        count={`${selectedRequest.totalCreditsEarned} TC`}
                                        style={{ backgroundColor: '#1890ff', fontSize: '12px' }}
                                    />
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>GPA tích lũy</span>}>
                                    <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                                        {selectedRequest.cumulativeGpa.toFixed(2)}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Công nợ học phí</span>}>
                                    <span style={{
                                        color: selectedRequest.tuitionDebt > 0 ? '#ff4d4f' : '#52c41a',
                                        fontSize: '15px',
                                        fontWeight: 500
                                    }}>
                                        {selectedRequest.tuitionDebt.toLocaleString('vi-VN')}đ
                                    </span>
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Hoàn thành môn bắt buộc</span>}>
                                    {selectedRequest.mandatoryDone ? (
                                        <Tag color="green" style={{ fontSize: '13px', padding: '4px 12px' }}>Đã hoàn thành</Tag>
                                    ) : (
                                        <Tag color="red" style={{ fontSize: '13px', padding: '4px 12px' }}>Chưa hoàn thành</Tag>
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Trạng thái</span>}>
                                    <Tag color={getStatusColor(selectedRequest.status)} style={{ fontSize: '13px', padding: '4px 12px' }}>
                                        {getStatusText(selectedRequest.status)}
                                    </Tag>
                                </Descriptions.Item>
                                {selectedRequest.reviewedBy && (
                                    <>
                                        <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Người duyệt</span>}>
                                            <span style={{ fontSize: '14px' }}>{selectedRequest.reviewedBy}</span>
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Ngày duyệt</span>}>
                                            <span style={{ fontSize: '14px' }}>{dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}</span>
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Ghi chú</span>} span={2}>
                                            <span style={{ fontSize: '14px' }}>{selectedRequest.reviewNote || 'Không có'}</span>
                                        </Descriptions.Item>
                                    </>
                                )}
                            </Descriptions>
                        </Spin>
                    )}
                </Modal>

                {/* Review Modal */}
                <Modal
                    title={<span style={{ fontSize: '18px', fontWeight: 600 }}>Xét duyệt yêu cầu tốt nghiệp</span>}
                    open={reviewModalVisible}
                    onCancel={() => setReviewModalVisible(false)}
                    footer={null}
                    width={550}
                    styles={{ body: { padding: '24px' } }}
                >
                    <Form form={reviewForm} layout="vertical" onFinish={handleSubmitReview}>
                        <Alert
                            message={<span style={{ fontSize: '14px', fontWeight: 500 }}>Thông tin sinh viên</span>}
                            description={
                                <div style={{ marginTop: 12 }}>
                                    <p><strong style={{ fontSize: '14px' }}>Mã SV:</strong> <span style={{ fontSize: '14px' }}>{selectedRequest?.studentCode}</span></p>
                                    <p><strong style={{ fontSize: '14px' }}>Họ tên:</strong> <span style={{ fontSize: '14px' }}>{selectedRequest?.studentName}</span></p>
                                    <p><strong style={{ fontSize: '14px' }}>GPA:</strong> <span style={{ fontSize: '14px', fontWeight: 500 }}>{selectedRequest?.cumulativeGpa.toFixed(2)}</span></p>
                                    <p><strong style={{ fontSize: '14px' }}>Tích lũy:</strong> <span style={{ fontSize: '14px', fontWeight: 500 }}>{selectedRequest?.totalCreditsEarned} TC</span></p>
                                </div>
                            }
                            type="info"
                            showIcon
                            style={{ marginBottom: 20 }}
                        />

                        <Form.Item
                            name="approved"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Quyết định</span>}
                            rules={[{ required: true, message: 'Vui lòng chọn quyết định' }]}
                        >
                            <Select size="large">
                                <Select.Option value={true}>
                                    <Space>
                                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                        <span style={{ fontSize: '14px' }}>Duyệt tốt nghiệp</span>
                                    </Space>
                                </Select.Option>
                                <Select.Option value={false}>
                                    <Space>
                                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                                        <span style={{ fontSize: '14px' }}>Từ chối</span>
                                    </Space>
                                </Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="reviewNote"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Ghi chú</span>}
                        >
                            <Input.TextArea rows={4} placeholder="Nhập ghi chú (nếu có)" style={{ fontSize: '14px' }} />
                        </Form.Item>

                        <Form.Item>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }} size="middle">
                                <Button onClick={() => setReviewModalVisible(false)} size="large">
                                    Hủy
                                </Button>
                                <Button type="primary" htmlType="submit" size="large">
                                    Xác nhận
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </ConfigProvider>
    );
};

export default GraduationManagement;