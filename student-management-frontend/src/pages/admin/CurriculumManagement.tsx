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
    Collapse,
    Row,
    Col,
    Statistic,
    Spin,
    Descriptions,
    Divider,
    Badge,
    Alert,
    Empty
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    BookOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    AppstoreOutlined,
    FileAddOutlined,
    WarningOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

interface Curriculum {
    curriculumId: number;
    curriculumCode: string;
    curriculumName: string;
    major: string;
    cohortYear: number;
    totalCredits: number;
    departmentId: string;
    status: string;
    createdAt: string;
}

interface Subject {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
    type: string;
}

interface CurriculumSubject {
    curriculumSubjectId: number;
    subjectId: string;        // có thể BE trả về field khác tên
    id?: string;              // fallback nếu BE dùng "id"
    subjectCode: string;
    subjectName: string;
    credits: number;
    subjectType: string;
    recommendedSemester: number;
    isRequired: boolean;
}

const CurriculumManagement: React.FC = () => {
    const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
    const [form] = Form.useForm();
    const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
    const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
    const [groupedSubjects, setGroupedSubjects] = useState<any[]>([]);
    const [subjectsWithoutSemester, setSubjectsWithoutSemester] = useState<any[]>([]);
    const [subjectModalVisible, setSubjectModalVisible] = useState(false);
    const [subjectForm] = Form.useForm();
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
    const [stats, setStats] = useState({
        totalCurriculums: 0,
        activeCurriculums: 0,
        totalSubjects: 0,
        totalCredits: 0
    });

    useEffect(() => {
        fetchCurriculums();
        fetchAvailableSubjects();
    }, []);

    const fetchCurriculums = async () => {
        setLoading(true);
        try {
            const response = await api.get('/Curriculum/curriculums');
            setCurriculums(response.data);
            setStats({
                totalCurriculums: response.data.length,
                activeCurriculums: response.data.filter((c: Curriculum) => c.status === 'ACTIVE').length,
                totalSubjects: 0,
                totalCredits: 0
            });
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể tải danh sách chương trình');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableSubjects = async () => {
        try {
            const response = await api.get('/Subjects');
            setAvailableSubjects(response.data);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchCurriculumDetail = async (id: number) => {
        setLoading(true);
        try {

            const response = await api.get(`/Curriculum/curriculums/${id}`);
            // console.log('Curriculum detail:', response.data); // Debug log
            const sampleSubject = response.data.groupedBySemester?.[0]?.subjects?.[0]
                || response.data.subjectsWithoutSemester?.[0];
            console.log('🔍 Field thực tế của subject:', JSON.stringify(sampleSubject, null, 2));

            setSubjects(response.data.subjects || []);
            setGroupedSubjects(response.data.groupedBySemester || []);
            setSubjectsWithoutSemester(response.data.subjectsWithoutSemester || []);

            setStats(prev => ({
                ...prev,
                totalSubjects: response.data.totalSubjects || 0,
                totalCredits: response.data.curriculum?.totalCredits || 0
            }));

            // Debug: Kiểm tra dữ liệu học kỳ
            if (response.data.groupedBySemester) {
                console.log('Grouped by semester:', response.data.groupedBySemester);
            }
            if (response.data.subjectsWithoutSemester?.length > 0) {
                console.log('Subjects without semester:', response.data.subjectsWithoutSemester);
            }
        } catch (error: any) {
            console.error('Error fetching curriculum detail:', error);
            message.error(error.response?.data?.message || 'Không thể tải chi tiết chương trình');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingCurriculum(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record: Curriculum) => {
        setEditingCurriculum(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/Curriculum/curriculums/${id}`);
            message.success('Xóa chương trình thành công');
            fetchCurriculums();
            if (selectedCurriculum?.curriculumId === id) {
                setSelectedCurriculum(null);
                setSubjects([]);
                setGroupedSubjects([]);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể xóa chương trình');
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editingCurriculum) {
                await api.put(`/Curriculum/curriculums/${editingCurriculum.curriculumId}`, values);
                message.success('Cập nhật chương trình thành công');
            } else {
                await api.post('/Curriculum/curriculums', values);
                message.success('Thêm chương trình thành công');
            }
            setModalVisible(false);
            fetchCurriculums();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleAddSubject = () => {
        subjectForm.resetFields();
        subjectForm.setFieldsValue({
            isRequired: true,
            recommendedSemester: 1,
            subjectType: 'CORE'
        });
        setSubjectModalVisible(true);
    };

    const handleSubmitSubject = async () => {
        try {
            const values = await subjectForm.validateFields();
            await api.post(`/Curriculum/curriculums/${selectedCurriculum?.curriculumId}/subjects`, values);
            message.success('Thêm môn học thành công');
            setSubjectModalVisible(false);
            if (selectedCurriculum) {
                fetchCurriculumDetail(selectedCurriculum.curriculumId);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleRemoveSubject = async (record: CurriculumSubject) => {
        if (!record.subjectId) {
            message.error('Không tìm thấy mã môn học');
            return;
        }

        try {
            await api.delete(
                `/Curriculum/curriculums/${selectedCurriculum?.curriculumId}/subjects/${record.subjectId}`
            );
            message.success('Xóa môn học thành công');
            if (selectedCurriculum) {
                fetchCurriculumDetail(selectedCurriculum.curriculumId);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Không thể xóa môn học');
        }
    };

    const columns: ColumnsType<Curriculum> = [
        {
            title: 'Mã CTĐT',
            dataIndex: 'curriculumCode',
            key: 'curriculumCode',
            width: 120,
        },
        {
            title: 'Tên chương trình',
            dataIndex: 'curriculumName',
            key: 'curriculumName',
            width: 250,
        },
        {
            title: 'Ngành',
            dataIndex: 'major',
            key: 'major',
            width: 150,
        },
        {
            title: 'Khóa',
            dataIndex: 'cohortYear',
            key: 'cohortYear',
            width: 80,
            align: 'center',
        },
        {
            title: 'Tổng tín chỉ',
            dataIndex: 'totalCredits',
            key: 'totalCredits',
            width: 100,
            align: 'center',
            render: (credits) => <Badge count={`${credits} TC`} style={{ backgroundColor: '#1890ff' }} />,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => (
                <Tag icon={status === 'ACTIVE' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    color={status === 'ACTIVE' ? 'green' : 'red'}>
                    {status === 'ACTIVE' ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Xem chi tiết">
                        <Button
                            type="link"
                            size="small"
                            icon={<AppstoreOutlined />}
                            onClick={() => {
                                setSelectedCurriculum(record);
                                fetchCurriculumDetail(record.curriculumId);
                            }}
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
                            title="Xóa chương trình"
                            description="Bạn có chắc chắn muốn xóa chương trình này?"
                            onConfirm={() => handleDelete(record.curriculumId)}
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

    const subjectColumns: ColumnsType<CurriculumSubject> = [
        {
            title: 'Mã môn',
            dataIndex: 'subjectCode',
            key: 'subjectCode',
            width: 100,
        },
        {
            title: 'Tên môn học',
            dataIndex: 'subjectName',
            key: 'subjectName',
            width: 250,
        },
        {
            title: 'TC',
            dataIndex: 'credits',
            key: 'credits',
            width: 60,
            align: 'center',
        },
        {
            title: 'Loại',
            dataIndex: 'subjectType',
            key: 'subjectType',
            width: 100,
            render: (type) => {
                const typeMap: Record<string, { color: string; label: string }> = {
                    CORE: {
                        color: 'blue', label: 'chuyên ngành'},
                    ELECTIVE: { color: 'green', label: 'Tự chọn' },
                    GENERAL: { color: 'orange', label: 'Đại cương' }
                };
                const info = typeMap[type] || { color: 'default', label: type };
                return <Tag color={info.color}>{info.label}</Tag>;
            }
        },
        
        {
            title: 'Bắt buộc',
            dataIndex: 'isRequired',
            key: 'isRequired',
            width: 80,
            align: 'center',
            render: (required) => (
                required ? <Tag color="red">Bắt buộc</Tag> : <Tag color="default">Tự chọn</Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 80,
            render: (_, record) => (
                <Popconfirm
                    title="Xóa môn học"
                    description={`Bạn có chắc chắn muốn xóa môn "${record.subjectName}" khỏi chương trình?`}
                    onConfirm={() => handleRemoveSubject(record)} // ← truyền cả record
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <div>
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Tổng số CTĐT"
                            value={stats.totalCurriculums}
                            prefix={<BookOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="CTĐT đang áp dụng"
                            value={stats.activeCurriculums}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Tổng số môn học"
                            value={stats.totalSubjects}
                            prefix={<BookOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Tổng tín chỉ"
                            value={stats.totalCredits}
                            suffix="TC"
                            prefix={<CalendarOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Card
                        title="Danh sách chương trình đào tạo"
                        extra={
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                                Thêm CTĐT
                            </Button>
                        }
                    >
                        <Table
                            columns={columns}
                            dataSource={curriculums}
                            rowKey="curriculumId"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            onRow={(record) => ({
                                onClick: () => {
                                    setSelectedCurriculum(record);
                                    fetchCurriculumDetail(record.curriculumId);
                                },
                                style: {
                                    cursor: 'pointer',
                                    backgroundColor: selectedCurriculum?.curriculumId === record.curriculumId ? '#e6f7ff' : undefined
                                }
                            })}
                        />
                    </Card>
                </Col>

                <Col span={12}>
                    {selectedCurriculum ? (
                        <Card
                            title={
                                <Space>
                                    <BookOutlined />
                                    <span>{selectedCurriculum.curriculumName}</span>
                                    <Tag color="blue">{selectedCurriculum.curriculumCode}</Tag>
                                </Space>
                            }
                            extra={
                                <Button type="primary" icon={<FileAddOutlined />} onClick={handleAddSubject}>
                                    Thêm môn học
                                </Button>
                            }
                        >
                            <Descriptions size="small" column={2} bordered>
                                <Descriptions.Item label="Ngành">{selectedCurriculum.major}</Descriptions.Item>
                                <Descriptions.Item label="Khóa">{selectedCurriculum.cohortYear}</Descriptions.Item>
                                <Descriptions.Item label="Tổng tín chỉ">{selectedCurriculum.totalCredits} TC</Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">
                                    <Tag color={selectedCurriculum.status === 'ACTIVE' ? 'green' : 'red'}>
                                        {selectedCurriculum.status === 'ACTIVE' ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                                    </Tag>
                                </Descriptions.Item>
                            </Descriptions>

                            <Divider >Phân bố môn học theo học kỳ</Divider>

                            <Spin spinning={loading}>
                                {groupedSubjects.length === 0 && subjectsWithoutSemester.length === 0 ? (
                                    <Empty description="Chưa có môn học nào trong chương trình" />
                                ) : (
                                    <>
                                        {groupedSubjects.map((group: any, idx: number) => (
                                            <Card
                                                key={idx}
                                                size="small"
                                                style={{ marginBottom: 16 }}
                                                title={
                                                    <Space>
                                                        <CalendarOutlined />
                                                        <strong>{group.semesterName}</strong>
                                                        <Tag color="cyan">{group.totalCredits} tín chỉ</Tag>
                                                        <Badge count={`${group.subjects.length} môn`} />
                                                    </Space>
                                                }
                                            >
                                                <Table
                                                    columns={subjectColumns}
                                                    dataSource={group.subjects}
                                                    rowKey={(record) =>
                                                        record.curriculumSubjectId?.toString()
                                                        || record.subjectId
                                                        || record.id
                                                        || Math.random().toString()
                                                    }
                                                    size="small"
                                                    pagination={false}
                                                />
                                            </Card>
                                        ))}

                                        {subjectsWithoutSemester.length > 0 && (
                                            <Card
                                                size="small"
                                                title={
                                                    <Space>
                                                        <WarningOutlined />
                                                        <strong>Chưa phân bổ học kỳ</strong>
                                                        <Badge count={`${subjectsWithoutSemester.length} môn`} />
                                                    </Space>
                                                }
                                            >
<Table
    columns={subjectColumns}
    dataSource={subjectsWithoutSemester}
    rowKey={(record) => 
        record.curriculumSubjectId?.toString() 
        || record.subjectId 
        || record.id 
        || Math.random().toString()
    }
    size="small"
    pagination={false}
/>
                                            </Card>
                                        )}
                                    </>
                                )}
                            </Spin>
                        </Card>
                    ) : (
                        <Card>
                            <div style={{ textAlign: 'center', padding: 50 }}>
                                <BookOutlined style={{ fontSize: 48, color: '#ccc' }} />
                                <p style={{ marginTop: 16, color: '#999' }}>
                                    Chọn một chương trình đào tạo để xem chi tiết
                                </p>
                            </div>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* Modals... (giữ nguyên như cũ) */}
            <Modal
                title={editingCurriculum ? 'Sửa chương trình đào tạo' : 'Thêm chương trình đào tạo mới'}
                open={modalVisible}
                onOk={handleSubmit}
                onCancel={() => setModalVisible(false)}
                width={600}
                okText={editingCurriculum ? 'Cập nhật' : 'Thêm mới'}
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="curriculumCode"
                        label="Mã chương trình"
                        rules={[{ required: true, message: 'Vui lòng nhập mã chương trình' }]}
                    >
                        <Input placeholder="VD: CTTT-CNTT-2024" />
                    </Form.Item>

                    <Form.Item
                        name="curriculumName"
                        label="Tên chương trình"
                        rules={[{ required: true, message: 'Vui lòng nhập tên chương trình' }]}
                    >
                        <Input placeholder="VD: Chương trình đào tạo Cử nhân Công nghệ thông tin" />
                    </Form.Item>

                    <Form.Item
                        name="major"
                        label="Ngành"
                        rules={[{ required: true, message: 'Vui lòng nhập ngành' }]}
                    >
                        <Input placeholder="VD: Công nghệ thông tin" />
                    </Form.Item>

                    <Form.Item
                        name="cohortYear"
                        label="Khóa"
                        rules={[{ required: true, message: 'Vui lòng nhập khóa' }]}
                    >
                        <InputNumber min={2000} max={2030} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="totalCredits"
                        label="Tổng số tín chỉ"
                        rules={[{ required: true, message: 'Vui lòng nhập tổng số tín chỉ' }]}
                    >
                        <InputNumber min={60} max={200} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="departmentId" label="Khoa/Viện">
                        <Input placeholder="VD: CNTT" />
                    </Form.Item>

                    {editingCurriculum && (
                        <Form.Item name="status" label="Trạng thái">
                            <Select>
                                <Select.Option value="ACTIVE">Đang áp dụng</Select.Option>
                                <Select.Option value="INACTIVE">Ngừng áp dụng</Select.Option>
                            </Select>
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            <Modal
                title="Thêm môn học vào chương trình"
                open={subjectModalVisible}
                onOk={handleSubmitSubject}
                onCancel={() => setSubjectModalVisible(false)}
                width={600}
                okText="Thêm môn"
                cancelText="Hủy"
            >
                <Form form={subjectForm} layout="vertical">
                    <Form.Item
                        name="subjectId"
                        label="Chọn môn học"
                        rules={[{ required: true, message: 'Vui lòng chọn môn học' }]}
                    >
                        <Select
                            showSearch
                            placeholder="Chọn môn học"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={availableSubjects.map(s => ({
                                label: `${s.subjectCode} - ${s.subjectName} (${s.credits} TC)`,
                                value: s.subjectId
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="subjectType"
                        label="Loại môn"
                        rules={[{ required: true, message: 'Vui lòng chọn loại môn' }]}
                    >
                        <Select>
                            <Select.Option value="CORE">Môn cốt lõi</Select.Option>
                            <Select.Option value="ELECTIVE">Môn tự chọn</Select.Option>
                            <Select.Option value="GENERAL">Môn đại cương</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="recommendedSemester"
                        label="Học kỳ khuyến nghị"
                        rules={[{ required: true, message: 'Vui lòng chọn học kỳ' }]}
                    >
                        <InputNumber min={1} max={10} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="isRequired" label="Môn bắt buộc">
                        <Select>
                            <Select.Option value={true}>Bắt buộc</Select.Option>
                            <Select.Option value={false}>Tự chọn</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CurriculumManagement;