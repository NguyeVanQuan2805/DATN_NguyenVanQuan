import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Tag,
    Typography,
    Modal,
    Spin,
    Empty,
    Tabs,
    message,
    Badge
} from 'antd';
import {
    EyeOutlined,
    CheckOutlined,
    MailOutlined,
    BellOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

const { Title, Paragraph, Text } = Typography;

interface Notification {
    recipientId: number;
    notificationId: number;
    title: string;
    content: string;
    notificationType: string;
    createdAt: string;
    isRead: boolean;
    readAt?: string;
    sendEmail: boolean;
}

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [activeTab, setActiveTab] = useState('all');

    const fetchNotifications = async (page = 1, pageSize = 20, unreadOnly = false) => {
        setLoading(true);
        try {
            const response = await api.get('/notifications', {
                params: { unreadOnly, page, pageSize }
            });
            setNotifications(response.data.notifications);
            setPagination({
                current: response.data.page,
                pageSize: response.data.pageSize,
                total: response.data.total
            });
        } catch (error) {
            message.error('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleTabChange = (key: string) => {
        setActiveTab(key);
        fetchNotifications(1, pagination.pageSize, key === 'unread');
    };

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await api.put(`/notifications/${notificationId}/mark-read`);
            message.success('Đã đánh dấu đã đọc');
            fetchNotifications(pagination.current, pagination.pageSize, activeTab === 'unread');
        } catch (error) {
            message.error('Đánh dấu thất bại');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.put('/notifications/mark-all-read');
            message.success('Đã đánh dấu tất cả đã đọc');
            fetchNotifications(pagination.current, pagination.pageSize, activeTab === 'unread');
        } catch (error) {
            message.error('Đánh dấu thất bại');
        }
    };

    const handleViewDetail = (record: Notification) => {
        setSelectedNotification(record);
        setModalVisible(true);
        if (!record.isRead) {
            handleMarkAsRead(record.notificationId);
        }
    };

    const getTypeTag = (type: string) => {
        const config: Record<string, { color: string; text: string }> = {
            WARNING: { color: 'red', text: 'Cảnh báo' },
            ACADEMIC: { color: 'blue', text: 'Học vụ' },
            REGISTRATION: { color: 'green', text: 'Đăng ký' },
            SYSTEM: { color: 'purple', text: 'Hệ thống' },
            OTHER: { color: 'default', text: 'Khác' }
        };
        const { color, text } = config[type] || config.OTHER;
        return <Tag color={color}>{text}</Tag>;
    };

    const columns: ColumnsType<Notification> = [
        {
            title: '',
            key: 'status',
            width: 40,
            render: (_, record) => !record.isRead && <Badge status="processing" />
        },
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <Text strong={!record.isRead}>{text}</Text>
            )
        },
        {
            title: 'Nội dung',
            dataIndex: 'content',
            key: 'content',
            ellipsis: true,
            render: (text) => text.length > 80 ? text.substring(0, 80) + '...' : text
        },
        {
            title: 'Loại',
            dataIndex: 'notificationType',
            key: 'notificationType',
            width: 100,
            render: (type) => getTypeTag(type)
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (date) => new Date(date).toLocaleString('vi-VN')
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 100,
            render: (_, record) => record.isRead ? (
                <Tag>Đã đọc</Tag>
            ) : (
                <Tag color="blue">Chưa đọc</Tag>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                    >
                        Xem
                    </Button>
                    {!record.isRead && (
                        <Button
                            type="link"
                            icon={<CheckOutlined />}
                            onClick={() => handleMarkAsRead(record.notificationId)}
                        >
                            Đã đọc
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <BellOutlined /> Thông báo
                </Title>
                <Button onClick={handleMarkAllAsRead} icon={<CheckOutlined />}>
                    Đánh dấu tất cả đã đọc
                </Button>
            </div>

            <Tabs activeKey={activeTab} onChange={handleTabChange}>
                <Tabs.TabPane tab="Tất cả" key="all" />
                <Tabs.TabPane tab="Chưa đọc" key="unread" />
            </Tabs>

            <Table
                columns={columns}
                dataSource={notifications}
                rowKey="notificationId"
                loading={loading}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng ${total} thông báo`
                }}
                onChange={(pag) => {
                    fetchNotifications(pag.current, pag.pageSize, activeTab === 'unread');
                }}
            />

            <Modal
                title={selectedNotification?.title}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)}>
                        Đóng
                    </Button>
                ]}
                width={600}
            >
                {selectedNotification && (
                    <div>
                        <Space style={{ marginBottom: 16 }}>
                            {getTypeTag(selectedNotification.notificationType)}
                            <Text type="secondary">
                                {new Date(selectedNotification.createdAt).toLocaleString('vi-VN')}
                            </Text>
                            {selectedNotification.isRead && (
                                <Tag>Đã đọc lúc: {new Date(selectedNotification.readAt!).toLocaleString('vi-VN')}</Tag>
                            )}
                        </Space>
                        <Paragraph style={{ fontSize: 16, whiteSpace: 'pre-wrap' }}>
                            {selectedNotification.content}
                        </Paragraph>
                        {selectedNotification.sendEmail && (
                            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                                <MailOutlined /> Thông báo này cũng đã được gửi qua email của bạn
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </Card>
    );
};

export default NotificationsPage;