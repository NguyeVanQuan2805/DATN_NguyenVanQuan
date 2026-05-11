// src/pages/admin/AccountsManagement.tsx
import React, { useEffect, useState } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Switch,
    message,
    Spin,
    Space,
    Tag,
    Tooltip,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, KeyOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;

// Cập nhật interface đầy đủ các trường cần dùng
interface AccountItem {
    accountId: string;
    username: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    gender: string | null;          // 'M', 'F', 'O' hoặc null
    dateOfBirth: string | null;     // format từ backend: "yyyy-MM-dd" hoặc null
    role: 'ADMIN' | 'TEACHER' | 'ADVISOR' | 'STUDENT';
    isActive: boolean;
    createdAt: string;
}

const AccountsManagement: React.FC = () => {
    const [accounts, setAccounts] = useState<AccountItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/Accounts');
            // Đảm bảo dữ liệu trả về có các trường cần thiết
            setAccounts(res.data);
        } catch (err) {
            console.error('Lỗi tải danh sách tài khoản:', err);
            message.error('Không thể tải danh sách tài khoản. Vui lòng thử lại!');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Tên đăng nhập',
            dataIndex: 'username',
            key: 'username',
            width: 150,
        },
        {
            title: 'Họ và tên',
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => {
                const colorMap: Record<string, string> = {
                    ADMIN: 'red',
                    TEACHER: 'green',
                    ADVISOR: 'purple',
                    STUDENT: 'blue',
                };
                return <Tag color={colorMap[role] || 'default'}>{role}</Tag>;
            },
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (text: string | null) => text || '-',
        },
        {
            title: 'SĐT',
            dataIndex: 'phone',
            key: 'phone',
            render: (text: string | null) => text || '-',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (active: boolean) => (
                <Tag color={active ? 'success' : 'error'}>
                    {active ? 'Hoạt động' : 'Khóa'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 220,
            render: (_: any, record: AccountItem) => (
                <Space size="middle">
                    <Tooltip title="Sửa thông tin">
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Đặt lại mật khẩu">
                        <Button
                            icon={<KeyOutlined />}
                            onClick={() => handleResetPassword(record.accountId)}
                        />
                    </Tooltip>
                    <Tooltip title="Xóa tài khoản">
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record.accountId, record.isActive)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const handleAdd = () => {
        form.resetFields();
        setEditingAccount(null);
        setIsModalOpen(true);
    };

    const handleEdit = (record: AccountItem) => {
        // Chuyển đổi dateOfBirth từ string sang dayjs object
        const formattedDateOfBirth = record.dateOfBirth
            ? dayjs(record.dateOfBirth)  // dayjs tự động parse "yyyy-MM-dd"
            : null;

        form.setFieldsValue({
            accountId: record.accountId,
            username: record.username,
            fullName: record.fullName,
            email: record.email,
            phone: record.phone,
            gender: record.gender,
            dateOfBirth: formattedDateOfBirth,
            role: record.role,
            isActive: record.isActive,
        });

        setEditingAccount(record);
        setIsModalOpen(true);
    };

    const handleDelete = (accountId: string, isActive: boolean) => {
        if (isActive) {
            message.error('Không thể xóa tài khoản đang hoạt động! Vui lòng khóa trước.');
            return;
        }

        Modal.confirm({
            title: 'Xác nhận xóa tài khoản?',
            content: (
                <>
                    <p>Tài khoản này sẽ bị xóa vĩnh viễn.</p>
                    <p style={{ color: 'red' }}>
                        <WarningOutlined /> Hành động này không thể hoàn tác!
                    </p>
                </>
            ),
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await api.delete(`/Accounts/${accountId}`);
                    message.success('Xóa tài khoản thành công');
                    fetchAccounts();
                } catch (err: any) {
                    const msg = err.response?.data || 'Không thể xóa tài khoản (có thể đang liên kết dữ liệu)';
                    message.error(msg);
                }
            },
        });
    };

    const handleResetPassword = (accountId: string) => {
        Modal.confirm({
            title: 'Đặt lại mật khẩu?',
            content: 'Mật khẩu sẽ được reset về: 123456',
            okText: 'Xác nhận',
            okType: 'danger',
            onOk: async () => {
                try {
                    await api.put(`/Accounts/${accountId}/reset-password`, {
                        newPassword: "123456"
                    });
                    message.success('Đặt lại mật khẩu thành công!');
                } catch (err: any) {
                    message.error(err.response?.data?.message || 'Lỗi reset mật khẩu');
                }
            }
        });
    };

    const onFinish = async (values: any) => {
        try {
            if (editingAccount) {
                const payload = {
                    accountId: editingAccount.accountId,
                    username: editingAccount.username,
                    fullName: values.fullName,
                    email: values.email,
                    phone: values.phone,
                    gender: values.gender,
                    dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
                    role: editingAccount.role,  
                    isActive: values.isActive
                };

                await api.put(`/Accounts/${editingAccount.accountId}`, payload);
                message.success('Cập nhật thông tin thành công');
            } else {
                const payload = {
                    ...values,
                    dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
                    password: values.password,
                };

                await api.post('/Accounts', payload);
                message.success('Thêm tài khoản mới thành công');
            }

            setIsModalOpen(false);
            form.resetFields();
            fetchAccounts();
        } catch (err: any) {
            let errorMessage = 'Lỗi không xác định. Vui lòng thử lại!';

            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data === 'string') {
                    errorMessage = data;
                }
                else if (data.errors) {
                    const firstErrorKey = Object.keys(data.errors)[0];
                    const firstErrorMsg = data.errors[firstErrorKey]?.[0] || 'Dữ liệu không hợp lệ';
                    errorMessage = `${firstErrorKey}: ${firstErrorMsg}`;
                }
                else if (data.message) {
                    errorMessage = data.message;
                }
                else if (data.title) {
                    errorMessage = data.title + (data.status ? ` (mã lỗi: ${data.status})` : '');
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            message.error(errorMessage);
            console.error('Lỗi submit tài khoản:', err);
        }
    };

    return (
        <div style={{ padding: '0 24px' }}>
            <h2>Quản lý tài khoản</h2>

            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                style={{ marginBottom: 16 }}
            >
                Thêm tài khoản mới
            </Button>

            <Table
                columns={columns}
                dataSource={accounts}
                rowKey="accountId"
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
            />

            {/* Modal Thêm/Sửa */}
            <Modal
                title={editingAccount ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={700}
            >
                <Form form={form} onFinish={onFinish} layout="vertical">
                    <Form.Item name="accountId" hidden>
                        <Input />
                    </Form.Item>

                    {/* Tên đăng nhập */}
                    <Form.Item
                        name="username"
                        label="Tên đăng nhập"
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên đăng nhập!' },
                            { min: 4, message: 'Tên đăng nhập phải ít nhất 4 ký tự!' },
                        ]}
                    >
                        <Input
                            placeholder="VD: admin01, teacher01, student01"
                            disabled={!!editingAccount} // Không cho sửa username
                        />
                    </Form.Item>

                    {/* Mật khẩu - chỉ hiện khi thêm mới */}
                    {!editingAccount && (
                        <Form.Item
                            name="password"
                            label="Mật khẩu ban đầu"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu ban đầu!' }]}
                        >
                            <Input.Password placeholder="Nhập mật khẩu" />
                        </Form.Item>
                    )}

                    {/* Họ và tên */}
                    <Form.Item
                        name="fullName"
                        label="Họ và tên"
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                    >
                        <Input placeholder="VD: Nguyễn Văn A" />
                    </Form.Item>

                    {/* Email */}
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ type: 'email', message: 'Email không hợp lệ!' }]}
                    >
                        <Input placeholder="VD: example@university.edu.vn" />
                    </Form.Item>

                    {/* Số điện thoại */}
                    <Form.Item name="phone" label="Số điện thoại" rules={[
                        { max: 15, message: 'SĐT không được quá 10 ký tự!' },
                        {
                            pattern: /^[0-9]+$/,
                            message: 'SĐT chỉ được chứa số!'
                        }
                    ]}>
                        <Input placeholder="VD: 0912345678" />

                    </Form.Item>

                    {/* Ngày sinh */}
                    <Form.Item name="dateOfBirth" label="Ngày sinh">
                        <DatePicker
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                            placeholder="Chọn ngày sinh"
                        />
                    </Form.Item>

                    {/* Giới tính */}
                    <Form.Item name="gender" label="Giới tính">
                        <Select placeholder="Chọn giới tính" allowClear>
                            <Option value="M">Nam</Option>
                            <Option value="F">Nữ</Option>
                            <Option value="O">Khác</Option>
                        </Select>
                    </Form.Item>

                    {/* Vai trò */}
                    <Form.Item
                        name="role"
                        label="Vai trò"
                        rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
                    >
                        <Select placeholder="Chọn vai trò">
                            <Option value="ADMIN">Quản trị viên (ADMIN)</Option>
                            <Option value="TEACHER">Giảng viên (TEACHER)</Option>
                            <Option value="ADVISOR">Cố vấn học tập (ADVISOR)</Option>
                            <Option value="STUDENT">Sinh viên (STUDENT)</Option>
                        </Select>
                    </Form.Item>

                    {/* Trạng thái hoạt động */}
                    <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                        <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            {editingAccount ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                        <Button style={{ marginLeft: 8 }} onClick={() => setIsModalOpen(false)}>
                            Hủy
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AccountsManagement;