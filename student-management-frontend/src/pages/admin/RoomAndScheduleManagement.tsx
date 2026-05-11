import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    Space,
    message,
    Popconfirm,
    Card,
    Tag,
    Tooltip,
    Tabs,
    Row,
    Col,
    Statistic,
    Collapse,
    Spin,
    Badge,
    Switch,
    ConfigProvider,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    ClockCircleOutlined,
    HomeOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    AppstoreOutlined,
    EnvironmentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

import { Typography } from 'antd';
const { Title, Text } = Typography;


interface Room {
    roomId: number;
    roomCode: string;
    roomName: string;
    building: string;
    capacity: number;
    roomType: string;
    isAvailable: boolean;
    notes: string;
    createdAt: string;
}

interface Schedule {
    scheduleId: number;
    dayOfWeek: number;
    dayName: string;
    periodStart: number;
    periodEnd: number;
    periodDisplay: string;
    room: string;
    roomId: number | null;
    roomDisplay: string;
    building: string | null;
    roomInfo: {
        roomCode: string;
        roomName: string;
        building: string;
        capacity: number;
        roomType: string;
    } | null;
}

const RoomAndScheduleManagement: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [roomForm] = Form.useForm();
    const [filterBuilding, setFilterBuilding] = useState<string>();
    const [filterType, setFilterType] = useState<string>();
    const [buildings, setBuildings] = useState<string[]>([]);

    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [schedulesLoading, setSchedulesLoading] = useState(false);
    const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [scheduleForm] = Form.useForm();
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [activeTab, setActiveTab] = useState('rooms');

    // Fetch Rooms
    const fetchRooms = async () => {
        setRoomsLoading(true);
        try {
            const params: any = {};
            if (filterBuilding) params.building = filterBuilding;
            if (filterType) params.roomType = filterType;

            const response = await api.get('/RoomManagement/rooms', { params });
            setRooms(response.data || []);
        } catch (error: any) {
            console.error('Fetch rooms error:', error);
            message.error(error.response?.data?.message || 'Không thể tải danh sách phòng học');
            setRooms([]);
        } finally {
            setRoomsLoading(false);
        }
    };

    const fetchBuildings = async () => {
        try {
            const response = await api.get('/RoomManagement/buildings');
            setBuildings(response.data || []);
        } catch (error) {
            console.error('Error fetching buildings:', error);
            setBuildings([]);
        }
    };

    const fetchAvailableRooms = async () => {
        try {
            const response = await api.get('/RoomManagement/available-rooms');
            setAvailableRooms(response.data || []);
        } catch (error) {
            console.error('Error fetching available rooms:', error);
            setAvailableRooms([]);
        }
    };

    // Fetch Schedules
    const fetchSchedules = async () => {
        setSchedulesLoading(true);
        try {
            const response = await api.get('/ClassScheduleManagement/schedules');
            setSchedules(response.data || []);
        } catch (error: any) {
            console.error('Fetch schedules error:', error);
            message.error(error.response?.data?.message || 'Không thể tải danh sách lịch học');
            setSchedules([]);
        } finally {
            setSchedulesLoading(false);
        }
    };

    // Room handlers
    const handleAddRoom = () => {
        setEditingRoom(null);
        roomForm.resetFields();
        roomForm.setFieldsValue({ roomType: 'CLASSROOM', isAvailable: true, capacity: 30 });
        setRoomModalVisible(true);
    };

    const handleEditRoom = (record: Room) => {
        setEditingRoom(record);
        roomForm.setFieldsValue(record);
        setRoomModalVisible(true);
    };

    const handleDeleteRoom = async (roomId: number) => {
        try {
            await api.delete(`/RoomManagement/rooms/${roomId}`);
            message.success('Xóa phòng học thành công');
            fetchRooms();
            fetchAvailableRooms();
            fetchSchedules();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể xóa phòng học');
        }
    };

    const handleSubmitRoom = async () => {
        try {
            const values = await roomForm.validateFields();
            if (editingRoom) {
                await api.put(`/RoomManagement/rooms/${editingRoom.roomId}`, values);
                message.success('Cập nhật phòng học thành công');
            } else {
                await api.post('/RoomManagement/rooms', values);
                message.success('Thêm phòng học thành công');
            }
            setRoomModalVisible(false);
            fetchRooms();
            fetchAvailableRooms();
            fetchSchedules();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    // Schedule handlers
    const handleAddSchedule = () => {
        setEditingSchedule(null);
        scheduleForm.resetFields();
        scheduleForm.setFieldsValue({ dayOfWeek: 2, periodStart: 1, periodEnd: 3 });
        setScheduleModalVisible(true);
    };

    const handleEditSchedule = (record: Schedule) => {
        setEditingSchedule(record);
        scheduleForm.setFieldsValue({
            dayOfWeek: record.dayOfWeek,
            periodStart: record.periodStart,
            periodEnd: record.periodEnd,
            room: record.room,
        });
        setScheduleModalVisible(true);
    };

    const handleDeleteSchedule = async (scheduleId: number) => {
        try {
            await api.delete(`/ClassScheduleManagement/schedules/${scheduleId}`);
            message.success('Xóa lịch học thành công');
            fetchSchedules();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể xóa lịch học');
        }
    };

    const handleSubmitSchedule = async () => {
        try {
            const values = await scheduleForm.validateFields();

            const payload = {
                dayOfWeek: values.dayOfWeek,
                periodStart: values.periodStart,
                periodEnd: values.periodEnd,
                roomCode: values.room,
            };

            if (editingSchedule) {
                await api.put(`/ClassScheduleManagement/schedules/${editingSchedule.scheduleId}`, payload);
                message.success('Cập nhật lịch học thành công');
            } else {
                await api.post('/ClassScheduleManagement/schedules', payload);
                message.success('Thêm lịch học thành công');
            }
            setScheduleModalVisible(false);
            fetchSchedules();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    // Columns cho Room
    const roomColumns: ColumnsType<Room> = [
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Mã phòng</span>,
            dataIndex: 'roomCode',
            key: 'roomCode',
            width: 120,
            render: (code: string) => <Text strong style={{ fontSize: '14px', color: '#1677ff' }}>{code}</Text>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Tên phòng</span>,
            dataIndex: 'roomName',
            key: 'roomName',
            width: 180,
            render: (name: string) => <span style={{ fontSize: '14px' }}>{name}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Tòa nhà</span>,
            dataIndex: 'building',
            key: 'building',
            width: 120,
            render: (building) => building ? (
                <Tag icon={<EnvironmentOutlined />} color="cyan" style={{ fontSize: '13px', padding: '4px 12px' }}>
                    {building}
                </Tag>
            ) : <Tag color="default" style={{ fontSize: '13px' }}>Chưa xác định</Tag>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Sức chứa</span>,
            dataIndex: 'capacity',
            key: 'capacity',
            width: 120,
            align: 'center',
            render: (capacity) => (
                <Badge
                    count={`${capacity} chỗ`}
                    style={{ backgroundColor: '#1890ff', fontSize: '12px' }}
                />
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Loại phòng</span>,
            dataIndex: 'roomType',
            key: 'roomType',
            width: 130,
            render: (type) => {
                const typeMap: Record<string, { color: string; label: string }> = {
                    CLASSROOM: { color: 'blue', label: 'Phòng học' },
                    LAB: { color: 'green', label: 'Phòng lab' },
                    AUDITORIUM: { color: 'orange', label: 'Hội trường' },
                    MEETING: { color: 'purple', label: 'Phòng họp' },
                };
                const info = typeMap[type] || { color: 'default', label: type };
                return <Tag color={info.color} style={{ fontSize: '13px', padding: '4px 12px' }}>{info.label}</Tag>;
            },
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Trạng thái</span>,
            dataIndex: 'isAvailable',
            key: 'isAvailable',
            width: 120,
            align: 'center',
            render: (available) => (
                <Tag
                    icon={available ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    color={available ? 'green' : 'red'}
                    style={{ fontSize: '13px', padding: '4px 12px' }}
                >
                    {available ? 'Khả dụng' : 'Không khả dụng'}
                </Tag>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Thao tác</span>,
            key: 'action',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Sửa">
                        <Button
                            type="link"
                            size="middle"
                            icon={<EditOutlined />}
                            onClick={() => handleEditRoom(record)}
                            style={{ fontSize: '14px' }}
                        />
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <Popconfirm
                            title="Xóa phòng học"
                            description="Bạn có chắc chắn muốn xóa phòng học này?"
                            onConfirm={() => handleDeleteRoom(record.roomId)}
                            okText="Xóa"
                            cancelText="Hủy"
                        >
                            <Button type="link" size="middle" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    // Columns cho Schedule
    const scheduleColumns: ColumnsType<Schedule> = [
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Thứ</span>,
            dataIndex: 'dayName',
            key: 'dayName',
            width: 120,
            render: (dayName) => <Tag color="purple" style={{ fontSize: '14px', padding: '4px 16px' }}>{dayName}</Tag>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Tiết bắt đầu</span>,
            dataIndex: 'periodStart',
            key: 'periodStart',
            width: 110,
            align: 'center',
            render: (period: number) => <span style={{ fontSize: '14px', fontWeight: 500 }}>{period}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Tiết kết thúc</span>,
            dataIndex: 'periodEnd',
            key: 'periodEnd',
            width: 110,
            align: 'center',
            render: (period: number) => <span style={{ fontSize: '14px', fontWeight: 500 }}>{period}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Khung giờ</span>,
            dataIndex: 'periodDisplay',
            key: 'periodDisplay',
            width: 160,
            render: (display: string) => <span style={{ fontSize: '14px' }}>{display}</span>,
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Phòng</span>,
            dataIndex: 'roomDisplay',
            key: 'roomDisplay',
            width: 300,
            render: (roomDisplay, record) => (
                <Space direction="vertical" size={4}>
                    <Tag color="cyan" icon={<HomeOutlined />} style={{ fontSize: '13px', padding: '4px 12px' }}>
                        {record.room || 'Chưa có phòng'}
                    </Tag>
                    {record.building && (
                        <Tag color="geekblue" icon={<EnvironmentOutlined />} style={{ fontSize: '12px', marginTop: 4 }}>
                            Tòa {record.building}
                        </Tag>
                    )}
                    {record.roomInfo && (
                        <div style={{ fontSize: '13px', color: '#666', marginTop: 4 }}>
                            {record.roomInfo.roomName} | Sức chứa: {record.roomInfo.capacity} chỗ
                        </div>
                    )}
                </Space>
            ),
        },
        {
            title: <span style={{ fontSize: '15px', fontWeight: 600 }}>Thao tác</span>,
            key: 'action',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Sửa">
                        <Button
                            type="link"
                            size="middle"
                            icon={<EditOutlined />}
                            onClick={() => handleEditSchedule(record)}
                            style={{ fontSize: '14px' }}
                        />
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <Popconfirm
                            title="Xóa lịch học"
                            description="Bạn có chắc chắn muốn xóa lịch học này?"
                            onConfirm={() => handleDeleteSchedule(record.scheduleId)}
                            okText="Xóa"
                            cancelText="Hủy"
                        >
                            <Button type="link" size="middle" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    // Stats
    const roomStats = {
        total: rooms.length,
        available: rooms.filter(r => r.isAvailable).length,
        unavailable: rooms.filter(r => !r.isAvailable).length,
    };

    // Effects
    useEffect(() => {
        fetchRooms();
        fetchBuildings();
        fetchAvailableRooms();
        fetchSchedules();
    }, []);

    useEffect(() => {
        fetchRooms();
    }, [filterBuilding, filterType]);

    const dayOptions = [
        { label: 'Thứ 2', value: 2 },
        { label: 'Thứ 3', value: 3 },
        { label: 'Thứ 4', value: 4 },
        { label: 'Thứ 5', value: 5 },
        { label: 'Thứ 6', value: 6 },
        { label: 'Thứ 7', value: 7 },
        { label: 'Chủ nhật', value: 8 },
    ];

    const roomTypeOptions = [
        { label: 'Phòng học', value: 'CLASSROOM' },
        { label: 'Phòng lab', value: 'LAB' },
        { label: 'Hội trường', value: 'AUDITORIUM' },
        { label: 'Phòng họp', value: 'MEETING' },
    ];

    const periodInfo = [
        { period: 1, time: '07:00 - 07:50' },
        { period: 2, time: '07:55 - 08:45' },
        { period: 3, time: '08:50 - 09:40' },
        { period: 4, time: '09:45 - 10:35' },
        { period: 5, time: '10:40 - 11:30' },
        { period: 6, time: '13:00 - 13:50' },
        { period: 7, time: '13:55 - 14:45' },
        { period: 8, time: '14:50 - 15:40' },
        { period: 9, time: '15:45 - 16:35' },
        { period: 10, time: '16:40 - 17:30' },
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
                        <AppstoreOutlined style={{ marginRight: 12, fontSize: '28px' }} />
                        Quản lý phòng học & lịch học
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: 8, display: 'block' }}>
                        Quản lý phòng học, lịch học và thời khóa biểu
                    </Text>
                </div>

                {/* Header Stats */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={8}>
                        <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Statistic
                                title={<span style={{ fontSize: '14px' }}>Tổng số phòng</span>}
                                value={roomStats.total}
                                prefix={<HomeOutlined style={{ fontSize: '22px' }} />}
                                valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Statistic
                                title={<span style={{ fontSize: '14px' }}>Phòng khả dụng</span>}
                                value={roomStats.available}
                                prefix={<CheckCircleOutlined style={{ fontSize: '22px' }} />}
                                valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Statistic
                                title={<span style={{ fontSize: '14px' }}>Tổng số lịch học</span>}
                                value={schedules.length}
                                prefix={<CalendarOutlined style={{ fontSize: '22px' }} />}
                                valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Main Tabs */}
                <Card style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        size="large"
                        items={[
                            {
                                key: 'rooms',
                                label: <span style={{ fontSize: '15px' }}><HomeOutlined /> Quản lý phòng học</span>,
                                children: (
                                    <>
                                        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                            <Space wrap size="middle">
                                                <Select
                                                    placeholder="Lọc theo tòa nhà"
                                                    allowClear
                                                    style={{ width: 160 }}
                                                    value={filterBuilding}
                                                    onChange={(value) => setFilterBuilding(value)}
                                                    options={buildings.map(b => ({ label: b, value: b }))}
                                                    size="large"
                                                />
                                                <Select
                                                    placeholder="Lọc theo loại phòng"
                                                    allowClear
                                                    style={{ width: 160 }}
                                                    value={filterType}
                                                    onChange={(value) => setFilterType(value)}
                                                    options={roomTypeOptions}
                                                    size="large"
                                                />
                                                <Button icon={<ReloadOutlined />} onClick={fetchRooms} size="large">
                                                    Làm mới
                                                </Button>
                                            </Space>
                                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRoom} size="large">
                                                Thêm phòng học
                                            </Button>
                                        </div>

                                        <Spin spinning={roomsLoading}>
                                            <Table
                                                columns={roomColumns}
                                                dataSource={rooms}
                                                rowKey="roomId"
                                                scroll={{ x: 1200 }}
                                                pagination={{
                                                    pageSize: 10,
                                                    showSizeChanger: true,
                                                    showTotal: (total) => <span style={{ fontSize: '14px' }}>Tổng số {total} phòng</span>,
                                                }}
                                                size="middle"
                                            />
                                        </Spin>
                                    </>
                                ),
                            },
                            {
                                key: 'schedules',
                                label: <span style={{ fontSize: '15px' }}><CalendarOutlined /> Quản lý lịch học</span>,
                                children: (
                                    <>
                                        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
                                            <Space size="middle">
                                                <Button icon={<ReloadOutlined />} onClick={fetchSchedules} size="large">
                                                    Làm mới
                                                </Button>
                                                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSchedule} size="large">
                                                    Thêm lịch học
                                                </Button>
                                            </Space>
                                        </div>

                                        <Spin spinning={schedulesLoading}>
                                            <Table
                                                columns={scheduleColumns}
                                                dataSource={schedules}
                                                rowKey="scheduleId"
                                                scroll={{ x: 1200 }}
                                                pagination={{
                                                    pageSize: 10,
                                                    showSizeChanger: true,
                                                    showTotal: (total) => <span style={{ fontSize: '14px' }}>Tổng số {total} lịch</span>,
                                                }}
                                                size="middle"
                                            />
                                        </Spin>

                                        <Collapse
                                            style={{ marginTop: 20 }}
                                            size="large"
                                            items={[
                                                {
                                                    key: '1',
                                                    label: <span style={{ fontSize: '15px', fontWeight: 500 }}>Thông tin quy đổi tiết học</span>,
                                                    children: (
                                                        <Row gutter={[16, 16]}>
                                                            {periodInfo.map(p => (
                                                                <Col span={8} key={p.period}>
                                                                    <Tag color="blue" style={{ fontSize: '13px', padding: '4px 12px' }}>
                                                                        Tiết {p.period}
                                                                    </Tag>
                                                                    : <span style={{ fontSize: '14px' }}>{p.time}</span>
                                                                </Col>
                                                            ))}
                                                        </Row>
                                                    ),
                                                }
                                            ]}
                                        />
                                    </>
                                ),
                            },
                        ]}
                    />
                </Card>

                {/* Room Modal */}
                <Modal
                    title={<span style={{ fontSize: '18px', fontWeight: 600 }}>{editingRoom ? 'Sửa phòng học' : 'Thêm phòng học mới'}</span>}
                    open={roomModalVisible}
                    onOk={handleSubmitRoom}
                    onCancel={() => setRoomModalVisible(false)}
                    width={650}
                    okText={editingRoom ? 'Cập nhật' : 'Thêm mới'}
                    cancelText="Hủy"
                    okButtonProps={{ size: 'large' }}
                    cancelButtonProps={{ size: 'large' }}
                >
                    <Form form={roomForm} layout="vertical">
                        <Form.Item
                            name="roomCode"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Mã phòng</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập mã phòng' }]}
                        >
                            <Input placeholder="VD: A101" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="roomName"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Tên phòng</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập tên phòng' }]}
                        >
                            <Input placeholder="VD: Phòng A101" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="building"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Tòa nhà</span>}
                        >
                            <Input placeholder="VD: A" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="capacity"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Sức chứa</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập sức chứa' }]}
                        >
                            <InputNumber min={1} max={500} style={{ width: '100%' }} size="large" />
                        </Form.Item>

                        <Form.Item
                            name="roomType"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Loại phòng</span>}
                        >
                            <Select options={roomTypeOptions} size="large" />
                        </Form.Item>

                        <Form.Item
                            name="isAvailable"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Trạng thái</span>}
                            valuePropName="checked"
                        >
                            <Switch checkedChildren="Khả dụng" unCheckedChildren="Không khả dụng" size="default" />
                        </Form.Item>

                        <Form.Item
                            name="notes"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Ghi chú</span>}
                        >
                            <Input.TextArea rows={3} placeholder="Ghi chú thêm về phòng học" style={{ fontSize: '14px' }} />
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Schedule Modal */}
                <Modal
                    title={<span style={{ fontSize: '18px', fontWeight: 600 }}>{editingSchedule ? 'Sửa lịch học' : 'Thêm lịch học mới'}</span>}
                    open={scheduleModalVisible}
                    onOk={handleSubmitSchedule}
                    onCancel={() => setScheduleModalVisible(false)}
                    width={550}
                    okText={editingSchedule ? 'Cập nhật' : 'Thêm mới'}
                    cancelText="Hủy"
                    okButtonProps={{ size: 'large' }}
                    cancelButtonProps={{ size: 'large' }}
                >
                    <Form form={scheduleForm} layout="vertical">
                        <Form.Item
                            name="dayOfWeek"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Thứ</span>}
                            rules={[{ required: true, message: 'Vui lòng chọn thứ' }]}
                        >
                            <Select options={dayOptions} size="large" />
                        </Form.Item>

                        <Form.Item
                            name="periodStart"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Tiết bắt đầu</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập tiết bắt đầu' }]}
                        >
                            <InputNumber min={1} max={10} style={{ width: '100%' }} size="large" />
                        </Form.Item>

                        <Form.Item
                            name="periodEnd"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Tiết kết thúc</span>}
                            rules={[
                                { required: true, message: 'Vui lòng nhập tiết kết thúc' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('periodStart') < value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Tiết kết thúc phải lớn hơn tiết bắt đầu'));
                                    },
                                }),
                            ]}
                        >
                            <InputNumber min={1} max={10} style={{ width: '100%' }} size="large" />
                        </Form.Item>

                        <Form.Item
                            name="room"
                            label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Phòng học</span>}
                            rules={[{ required: true, message: 'Vui lòng chọn phòng học' }]}
                        >
                            <Select
                                showSearch
                                placeholder="Chọn phòng học"
                                optionFilterProp="children"
                                size="large"
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={availableRooms.map(r => ({
                                    label: `${r.roomCode} - ${r.roomName} (Tòa ${r.building}, ${r.capacity} chỗ)`,
                                    value: r.roomCode,
                                }))}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </ConfigProvider>
    );
};

export default RoomAndScheduleManagement;