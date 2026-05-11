// src/pages/Maintenance.tsx
import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const Maintenance: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)'
        }}>
            <Result
                status="warning"
                title="Hệ thống đang bảo trì"
                subTitle="Chúng tôi đang nâng cấp hệ thống để phục vụ bạn tốt hơn. Vui lòng quay lại sau."
                extra={[
                    <Button
                        type="primary"
                        key="console"
                        onClick={() => navigate('/login')}
                        style={{ background: '#722ed1', borderColor: '#722ed1' }}
                    >
                        Quay lại đăng nhập
                    </Button>
                ]}
            />
        </div>
    );
};

export default Maintenance;