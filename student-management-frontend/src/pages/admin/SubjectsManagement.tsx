import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    message,
    InputNumber,
    Popconfirm,
    Space,
    Typography,
    ConfigProvider,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import api from '../../services/api';

const { Title } = Typography;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Subject {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
    type: string;
    departmentId: string;
    departmentName: string;
    description?: string;
}

interface Department {
    departmentId: string;
    departmentName: string;
}

interface SubjectFormValues {
    subjectCode: string;
    subjectName: string;
    credits: number;
    type?: string;
    departmentId?: string;
    description?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SubjectsManagement = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm<SubjectFormValues>();

    useEffect(() => {
        fetchSubjects();
        fetchDepartments();
    }, []);

    // ─── Fetch data ─────────────────────────────────────────────────────────

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const res = await api.get<Subject[]>('/Subjects');
            setSubjects(res.data);
        } catch {
            message.error('Không thể tải danh sách môn học');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get<Department[]>('/Departments');
            setDepartments(res.data);
        } catch {
            console.warn('Không thể tải danh sách khoa');
        }
    };

    // ─── Search filter ───────────────────────────────────────────────────────

    const filteredSubjects = subjects.filter((s) => {
        const keyword = searchText.toLowerCase();
        return (
            s.subjectCode.toLowerCase().includes(keyword) ||
            s.subjectName.toLowerCase().includes(keyword) ||
            (s.departmentName?.toLowerCase().includes(keyword) ?? false)
        );
    });

    // ─── Handlers ───────────────────────────────────────────────────────────

    const handleAdd = () => {
        form.resetFields();
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (record: Subject) => {
        form.setFieldsValue({
            subjectCode: record.subjectCode,
            subjectName: record.subjectName,
            credits: record.credits,
            type: record.type,
            departmentId: record.departmentId,
            description: record.description,
        });
        setEditingId(record.subjectId);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/Subjects/${id}`);
            message.success('Xóa môn học thành công');
            fetchSubjects();
        } catch (err: any) {
            const errorMsg =
                err.response?.data?.message ||
                'Không thể xóa môn học đang được sử dụng trong lớp học phần';
            message.error(errorMsg);
        }
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const onFinish = async (values: SubjectFormValues) => {
        try {
            setSaving(true);
            if (editingId) {
                await api.put(`/Subjects/${editingId}`, { ...values, subjectId: editingId });
                message.success('Cập nhật môn học thành công');
            } else {
                await api.post('/Subjects', values);
                message.success('Thêm môn học thành công');
            }
            handleCancel();
            fetchSubjects();
        } catch (err: any) {
            const data = err.response?.data;
            let errorMessage = 'Lỗi khi lưu môn học. Vui lòng thử lại!';

            if (typeof data === 'string') {
                errorMessage = data;
            } else if (data?.message) {
                errorMessage = data.message;
            } else if (data?.errors) {
                const firstKey = Object.keys(data.errors)[0];
                errorMessage = data.errors[firstKey]?.[0] ?? 'Dữ liệu không hợp lệ';
            }

            const isDuplicate = ['trùng', 'duplicate', 'unique'].some((kw) =>
                errorMessage.toLowerCase().includes(kw)
            );
            message.error(isDuplicate ? 'Mã môn học đã tồn tại trong hệ thống!' : errorMessage);
        } finally {
            setSaving(false);
        }
    };

    // ─── Table columns ───────────────────────────────────────────────────────

    const columns = [
        {
            title: <span style={{ fontSize: '16px', fontWeight: 600 }}>Mã môn</span>,
            dataIndex: 'subjectCode',
            key: 'subjectCode',
            width: 120,
            sorter: (a: Subject, b: Subject) => a.subjectCode.localeCompare(b.subjectCode),
            render: (text: string) => <span style={{ fontSize: '15px' }}>{text}</span>,
        },
        {
            title: <span style={{ fontSize: '16px', fontWeight: 600 }}>Tên môn học</span>,
            dataIndex: 'subjectName',
            key: 'subjectName',
            sorter: (a: Subject, b: Subject) => a.subjectName.localeCompare(b.subjectName),
            render: (text: string) => <span style={{ fontSize: '15px', fontWeight: 500 }}>{text}</span>,
        },
        {
            title: <span style={{ fontSize: '16px', fontWeight: 600 }}>Số tín chỉ</span>,
            dataIndex: 'credits',
            key: 'credits',
            width: 110,
            align: 'center' as const,
            sorter: (a: Subject, b: Subject) => a.credits - b.credits,
            render: (text: number) => <span style={{ fontSize: '15px', fontWeight: 500 }}>{text}</span>,
        },
        {
            title: <span style={{ fontSize: '16px', fontWeight: 600 }}>Loại</span>,
            dataIndex: 'type',
            key: 'type',
            width: 110,
            filters: [
                { text: 'Bắt buộc', value: 'Bắt buộc' },
                { text: 'Tự chọn', value: 'Tự chọn' },
            ],
            onFilter: (value: any, record: Subject) => record.type === value,
            render: (text: string) => <span style={{ fontSize: '15px' }}>{text}</span>,
        },
        {
            title: <span style={{ fontSize: '16px', fontWeight: 600 }}>Khoa</span>,
            dataIndex: 'departmentName',
            key: 'departmentName',
            render: (text: string) => <span style={{ fontSize: '15px' }}>{text || '—'}</span>,
        },
        {
            title: <span style={{ fontSize: '16px', fontWeight: 600 }}>Hành động</span>,
            key: 'action',
            width: 150,
            render: (_: unknown, record: Subject) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        style={{ fontSize: '15px', height: 'auto' }}
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Xóa môn học"
                        description="Môn học có thể đang được dùng trong lớp học phần. Bạn có chắc chắn muốn xóa?"
                        okText="Xóa"
                        okButtonProps={{ danger: true }}
                        cancelText="Hủy"
                        onConfirm={() => handleDelete(record.subjectId)}
                    >
                        <Button type="link" danger icon={<DeleteOutlined />} style={{ fontSize: '15px', height: 'auto' }}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <ConfigProvider
            theme={{
                token: {
                    fontSize: 15,
                },
                components: {
                    Input: {
                        inputFontSize: 15,
                    },
                    Select: {
                        fontSize: 15,
                    },
                    Button: {
                        fontSize: 15,
                    },
                    Form: {
                        labelFontSize: 15,
                    },
                    Table: {
                        fontSize: 15,
                    },
                },
            }}
        >
            <div style={{ padding: '28px' }}>
                <Title level={2} style={{ marginBottom: 20, fontSize: '28px' }}>
                    Quản lý môn học
                </Title>

                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
                    <Input
                        placeholder="Tìm theo mã môn, tên môn hoặc khoa..."
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                        style={{ maxWidth: 400, fontSize: '15px' }}
                        size="large"
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
                        Thêm môn học mới
                    </Button>
                </div>

                {/* Table */}
                <Table
                    columns={columns}
                    dataSource={filteredSubjects}
                    rowKey="subjectId"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => <span style={{ fontSize: '15px' }}>Tổng {total} môn học</span>,
                    }}
                    locale={{ emptyText: 'Không có môn học nào' }}
                    size="middle"
                />

                {/* Modal thêm / sửa */}
                <Modal
                    title={<span style={{ fontSize: '20px', fontWeight: 600 }}>{editingId ? 'Sửa môn học' : 'Thêm môn học mới'}</span>}
                    open={isModalOpen}
                    onCancel={handleCancel}
                    footer={null}
                    afterClose={() => form.resetFields()}
                    width={600}
                >
                    <Form form={form} onFinish={onFinish} layout="vertical">
                        <Form.Item
                            name="subjectCode"
                            label={<span style={{ fontSize: '15px', fontWeight: 500 }}>Mã môn học</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập mã môn!' }]}
                        >
                            <Input placeholder="VD: IT101" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="subjectName"
                            label={<span style={{ fontSize: '15px', fontWeight: 500 }}>Tên môn học</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập tên môn!' }]}
                        >
                            <Input placeholder="VD: Lập trình Cơ bản" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="credits"
                            label={<span style={{ fontSize: '15px', fontWeight: 500 }}>Số tín chỉ</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập số tín chỉ!' }]}
                        >
                            <InputNumber min={1} max={10} style={{ width: '100%' }} size="large" />
                        </Form.Item>

                        <Form.Item
                            name="type"
                            label={<span style={{ fontSize: '15px', fontWeight: 500 }}>Loại môn học</span>}
                        >
                            <Select placeholder="Chọn loại môn học" size="large">
                                <Select.Option value="Bắt buộc">Bắt buộc</Select.Option>
                                <Select.Option value="Tự chọn">Tự chọn</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="departmentId"
                            label={<span style={{ fontSize: '15px', fontWeight: 500 }}>Khoa/Viện</span>}
                        >
                            <Select
                                placeholder="Chọn khoa (tùy chọn)"
                                allowClear
                                showSearch
                                optionFilterProp="children"
                                size="large"
                            >
                                {departments.map((d) => (
                                    <Select.Option key={d.departmentId} value={d.departmentId}>
                                        {d.departmentName}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label={<span style={{ fontSize: '15px', fontWeight: 500 }}>Mô tả</span>}
                        >
                            <Input.TextArea placeholder="Mô tả môn học (tùy chọn)" rows={3} style={{ fontSize: '15px' }} />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                            <Space>
                                <Button onClick={handleCancel} size="large">Hủy</Button>
                                <Button type="primary" htmlType="submit" loading={saving} size="large">
                                    {editingId ? 'Cập nhật' : 'Thêm mới'}
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </ConfigProvider>
    );
};

export default SubjectsManagement;