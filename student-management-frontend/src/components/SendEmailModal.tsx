// src/components/SendEmailModal.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Space } from 'antd';
import { MailOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface SendEmailModalProps {
    visible: boolean;
    studentEmail: string;
    studentName: string;
    onClose: () => void;
}

const SendEmailModal: React.FC<SendEmailModalProps> = ({
    visible,
    studentEmail,
    studentName,
    onClose
}) => {
    const [form] = Form.useForm();
    const [sending, setSending] = useState(false);

    const handleSend = async (values: any) => {
        setSending(true);
        try {
            // Tạo mailto link với nội dung
            const subject = encodeURIComponent(values.subject);
            const body = encodeURIComponent(values.body);
            window.location.href = `mailto:${studentEmail}?subject=${subject}&body=${body}`;

            message.success('Đã mở ứng dụng email mặc định');
            onClose();
            form.resetFields();
        } catch (err) {
            message.error('Không thể gửi email');
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            title={
                <Space>
                    <MailOutlined style={{ color: '#52c41a' }} />
                    <span>Gửi email cho {studentName}</span>
                </Space>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSend}
                initialValues={{
                    subject: `Thông báo từ cố vấn học tập - ${studentName}`,
                    body: `Gửi sinh viên ${studentName},\n\n`
                }}
            >
                <Form.Item
                    name="subject"
                    label="Tiêu đề"
                    rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                >
                    <Input placeholder="Nhập tiêu đề email" />
                </Form.Item>

                <Form.Item
                    name="body"
                    label="Nội dung"
                    rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
                >
                    <TextArea
                        rows={8}
                        placeholder="Nhập nội dung email..."
                    />
                </Form.Item>

                <Form.Item>
                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button onClick={onClose}>
                            Hủy
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={sending}
                            icon={<MailOutlined />}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        >
                            Mở ứng dụng email
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default SendEmailModal;