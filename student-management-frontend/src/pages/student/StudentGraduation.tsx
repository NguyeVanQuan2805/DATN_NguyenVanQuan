// pages/student/StudentGraduation.tsx
import React, { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Form,
    Select,
    message,
    Spin,
    Descriptions,
    Tag,
    Space,
    Row,
    Col,
    Statistic,
    Alert,
    Table,
    Modal,
    Progress
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DollarOutlined,
    BookOutlined,
    SendOutlined,
    EyeOutlined,
    WarningOutlined,
    TrophyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAcademicSummary, getGpaColor, getGpaClassification } from '../../hooks/useAcademicSummary';

interface GraduationRequest {
    requestId: number;
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

const StudentGraduation: React.FC = () => {
    const { user } = useAuth();

    // 🔥 DÙNG HOOK MỚI - NGUỒN DỮ LIỆU DUY NHẤT
    const { data: summary, loading: summaryLoading, refresh: refreshSummary } = useAcademicSummary({ autoFetch: true });

    const [requests, setRequests] = useState<GraduationRequest[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<GraduationRequest | null>(null);
    const [loadingRequests, setLoadingRequests] = useState(false);

    // Fetch học kỳ mở đăng ký
    const fetchSemesters = async () => {
        try {
            const response = await api.get('/Semesters');
            const now = dayjs();
            const validSemesters = response.data.filter((s: any) => {
                const semesterEnd = dayjs(s.endDate);
                return s.isRegistrationOpen === true && semesterEnd.isAfter(now.subtract(1, 'month'));
            });
            validSemesters.sort((a: any, b: any) => dayjs(a.startDate).unix() - dayjs(b.startDate).unix());
            setSemesters(validSemesters);
        } catch (error) {
            console.error('Error fetching semesters:', error);
        }
    };

    const fetchMyRequests = async () => {
        setLoadingRequests(true);
        try {
            const response = await api.get('/GraduationRequests/my');
            setRequests(response.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        if (user?.studentId) {
            fetchSemesters();
            fetchMyRequests();
        }
    }, [user]);

    const handleSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            await api.post('/GraduationRequests', values);
            message.success('Đã gửi yêu cầu xét tốt nghiệp thành công');
            form.resetFields();
            await Promise.all([fetchMyRequests(), refreshSummary()]);
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.response?.data?.title || 'Có lỗi xảy ra';
            message.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewDetail = (record: GraduationRequest) => {
        setSelectedRequest(record);
        setDetailVisible(true);
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

    // 🔥 DỮ LIỆU TỪ SUMMARY - ƯU TIÊN DÙNG GIÁ TRỊ ĐÃ ĐƯỢC LÀM TRÒN TỪ API
    const isEligible = summary?.isEligibleToGraduate || false;
    const totalCreditsEarned = summary?.completedCredits || 0;
    const requiredCredits = summary?.totalCreditsRequired || 120;
    const cumulativeGpa = summary?.cumulativeGpa || 0;
    const tuitionDebt = summary?.tuitionDebt || 0;
    const mandatoryCompleted = summary?.mandatorySubjectsCompleted || false;
    const graduationIssues = summary?.graduationIssues || [];
    const missingCredits = summary?.remainingCredits || 0;
    const gpaColor = getGpaColor(cumulativeGpa);
    const gpaClassification = getGpaClassification(cumulativeGpa);

    // 🔥 SỬA: DÙNG progressPercentage TỪ API THAY VÌ TỰ TÍNH LẠI
    // progressPercentage đã được làm tròn từ backend (97.67 thay vì 97.67441860465115)
    const progressPercentage = summary?.progressPercentage || 0;

    // 🔥 HOẶC tự tính và làm tròn nếu API chưa trả về
    const displayProgress = progressPercentage > 0
        ? progressPercentage
        : Math.round((totalCreditsEarned / requiredCredits) * 100);

    const columns = [
        {
            title: 'Học kỳ',
            dataIndex: 'semesterName',
            key: 'semesterName',
            width: 150,
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'submittedAt',
            key: 'submittedAt',
            width: 120,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
        },
        {
            title: 'Tích lũy',
            key: 'credits',
            width: 100,
            render: (_: any, record: GraduationRequest) => `${record.totalCreditsEarned} TC`,
        },
        {
            title: 'GPA',
            dataIndex: 'cumulativeGpa',
            key: 'cumulativeGpa',
            width: 80,
            render: (gpa: number) => gpa.toFixed(2),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
            ),
        },
        {
            title: '',
            key: 'action',
            width: 80,
            render: (_: any, record: GraduationRequest) => (
                <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(record)}
                />
            ),
        },
    ];

    const isLoading = summaryLoading || loadingRequests;

    return (
        <div>
            {/* Card điều kiện tốt nghiệp - GIỮ NGUYÊN UI CŨ */}
            <Card title="Điều kiện tốt nghiệp" style={{ marginBottom: 24 }}>
                <Spin spinning={isLoading}>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Statistic
                                title="Tích lũy tín chỉ"
                                value={totalCreditsEarned}
                                suffix={`/ ${requiredCredits}`}
                                prefix={<BookOutlined />}
                                valueStyle={{
                                    color: totalCreditsEarned >= requiredCredits ? '#52c41a' : '#ff4d4f'
                                }}
                            />
                            <Progress
                                percent={displayProgress}
                                size="small"
                                strokeColor={totalCreditsEarned >= requiredCredits ? '#52c41a' : '#1890ff'}
                                style={{ marginTop: 8 }}
                                format={(percent) => `${percent?.toFixed(1)}%`}
                            />
                        </Col>
                        <Col span={6}>
                            <Statistic
                                title="GPA tích lũy"
                                value={cumulativeGpa.toFixed(2)}
                                suffix={`(Yêu cầu ≥ 2.0)`}
                                valueStyle={{
                                    color: cumulativeGpa >= 2.0 ? '#52c41a' : '#ff4d4f'
                                }}
                            />
                            <Tag color={gpaColor} style={{ marginTop: 8 }}>
                                {gpaClassification}
                            </Tag>
                        </Col>
                        <Col span={6}>
                            <Statistic
                                title="Công nợ học phí"
                                value={tuitionDebt.toLocaleString('vi-VN') || 0}
                                suffix="đ"
                                prefix={<DollarOutlined />}
                                valueStyle={{ color: tuitionDebt === 0 ? '#52c41a' : '#ff4d4f' }}
                            />
                        </Col>
                        <Col span={6}>
                            <Statistic
                                title="Môn bắt buộc"
                                value={mandatoryCompleted ? "Đã hoàn thành" : "Chưa hoàn thành"}
                                prefix={mandatoryCompleted ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                valueStyle={{ color: mandatoryCompleted ? '#52c41a' : '#ff4d4f' }}
                            />
                        </Col>
                    </Row>

                    {/* Hiển thị lỗi khi chưa đủ điều kiện */}
                    {graduationIssues.length > 0 && (
                        <Alert
                            message="Chưa đủ điều kiện tốt nghiệp"
                            description={
                                <ul style={{ marginBottom: 0, marginTop: 8 }}>
                                    {graduationIssues.map((issue, index) => (
                                        <li key={index}>{issue}</li>
                                    ))}
                                </ul>
                            }
                            type="warning"
                            showIcon
                            icon={<WarningOutlined />}
                            style={{ marginTop: 16 }}
                        />
                    )}

                    {/* Thông báo khi đủ điều kiện */}
                    {isEligible && (
                        <Alert
                            message="✅ Bạn đã đủ điều kiện tốt nghiệp!"
                            description="Bạn có thể đăng ký xét tốt nghiệp. Vui lòng chọn đợt xét phù hợp bên dưới."
                            type="success"
                            showIcon
                            style={{ marginTop: 16 }}
                        />
                    )}
                </Spin>
            </Card>

            {/* Đăng ký xét tốt nghiệp - Chỉ hiển thị khi đủ điều kiện */}
            {isEligible && semesters.length > 0 && (
                <Card title="Đăng ký xét tốt nghiệp" style={{ marginBottom: 24 }}>
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item
                            name="semesterId"
                            label="Chọn đợt xét tốt nghiệp"
                            rules={[{ required: true, message: 'Vui lòng chọn học kỳ' }]}
                            help="Chọn đợt xét tốt nghiệp bạn muốn đăng ký. Chỉ hiển thị các đợt đang mở."
                        >
                            <Select
                                placeholder="Chọn đợt xét tốt nghiệp"
                                size="large"
                            >
                                {semesters.map(s => (
                                    <Select.Option key={s.semesterId} value={s.semesterId}>
                                        {s.semesterName}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SendOutlined />}
                                loading={submitting}
                                size="large"
                            >
                                Gửi yêu cầu xét tốt nghiệp
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            )}

            {/* Thông báo khi đủ điều kiện nhưng không có học kỳ mở */}
            {isEligible && semesters.length === 0 && (
                <Alert
                    message="Hiện chưa có đợt xét tốt nghiệp nào đang mở"
                    description="Vui lòng quay lại sau khi có thông báo đợt xét tốt nghiệp mới từ phòng đào tạo."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
            )}

            {/* Lịch sử yêu cầu */}
            <Card title="Lịch sử yêu cầu">
                <Table
                    columns={columns}
                    dataSource={requests}
                    rowKey="requestId"
                    pagination={false}
                    loading={loadingRequests}
                    locale={{ emptyText: 'Chưa có yêu cầu nào' }}
                />
            </Card>

            {/* Modal chi tiết */}
            <Modal
                title="Chi tiết yêu cầu tốt nghiệp"
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailVisible(false)}>
                        Đóng
                    </Button>
                ]}
                width={600}
            >
                {selectedRequest && (
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="Học kỳ">
                            {selectedRequest.semesterName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày gửi">
                            {dayjs(selectedRequest.submittedAt).format('DD/MM/YYYY HH:mm')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tổng tín chỉ tích lũy">
                            {selectedRequest.totalCreditsEarned} TC
                        </Descriptions.Item>
                        <Descriptions.Item label="GPA tích lũy">
                            {selectedRequest.cumulativeGpa.toFixed(2)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Công nợ học phí">
                            <span style={{ color: selectedRequest.tuitionDebt > 0 ? '#ff4d4f' : '#52c41a' }}>
                                {selectedRequest.tuitionDebt.toLocaleString('vi-VN')}đ
                            </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={getStatusColor(selectedRequest.status)}>
                                {getStatusText(selectedRequest.status)}
                            </Tag>
                        </Descriptions.Item>
                        {selectedRequest.reviewedBy && (
                            <>
                                <Descriptions.Item label="Người duyệt">
                                    {selectedRequest.reviewedBy}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngày duyệt">
                                    {dayjs(selectedRequest.reviewedAt).format('DD/MM/YYYY HH:mm')}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ghi chú">
                                    {selectedRequest.reviewNote || 'Không có'}
                                </Descriptions.Item>
                            </>
                        )}
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default StudentGraduation;