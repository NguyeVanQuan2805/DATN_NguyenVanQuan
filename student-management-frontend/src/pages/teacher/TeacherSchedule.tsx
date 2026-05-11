// src/pages/teacher/TeacherSchedule.tsx
import React, { useState, useEffect } from 'react';
import {
    Card,
    Tag,
    Spin,
    message,
    Select,
    Space,
    Button,
    Tooltip,
    Badge,
    Typography,
    Row,
    Col,
    Modal,
    Descriptions,
    Table,
} from 'antd';
import {
    CalendarOutlined,
    ReloadOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    BookOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface ClassSchedule {
    classId: string;
    classCode: string;
    subjectName: string;
    credits: number;
    dayOfWeek: number;
    dayName: string;
    periodStart: number;
    periodEnd: number;
    periodDisplay: string;
    room: string;
    building?: string;
    currentStudents: number;
    maxStudents: number;
    status: string;
}

const TeacherSchedule: React.FC = () => {
    const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Fetch semesters
    const fetchSemesters = async () => {
        try {
            const response = await api.get('/Semesters');
            setSemesters(response.data || []);
            // Set default to current/latest semester
            const currentSemester = response.data?.find((s: any) => s.isRegistrationOpen === true);
            if (currentSemester) {
                setSelectedSemester(currentSemester.semesterId);
            } else if (response.data?.length > 0) {
                setSelectedSemester(response.data[0].semesterId);
            }
        } catch (error) {
            console.error('Error fetching semesters:', error);
            message.error('Không thể tải danh sách học kỳ');
        }
    };

    // Fetch teacher's class schedules
    const fetchTeacherSchedules = async () => {
        if (!selectedSemester) return;

        setLoading(true);
        try {
            const response = await api.get('/Classes/my-classes');
            let classes = response.data || [];

            // Filter by selected semester if needed
            if (selectedSemester) {
                classes = classes.filter((c: any) => c.semester?.semesterId === selectedSemester);
            }

            // Transform data for display
            const schedulesData: ClassSchedule[] = classes.map((c: any) => ({
                classId: c.classId,
                classCode: c.classCode,
                subjectName: c.subject?.subjectName || 'N/A',
                credits: c.subject?.credits || 0,
                dayOfWeek: c.schedule?.dayOfWeek || 0,
                dayName: getDayName(c.schedule?.dayOfWeek),
                periodStart: c.schedule?.periodStart || 0,
                periodEnd: c.schedule?.periodEnd || 0,
                periodDisplay: c.schedule ? `Tiết ${c.schedule.periodStart} - ${c.schedule.periodEnd}` : 'Chưa có lịch',
                room: c.schedule?.room || 'Chưa có phòng',
                building: c.schedule?.building,
                currentStudents: c.currentStudents || 0,
                maxStudents: c.maxStudents || 0,
                status: c.status || 'OPEN',
            }));

            setSchedules(schedulesData);
        } catch (error: any) {
            console.error('Error fetching schedules:', error);
            message.error(error.response?.data?.message || 'Không thể tải lịch giảng dạy');
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    };

    const getDayName = (dayOfWeek: number) => {
        const days: Record<number, string> = {
            2: 'Thứ 2',
            3: 'Thứ 3',
            4: 'Thứ 4',
            5: 'Thứ 5',
            6: 'Thứ 6',
            7: 'Thứ 7',
            8: 'Chủ nhật',
        };
        return days[dayOfWeek] || `Thứ ${dayOfWeek}`;
    };

    const getStatusTag = (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
            OPEN: { color: 'green', text: 'Đang mở' },
            CLOSED: { color: 'red', text: 'Đã đóng' },
            FULL: { color: 'orange', text: 'Đã đầy' },
            IN_PROGRESS: { color: 'blue', text: 'Đang diễn ra' },
            COMPLETED: { color: 'default', text: 'Đã kết thúc' },
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
    };

    // Group schedules by day for calendar view
    const getSchedulesByDay = () => {
        const grouped: Record<number, ClassSchedule[]> = {
            2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
        };
        schedules.forEach(schedule => {
            if (grouped[schedule.dayOfWeek]) {
                grouped[schedule.dayOfWeek].push(schedule);
            }
        });
        return grouped;
    };

    const schedulesByDay = getSchedulesByDay();

    // Order of days for display
    const dayOrder = [2, 3, 4, 5, 6, 7, 8];

    // Columns for table view
    const columns: ColumnsType<ClassSchedule> = [
        {
            title: 'Mã lớp',
            dataIndex: 'classCode',
            key: 'classCode',
            width: 120,
            fixed: 'left',
            render: (code) => <Tag color="blue">{code}</Tag>,
        },
        {
            title: 'Môn học',
            dataIndex: 'subjectName',
            key: 'subjectName',
            width: 200,
            render: (name, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.credits} tín chỉ
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Lịch học',
            key: 'schedule',
            width: 250,
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Tag color="purple" icon={<CalendarOutlined />}>
                        {record.dayName}
                    </Tag>
                    <Tag color="cyan" icon={<ClockCircleOutlined />} style={{ marginTop: 4 }}>
                        {record.periodDisplay}
                    </Tag>
                    <Tag color="geekblue" icon={<EnvironmentOutlined />} style={{ marginTop: 4 }}>
                        {record.room}
                        {record.building && ` (Tòa ${record.building})`}
                    </Tag>
                </Space>
            ),
        },
        {
            title: 'Sĩ số',
            key: 'students',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <Badge
                    count={`${record.currentStudents}/${record.maxStudents}`}
                    style={{
                        backgroundColor: record.currentStudents >= record.maxStudents ? '#f5222d' : '#52c41a',
                    }}
                />
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            align: 'center',
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <Tooltip title="Xem chi tiết">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => {
                            setSelectedSchedule(record);
                            setModalVisible(true);
                        }}
                    >
                        Chi tiết
                    </Button>
                </Tooltip>
            ),
        },
    ];

    useEffect(() => {
        fetchSemesters();
    }, []);

    useEffect(() => {
        if (selectedSemester) {
            fetchTeacherSchedules();
        }
    }, [selectedSemester]);

    return (
        <div>
            {/* Header với tiêu đề và bộ lọc */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: '1px solid #f0f0f0'
            }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Lịch giảng dạy</Title>
                    <Text type="secondary">Xem lịch các lớp bạn đang giảng dạy trong học kỳ</Text>
                </div>
                <Space>
                    <span>Học kỳ:</span>
                    <Select
                        style={{ width: 250 }}
                        value={selectedSemester}
                        onChange={setSelectedSemester}
                        loading={semesters.length === 0}
                    >
                        {semesters.map((sem) => (
                            <Option key={sem.semesterId} value={sem.semesterId}>
                                {sem.semesterName} ({sem.academicYear})
                            </Option>
                        ))}
                    </Select>
                    <Button icon={<ReloadOutlined />} onClick={fetchTeacherSchedules}>
                        Làm mới
                    </Button>
                </Space>
            </div>

            {/* Weekly Schedule - Horizontal Layout */}
            <Card
                title={
                    <Space>
                        <CalendarOutlined />
                        <span>Lịch theo tuần</span>
                    </Space>
                }
                style={{ marginBottom: 24 }}
            >
                <Spin spinning={loading}>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 16,
                            minWidth: 'max-content'
                        }}>
                            {dayOrder.map(day => {
                                const daySchedules = schedulesByDay[day] || [];
                                return (
                                    <div
                                        key={day}
                                        style={{
                                            flex: 1,
                                            minWidth: 200,
                                            backgroundColor: '#fafafa',
                                            borderRadius: 8,
                                            border: '1px solid #f0f0f0',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* Day Header */}
                                        <div style={{
                                            padding: '12px 16px',
                                            backgroundColor: '#1890ff',
                                            color: 'white',
                                            textAlign: 'center',
                                            fontWeight: 'bold'
                                        }}>
                                            <div>{getDayName(day)}</div>
                                            <Badge
                                                count={daySchedules.length}
                                                style={{
                                                    backgroundColor: 'white',
                                                    color: '#1890ff',
                                                    marginTop: 4
                                                }}
                                            />
                                        </div>

                                        {/* Day Content */}
                                        <div style={{ padding: 12, minHeight: 300 }}>
                                            {daySchedules.length > 0 ? (
                                                daySchedules.map(schedule => (
                                                    <div
                                                        key={schedule.classId}
                                                        style={{
                                                            backgroundColor: 'white',
                                                            borderRadius: 6,
                                                            padding: 12,
                                                            marginBottom: 8,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s',
                                                            border: '1px solid #e8e8e8',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                        }}
                                                        onClick={() => {
                                                            setSelectedSchedule(schedule);
                                                            setModalVisible(true);
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <div style={{ marginBottom: 8 }}>
                                                            <Tag color="blue" style={{ marginBottom: 4 }}>
                                                                {schedule.classCode}
                                                            </Tag>
                                                            <Text strong style={{ display: 'block', fontSize: 13 }}>
                                                                {schedule.subjectName}
                                                            </Text>
                                                        </div>

                                                        <div style={{ fontSize: 12, color: '#666' }}>
                                                            <div style={{ marginBottom: 4 }}>
                                                                <ClockCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                                                                {schedule.periodDisplay}
                                                            </div>
                                                            <div style={{ marginBottom: 4 }}>
                                                                <EnvironmentOutlined style={{ marginRight: 4, color: '#722ed1' }} />
                                                                {schedule.room}
                                                                {schedule.building && ` (Tòa ${schedule.building})`}
                                                            </div>
                                                            <div>
                                                                <BookOutlined style={{ marginRight: 4, color: '#fa8c16' }} />
                                                                {schedule.credits} tín chỉ
                                                            </div>
                                                        </div>

                                                        <div style={{ marginTop: 8 }}>
                                                            {getStatusTag(schedule.status)}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{
                                                    textAlign: 'center',
                                                    padding: 40,
                                                    color: '#999'
                                                }}>
                                                    <CalendarOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                                                    <div>Không có lịch dạy</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Spin>
            </Card>

            {/* Danh sách lớp học - Bảng bên dưới */}
            <Card title="Danh sách lớp học">
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={schedules}
                        rowKey="classId"
                        scroll={{ x: 1000 }}
                        pagination={{
                            showSizeChanger: true,
                            showTotal: (total) => `Tổng số ${total} lớp`,
                            pageSizeOptions: ['10', '20', '50'],
                            defaultPageSize: 10
                        }}
                        expandable={{
                            expandedRowRender: (record) => (
                                <div style={{ margin: 0 }}>
                                    <Descriptions size="small" column={2}>
                                        <Descriptions.Item label="Mã lớp">{record.classCode}</Descriptions.Item>
                                        <Descriptions.Item label="Môn học">{record.subjectName}</Descriptions.Item>
                                        <Descriptions.Item label="Số tín chỉ">{record.credits}</Descriptions.Item>
                                        <Descriptions.Item label="Sĩ số">{record.currentStudents}/{record.maxStudents}</Descriptions.Item>
                                        <Descriptions.Item label="Lịch học">{record.dayName}, {record.periodDisplay}</Descriptions.Item>
                                        <Descriptions.Item label="Phòng học">{record.room}{record.building && ` (Tòa ${record.building})`}</Descriptions.Item>
                                        <Descriptions.Item label="Trạng thái" span={2}>{getStatusTag(record.status)}</Descriptions.Item>
                                    </Descriptions>
                                </div>
                            ),
                        }}
                    />
                </Spin>
            </Card>

            {/* Detail Modal */}
            <Modal
                title="Chi tiết lớp học"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)}>
                        Đóng
                    </Button>,
                    <Button
                        key="view"
                        type="primary"
                        onClick={() => {
                            if (selectedSchedule) {
                                window.location.href = `/teacher/class/${selectedSchedule.classId}`;
                            }
                        }}
                    >
                        Xem danh sách sinh viên
                    </Button>,
                ]}
                width={600}
            >
                {selectedSchedule && (
                    <Descriptions column={1} bordered>
                        <Descriptions.Item label="Mã lớp">{selectedSchedule.classCode}</Descriptions.Item>
                        <Descriptions.Item label="Môn học">{selectedSchedule.subjectName}</Descriptions.Item>
                        <Descriptions.Item label="Số tín chỉ">{selectedSchedule.credits}</Descriptions.Item>
                        <Descriptions.Item label="Lịch học">
                            {selectedSchedule.dayName}, {selectedSchedule.periodDisplay}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phòng học">
                            {selectedSchedule.room}
                            {selectedSchedule.building && ` (Tòa ${selectedSchedule.building})`}
                        </Descriptions.Item>
                        <Descriptions.Item label="Sĩ số">
                            {selectedSchedule.currentStudents}/{selectedSchedule.maxStudents}
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            {getStatusTag(selectedSchedule.status)}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default TeacherSchedule;