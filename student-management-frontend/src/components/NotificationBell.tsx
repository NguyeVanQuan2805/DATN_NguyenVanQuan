// src/components/NotificationBell.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge, Dropdown, List, Spin, Empty, Button, Typography, Space, Tooltip, message } from 'antd';
import { BellOutlined, CheckOutlined, MailOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Text, Paragraph } = Typography;

interface Notification {
    recipientId: number;
    notificationId: number;
    title: string;
    content: string;
    notificationType: string;
    createdAt: string;
    isRead: boolean;
}

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Fetch số lượng thông báo chưa đọc
    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await api.get('/notifications/unread-count');
            const count = response.data.unreadCount;
            setUnreadCount(count);
            console.log('[NotificationBell] Unread count:', count);
            return count;
        } catch (error) {
            console.error('Lỗi lấy số thông báo chưa đọc:', error);
            return 0;
        }
    }, []);

    // Fetch danh sách thông báo
    const fetchNotifications = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            console.log('[NotificationBell] Fetching notifications...');
            const response = await api.get('/notifications', {
                params: {
                    unreadOnly: false,
                    page: 1,
                    pageSize: 20
                }
            });

            const fetchedNotifications = response.data.notifications || [];
            console.log('[NotificationBell] Fetched:', fetchedNotifications.length, 'notifications');

            setNotifications(fetchedNotifications);
            const unread = fetchedNotifications.filter((n: Notification) => !n.isRead).length;
            setUnreadCount(unread);

            return fetchedNotifications;
        } catch (error: any) {
            console.error('Lỗi lấy thông báo:', error);
            message.error(error.response?.data?.message || 'Không thể tải thông báo');
            return [];
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    // Refresh toàn bộ dữ liệu
    const refreshData = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchUnreadCount(),
            fetchNotifications(false)
        ]);
        setRefreshing(false);
    }, [fetchUnreadCount, fetchNotifications]);

    // Đánh dấu đã đọc một thông báo
    const markAsRead = async (notificationId: number) => {
        try {
            await api.put(`/notifications/${notificationId}/mark-read`);
            setNotifications(prev =>
                prev.map(n =>
                    n.notificationId === notificationId
                        ? { ...n, isRead: true }
                        : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            message.success('Đã đánh dấu đã đọc');
        } catch (error) {
            console.error('Lỗi đánh dấu đã đọc:', error);
            message.error('Đánh dấu thất bại');
        }
    };

    // Đánh dấu tất cả đã đọc
    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/mark-all-read');
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true }))
            );
            setUnreadCount(0);
            message.success('Đã đánh dấu tất cả đã đọc');
        } catch (error) {
            console.error('Lỗi đánh dấu tất cả:', error);
            message.error('Đánh dấu thất bại');
        }
    };

    // Khởi tạo và polling
    useEffect(() => {
        refreshData();
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount, refreshData]);

    const handleOpenChange = async (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen) {
            await fetchNotifications(false);
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'WARNING': return '#ff4d4f';
            case 'ACADEMIC': return '#1890ff';
            case 'REGISTRATION': return '#52c41a';
            default: return '#722ed1';
        }
    };

    const dropdownContent = (
        <div style={{
            width: 380,
            maxHeight: 500,
            overflow: 'auto',
            backgroundColor: '#fff',
            borderRadius: 8,
            boxShadow: '0 3px 6px -4px rgba(0,0,0,0.12), 0 6px 16px 0 rgba(0,0,0,0.08), 0 9px 28px 8px rgba(0,0,0,0.05)'
        }}>
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Text strong>Thông báo</Text>
                <Space size="small">
                    <Tooltip title="Làm mới">
                        <Button
                            type="text"
                            size="small"
                            icon={<ReloadOutlined spin={refreshing} />}
                            onClick={refreshData}
                        />
                    </Tooltip>
                    {unreadCount > 0 && (
                        <Button type="link" size="small" onClick={markAllAsRead}>
                            <CheckOutlined /> Đánh dấu tất cả đã đọc
                        </Button>
                    )}
                </Space>
            </div>

            <Spin spinning={loading || refreshing}>
                {notifications.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Không có thông báo nào"
                        style={{ padding: '32px 0' }}
                    />
                ) : (
                    <List
                        dataSource={notifications}
                        renderItem={(item) => (
                            <List.Item
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: item.isRead ? 'transparent' : '#e6f7ff',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f0f0f0',
                                    transition: 'background-color 0.3s'
                                }}
                                onClick={() => !item.isRead && markAsRead(item.notificationId)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                                }}
                                onMouseLeave={(e) => {
                                    if (!item.isRead) {
                                        e.currentTarget.style.backgroundColor = '#e6f7ff';
                                    } else {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            backgroundColor: getNotificationColor(item.notificationType),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white'
                                        }}>
                                            <BellOutlined />
                                        </div>
                                    }
                                    title={
                                        <Space>
                                            <Text strong={!item.isRead}>{item.title}</Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {new Date(item.createdAt).toLocaleString('vi-VN')}
                                            </Text>
                                            {!item.isRead && <Badge status="processing" />}
                                        </Space>
                                    }
                                    description={
                                        <Paragraph
                                            ellipsis={{ rows: 2 }}
                                            style={{ marginBottom: 0, color: '#666' }}
                                        >
                                            {item.content}
                                        </Paragraph>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Spin>

            {notifications.length > 0 && (
                <div style={{
                    padding: '8px 16px',
                    borderTop: '1px solid #f0f0f0',
                    textAlign: 'center'
                }}>
                    <Button type="link" onClick={() => {
                        setOpen(false);
                        navigate('/notifications');
                    }}>
                        Xem tất cả ({notifications.length})
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <div ref={containerRef} style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
            <Dropdown
                open={open}
                onOpenChange={handleOpenChange}
                dropdownRender={() => dropdownContent}
                trigger={['click']}
                placement="bottomRight"
                getPopupContainer={() => containerRef.current || document.body}
            >
                <div style={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}>
                    <Button
                        type="text"
                        icon={<BellOutlined style={{ fontSize: 18, color: '#722ed1' }} />}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            padding: '4px 8px',
                            height: 'auto'
                        }}
                    />
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            minWidth: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#ff4d4f',
                            color: '#fff',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                            fontWeight: 'bold'
                        }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
            </Dropdown>
        </div>
    );
};

export default NotificationBell;