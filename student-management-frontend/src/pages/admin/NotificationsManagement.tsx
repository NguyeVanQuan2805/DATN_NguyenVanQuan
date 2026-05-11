import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Switch,
    Space,
    message,
    Tag,
    Tabs,
    Tooltip,
    Badge,
    Popconfirm,
    Typography,
    Row,
    Col,
    Statistic
} from 'antd';
import {
    PlusOutlined,
    SendOutlined,
    EyeOutlined,
    DeleteOutlined,
    NotificationOutlined,
    MailOutlined,
    TeamOutlined,
    UserOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph } = Typography;

interface Notification {
    notificationId: number;
    title: string;
    content: string;
    notificationType: string;
    targetScope: string;
    targetClassId?: number;
    sendEmail: boolean;
    createdAt: string;
    sentAt: string;
    recipientCount?: number;
    readCount?: number;
}

interface AdvisorClass {
    advisorClassId: number;
    classCode: string;
    className: string;
    studentCount: number;
}

const NotificationsManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [classes, setClasses] = useState<AdvisorClass[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [targetScope, setTargetScope] = useState('ALL');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

    // Fetch danh sách thông báo đã gửi
    const fetchNotifications = async (page = 1, pageSize = 20) => {
        setLoading(true);
        try {
            const response = await api.get('/notifications/sent', {
                params: { page, pageSize }
            });
            setNotifications(response.data.notifications);
            setPagination({
                current: response.data.page,
                pageSize: response.data.pageSize,
                total: response.data.total
            });
        } catch (error) {
            message.error('Không thể tải danh sách thông báo');
        } finally {
            setLoading(false);
        }
    };

    // Fetch danh sách lớp để gửi thông báo theo lớp
    const fetchClasses = async () => {
        try {
            const response = await api.get('/notifications/classes');
            setClasses(response.data);
        } catch (error) {
            console.error('Lỗi tải danh sách lớp:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        fetchClasses();
    }, []);

    // Gửi thông báo mới
    const handleSendNotification = async (values: any) => {
        try {
            const payload = {
                title: values.title,
                content: values.content,
                notificationType: values.notificationType || 'SYSTEM',
                targetScope: values.targetScope,
                targetClassId: values.targetScope === 'CLASS' ? values.targetClassId : null,
                sendEmail: values.sendEmail || false
            };

            const response = await api.post('/notifications', payload);
            message.success(`Đã gửi thông báo thành công! (${response.data.recipientCount} người nhận)`);
            setIsModalVisible(false);
            form.resetFields();
            fetchNotifications(pagination.current, pagination.pageSize);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Gửi thông báo thất bại');
        }
    };

    // Xóa thông báo
    const handleDeleteNotification = async (id: number) => {
        try {
            // Note: Cần thêm endpoint DELETE trong backend nếu chưa có
            await api.delete(`/notifications/${id}`);
            message.success('Xóa thông báo thành công');
            fetchNotifications(pagination.current, pagination.pageSize);
        } catch (error) {
            message.error('Xóa thông báo thất bại');
        }
    };

    // Xem chi tiết thông báo
    const handleViewDetail = (record: Notification) => {
        Modal.info({
            title: record.title,
            width: 600,
            content: (
                <div>
                    <p><strong>Nội dung:</strong> {record.content}</p>
                    <p><strong>Loại:</strong> {record.notificationType}</p>
                    <p><strong>Đối tượng:</strong> {getScopeText(record.targetScope)}</p>
                    <p><strong>Gửi email:</strong> {record.sendEmail ? 'Có' : 'Không'}</p>
                    <p><strong>Ngày gửi:</strong> {new Date(record.createdAt).toLocaleString('vi-VN')}</p>
                    <p><strong>Số người nhận:</strong> {record.recipientCount}</p>
                    <p><strong>Đã đọc:</strong> {record.readCount}/{record.recipientCount}</p>
                </div>
            ),
            okText: 'Đóng'
        });
    };

    const getScopeText = (scope: string) => {
        switch (scope) {
            case 'ALL': return 'Tất cả người dùng';
            case 'STUDENTS': return 'Tất cả sinh viên';
            case 'TEACHERS': return 'Tất cả giảng viên';
            case 'ADVISORS': return 'Tất cả cố vấn học tập';
            case 'CLASS': return 'Theo lớp sinh viên';
            default: return scope;
        }
    };

    const getScopeColor = (scope: string) => {
        switch (scope) {
            case 'ALL': return 'purple';
            case 'STUDENTS': return 'blue';
            case 'TEACHERS': return 'green';
            case 'ADVISORS': return 'orange';
            case 'CLASS': return 'cyan';
            default: return 'default';
        }
    };

    const columns: ColumnsType<Notification> = [
        {
            title: 'ID',
            dataIndex: 'notificationId',
            key: 'notificationId',
            width: 70,
        },
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            width: 200,
            render: (text) => <strong>{text}</strong>
        },
        {
            title: 'Nội dung',
            dataIndex: 'content',
            key: 'content',
            ellipsis: true,
            width: 300,
            render: (text) => <span>{text.length > 100 ? text.substring(0, 100) + '...' : text}</span>
        },
        {
            title: 'Đối tượng',
            dataIndex: 'targetScope',
            key: 'targetScope',
            width: 150,
            render: (scope, record) => (
                <Tooltip title={record.targetClassId ? `Lớp: ${record.targetClassId}` : ''}>
                    <Tag color={getScopeColor(scope)}>{getScopeText(scope)}</Tag>
                </Tooltip>
            )
        },
        {
            title: 'Email',
            dataIndex: 'sendEmail',
            key: 'sendEmail',
            width: 80,
            render: (sendEmail) => (
                sendEmail ? <Tag color="blue"><MailOutlined /> Có</Tag> : <Tag>Không</Tag>
            )
        },
        {
            title: 'Người nhận',
            key: 'recipients',
            width: 120,
            render: (_, record) => (
                <Tooltip title={`Đã đọc: ${record.readCount}/${record.recipientCount}`}>
                    <Badge count={record.recipientCount} showZero color="blue" />
                </Tooltip>
            )
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (date) => new Date(date).toLocaleString('vi-VN')
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetail(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Xóa thông báo?"
                        description="Hành động này không thể hoàn tác"
                        onConfirm={() => handleDeleteNotification(record.notificationId)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Tooltip title="Xóa">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    // Modal form gửi thông báo
    const renderModal = () => (
        <Modal
            title={
                <Space>
                    <SendOutlined style={{ color: '#1890ff' }} />
                    <span>Gửi thông báo mới</span>
                </Space>
            }
            open={isModalVisible}
            onCancel={() => {
                setIsModalVisible(false);
                form.resetFields();
            }}
            footer={null}
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSendNotification}
                initialValues={{
                    targetScope: 'ALL',
                    notificationType: 'SYSTEM',
                    sendEmail: false
                }}
            >
                <Form.Item
                    name="title"
                    label="Tiêu đề"
                    rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                >
                    <Input placeholder="Nhập tiêu đề thông báo" maxLength={200} />
                </Form.Item>

                <Form.Item
                    name="content"
                    label="Nội dung"
                    rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
                >
                    <TextArea
                        rows={6}
                        placeholder="Nhập nội dung thông báo..."
                        maxLength={2000}
                        showCount
                    />
                </Form.Item>

                <Form.Item
                    name="notificationType"
                    label="Loại thông báo"
                >
                    <Select>
                        <Option value="SYSTEM">Hệ thống</Option>
                        <Option value="ACADEMIC">Học vụ</Option>
                        <Option value="REGISTRATION">Đăng ký môn</Option>
                        <Option value="WARNING">Cảnh báo</Option>
                        <Option value="OTHER">Khác</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="targetScope"
                    label="Đối tượng nhận"
                    rules={[{ required: true, message: 'Vui lòng chọn đối tượng' }]}
                >
                    <Select onChange={(value) => setTargetScope(value)}>
                        <Option value="ALL">
                            <TeamOutlined /> Tất cả người dùng
                        </Option>
                        <Option value="STUDENTS">
                            <UserOutlined /> Tất cả sinh viên
                        </Option>
                        <Option value="TEACHERS">
                            <UserOutlined /> Tất cả giảng viên
                        </Option>
                        <Option value="ADVISORS">
                            <UserOutlined /> Tất cả cố vấn học tập
                        </Option>
                        <Option value="CLASS">
                            <TeamOutlined /> Theo lớp sinh viên
                        </Option>
                    </Select>
                </Form.Item>

                {targetScope === 'CLASS' && (
                    <Form.Item
                        name="targetClassId"
                        label="Chọn lớp"
                        rules={[{ required: true, message: 'Vui lòng chọn lớp' }]}
                    >
                        <Select
                            placeholder="Chọn lớp sinh viên"
                            showSearch
                            optionFilterProp="children"
                        >
                            {classes.map(cls => (
                                <Option key={cls.advisorClassId} value={cls.advisorClassId}>
                                    {cls.classCode} - {cls.className} ({cls.studentCount} SV)
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                <Form.Item
                    name="sendEmail"
                    label="Gửi email kèm theo"
                    valuePropName="checked"
                    tooltip="Gửi thông báo qua email cho người dùng (nếu có email)"
                >
                    <Switch checkedChildren="Có" unCheckedChildren="Không" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                    <Space style={{ float: 'right' }}>
                        <Button onClick={() => {
                            setIsModalVisible(false);
                            form.resetFields();
                        }}>
                            Hủy
                        </Button>
                        <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                            Gửi thông báo
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );

    // Thống kê nhanh
    const stats = {
        total: notifications.length,
        withEmail: notifications.filter(n => n.sendEmail).length,
        totalRecipients: notifications.reduce((sum, n) => sum + (n.recipientCount || 0), 0)
    };

    return (
        <div>
            <Card>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Tổng thông báo"
                                value={stats.total}
                                prefix={<NotificationOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Có gửi email"
                                value={stats.withEmail}
                                prefix={<MailOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Tổng lượt nhận"
                                value={stats.totalRecipients}
                                prefix={<TeamOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsModalVisible(true)}
                            size="large"
                            style={{ width: '100%', height: '100%', minHeight: 72 }}
                        >
                            Tạo thông báo mới
                        </Button>
                    </Col>
                </Row>

                <Tabs defaultActiveKey="sent">
                    <Tabs.TabPane tab="Thông báo đã gửi" key="sent">
                        <Table
                            columns={columns}
                            dataSource={notifications}
                            rowKey="notificationId"
                            loading={loading}
                            pagination={{
                                current: pagination.current,
                                pageSize: pagination.pageSize,
                                total: pagination.total,
                                showSizeChanger: true,
                                showTotal: (total) => `Tổng ${total} thông báo`,
                                onChange: (page, pageSize) => {
                                    fetchNotifications(page, pageSize);
                                }
                            }}
                            scroll={{ x: 1000 }}
                        />
                    </Tabs.TabPane>
                </Tabs>
            </Card>

            {renderModal()}
        </div>
    );
};

export default NotificationsManagement;