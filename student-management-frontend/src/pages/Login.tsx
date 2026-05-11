import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);
    const { login } = useContext(AuthContext)!;
    const navigate = useNavigate();

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            message.warning('Vui lòng điền đầy đủ thông tin!');
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('/Auth/login', { username, password });
            if (!response.data.token) throw new Error('Backend không trả token');
            login(response.data.token);
            message.success('Đăng nhập thành công!');
            navigate('/', { replace: true });
        } catch (err: any) {
            const errorMsg = err.response?.data || err.message || 'Đăng nhập thất bại';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Nunito+Sans:wght@300;400;500;600&display=swap');

                *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

                .kb-root {
                    min-height: 100vh;
                    display: flex;
                    font-family: 'Nunito Sans', sans-serif;
                    background: #f5f0e8;
                    overflow: hidden;
                    position: relative;
                }

                /* ── Background Texture ── */
                .kb-bg-pattern {
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    background-image:
                        radial-gradient(circle at 15% 85%, rgba(184,142,64,0.08) 0%, transparent 50%),
                        radial-gradient(circle at 85% 10%, rgba(14,42,84,0.06) 0%, transparent 50%);
                }
                .kb-bg-texture {
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    opacity: 0.025;
                    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                }

                /* ── Left panel ── */
                .kb-left {
                    flex: 1;
                    background: linear-gradient(160deg, #0e2a54 0%, #122d5a 40%, #0a1f3f 100%);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 52px 64px;
                    position: relative;
                    z-index: 1;
                    overflow: hidden;
                }

                /* Decorative gold lines */
                .kb-left::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, transparent, #b88e40, #d4a84b, #b88e40, transparent);
                }
                .kb-left::after {
                    content: '';
                    position: absolute;
                    bottom: 0; left: 0; right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(184,142,64,0.3), transparent);
                }

                /* Decorative circle */
                .kb-deco-circle {
                    position: absolute;
                    width: 500px; height: 500px;
                    border-radius: 50%;
                    border: 1px solid rgba(184,142,64,0.08);
                    bottom: -160px; right: -120px;
                    pointer-events: none;
                }
                .kb-deco-circle-inner {
                    position: absolute;
                    width: 340px; height: 340px;
                    border-radius: 50%;
                    border: 1px solid rgba(184,142,64,0.06);
                    bottom: -80px; right: -40px;
                    pointer-events: none;
                }
                .kb-deco-dot-grid {
                    position: absolute;
                    top: 48px; right: 56px;
                    display: grid;
                    grid-template-columns: repeat(6, 8px);
                    grid-template-rows: repeat(6, 8px);
                    gap: 8px;
                    opacity: 0.12;
                    pointer-events: none;
                }
                .kb-deco-dot-grid span {
                    width: 2px; height: 2px;
                    border-radius: 50%;
                    background: #b88e40;
                }

                /* Logo zone */
                .kb-logo-zone {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    animation: kb-fadeUp 0.7s ease both;
                }
                .kb-crest {
                    width: 64px; height: 64px;
                    border: 2px solid rgba(184,142,64,0.6);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: rgba(184,142,64,0.06);
                    position: relative;
                }
                .kb-crest::before {
                    content: '';
                    position: absolute;
                    inset: 4px;
                    border-radius: 50%;
                    border: 1px solid rgba(184,142,64,0.25);
                }
                .kb-crest svg { color: #b88e40; }
                .kb-school-name-wrap {}
                .kb-school-short {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: #b88e40;
                    line-height: 1;
                    margin-bottom: 4px;
                }
                .kb-school-full {
                    font-family: 'Nunito Sans', sans-serif;
                    font-size: 11px;
                    color: rgba(255,255,255,0.35);
                    letter-spacing: 0.04em;
                }

                /* Hero text */
                .kb-hero {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 48px 0;
                }
                .kb-gold-rule {
                    width: 40px; height: 2px;
                    background: linear-gradient(90deg, #b88e40, #d4a84b);
                    margin-bottom: 24px;
                    animation: kb-fadeUp 0.7s ease 0.1s both;
                }
                .kb-hero-title {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: clamp(38px, 4.2vw, 60px);
                    font-weight: 600;
                    line-height: 1.12;
                    color: #f5f0e8;
                    margin-bottom: 20px;
                    animation: kb-fadeUp 0.7s ease 0.15s both;
                }
                .kb-hero-title em {
                    font-style: italic;
                    color: #c9a055;
                }
                .kb-hero-desc {
                    font-size: 14px;
                    line-height: 1.75;
                    color: rgba(255,255,255,0.38);
                    max-width: 380px;
                    animation: kb-fadeUp 0.7s ease 0.25s both;
                }

                /* Stats */
                .kb-stats {
                    display: flex;
                    gap: 0;
                    border-top: 1px solid rgba(184,142,64,0.12);
                    padding-top: 32px;
                    animation: kb-fadeUp 0.7s ease 0.35s both;
                }
                .kb-stat {
                    flex: 1;
                    padding-right: 28px;
                }
                .kb-stat + .kb-stat {
                    padding-left: 28px;
                    padding-right: 28px;
                    border-left: 1px solid rgba(184,142,64,0.12);
                }
                .kb-stat:last-child { padding-right: 0; }
                .kb-stat-num {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 30px;
                    font-weight: 700;
                    color: #c9a055;
                    line-height: 1;
                }
                .kb-stat-label {
                    font-size: 11px;
                    color: rgba(255,255,255,0.3);
                    margin-top: 5px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }

                /* ── Right panel ── */
                .kb-right {
                    width: 500px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 52px;
                    position: relative;
                    z-index: 1;
                }

                /* Form card */
                .kb-card {
                    width: 100%;
                    animation: kb-slideIn 0.75s cubic-bezier(0.16,1,0.3,1) 0.1s both;
                }

                .kb-card-header {
                    margin-bottom: 36px;
                }
                .kb-card-eyebrow {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 14px;
                }
                .kb-eyebrow-line {
                    height: 1px;
                    width: 24px;
                    background: #b88e40;
                }
                .kb-eyebrow-text {
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: #b88e40;
                }
                .kb-card-title {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 34px;
                    font-weight: 700;
                    color: #0e2a54;
                    line-height: 1.15;
                    margin-bottom: 8px;
                }
                .kb-card-sub {
                    font-size: 13px;
                    color: #8a8278;
                }

                /* Fields */
                .kb-field {
                    margin-bottom: 22px;
                }
                .kb-label {
                    display: block;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: #8a8278;
                    margin-bottom: 8px;
                    transition: color 0.2s;
                }
                .kb-label.active { color: #0e2a54; }

                .kb-input-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .kb-input-icon {
                    position: absolute;
                    left: 14px;
                    color: #c4b99a;
                    transition: color 0.2s;
                    pointer-events: none;
                    display: flex;
                }
                .kb-input-icon.active { color: #0e2a54; }

                .kb-input {
                    width: 100%;
                    background: #fff;
                    border: 1.5px solid #e0d9cc;
                    border-radius: 8px;
                    padding: 13px 44px;
                    font-family: 'Nunito Sans', sans-serif;
                    font-size: 14px;
                    color: #1a1612;
                    outline: none;
                    transition: all 0.25s;
                    -webkit-appearance: none;
                }
                .kb-input::placeholder { color: #c4b99a; }
                .kb-input:focus {
                    border-color: #0e2a54;
                    box-shadow: 0 0 0 3px rgba(14,42,84,0.07);
                }
                .kb-input:-webkit-autofill {
                    -webkit-box-shadow: 0 0 0 1000px #fff inset;
                    -webkit-text-fill-color: #1a1612;
                }

                .kb-eye-btn {
                    position: absolute;
                    right: 14px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #c4b99a;
                    display: flex;
                    padding: 4px;
                    transition: color 0.2s;
                }
                .kb-eye-btn:hover { color: #0e2a54; }

                /* Submit */
                .kb-submit {
                    width: 100%;
                    padding: 14px;
                    margin-top: 8px;
                    background: linear-gradient(135deg, #0e2a54 0%, #1a3d72 100%);
                    border: none;
                    border-radius: 8px;
                    font-family: 'Nunito Sans', sans-serif;
                    font-size: 14px;
                    font-weight: 600;
                    color: #f5f0e8;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
                    letter-spacing: 0.04em;
                }
                .kb-submit::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(184,142,64,0.6), transparent);
                }
                .kb-submit:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 28px rgba(14,42,84,0.28);
                }
                .kb-submit:active:not(:disabled) { transform: translateY(0); }
                .kb-submit:disabled { opacity: 0.6; cursor: not-allowed; }

                .kb-btn-inner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .kb-spinner {
                    width: 16px; height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #f5f0e8;
                    border-radius: 50%;
                    animation: kb-spin 0.7s linear infinite;
                }
                @keyframes kb-spin { to { transform: rotate(360deg); } }

                /* Divider */
                .kb-divider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 28px 0 0;
                }
                .kb-divider-line {
                    flex: 1;
                    height: 1px;
                    background: #e0d9cc;
                }
                .kb-divider-text {
                    font-size: 11px;
                    color: #b5a98a;
                    letter-spacing: 0.06em;
                    white-space: nowrap;
                }

                /* Roles */
                .kb-roles {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 14px;
                    flex-wrap: wrap;
                }
                .kb-role-chip {
                    background: #f5f0e8;
                    border: 1px solid #e0d9cc;
                    border-radius: 4px;
                    padding: 4px 12px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #8a8278;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }

                /* Footer note */
                .kb-footer-note {
                    margin-top: 28px;
                    padding: 14px 16px;
                    background: rgba(14,42,84,0.03);
                    border-left: 3px solid #b88e40;
                    border-radius: 0 6px 6px 0;
                }
                .kb-footer-note p {
                    font-size: 12px;
                    color: #8a8278;
                    line-height: 1.6;
                }
                .kb-footer-note strong {
                    color: #0e2a54;
                    font-weight: 600;
                }

                /* Animations */
                @keyframes kb-fadeUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes kb-slideIn {
                    from { opacity: 0; transform: translateX(28px); }
                    to   { opacity: 1; transform: translateX(0); }
                }

                /* ── Responsive ── */
                @media (max-width: 860px) {
                    .kb-root { flex-direction: column; }
                    .kb-left {
                        padding: 36px 28px 32px;
                        min-height: auto;
                    }
                    .kb-right {
                        width: 100%;
                        padding: 28px 24px 48px;
                    }
                    .kb-hero-title { font-size: 34px; }
                    .kb-deco-circle, .kb-deco-circle-inner { display: none; }
                }
            `}</style>

            <div className="kb-root">
                <div className="kb-bg-pattern" />
                <div className="kb-bg-texture" />

                {/* ── Left ── */}
                <div className="kb-left">
                    <div className="kb-deco-circle" />
                    <div className="kb-deco-circle-inner" />
                    <div className="kb-deco-dot-grid">
                        {Array.from({ length: 36 }).map((_, i) => (
                            <span key={i} />
                        ))}
                    </div>

                    {/* Logo */}
                    <div className="kb-logo-zone">
                        <div className="kb-crest">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div className="kb-school-name-wrap">
                            <div className="kb-school-short">ĐH Kinh Bắc</div>
                            <div className="kb-school-full">Trường Đại học Kinh Bắc — Est. 2008</div>
                        </div>
                    </div>

                    {/* Hero */}
                    <div className="kb-hero">
                        <div className="kb-gold-rule" />
                        <h1 className="kb-hero-title">
                            Hệ thống<br />
                            Quản lý<br />
                            <em>Học vụ</em>
                        </h1>
                        <p className="kb-hero-desc">
                            Cổng thông tin học vụ chính thức của Trường Đại học Kinh Bắc — tra cứu kết quả học tập, đăng ký môn học và theo dõi tiến độ đào tạo.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="kb-stats">
                        <div className="kb-stat">
                            <div className="kb-stat-num">4</div>
                            <div className="kb-stat-label">Vai trò</div>
                        </div>
                        <div className="kb-stat">
                            <div className="kb-stat-num">17+</div>
                            <div className="kb-stat-label">Tính năng</div>
                        </div>
                        <div className="kb-stat">
                            <div className="kb-stat-num">24/7</div>
                            <div className="kb-stat-label">Trực tuyến</div>
                        </div>
                    </div>
                </div>

                {/* ── Right ── */}
                <div className="kb-right">
                    <div className="kb-card">
                        <div className="kb-card-header">
                            <div className="kb-card-eyebrow">
                                <span className="kb-eyebrow-line" />
                                <span className="kb-eyebrow-text">Cổng đăng nhập</span>
                            </div>
                            <div className="kb-card-title">
                                Chào mừng<br />trở lại
                            </div>
                            <div className="kb-card-sub">Vui lòng đăng nhập để sử dụng hệ thống</div>
                        </div>

                        <form onSubmit={onSubmit} autoComplete="off">
                            {/* Username */}
                            <div className="kb-field">
                                <label
                                    className={`kb-label ${focused === 'username' ? 'active' : ''}`}
                                    htmlFor="username"
                                >
                                    Tên đăng nhập
                                </label>
                                <div className="kb-input-wrap">
                                    <span className={`kb-input-icon ${focused === 'username' ? 'active' : ''}`}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </span>
                                    <input
                                        id="username"
                                        className="kb-input"
                                        type="text"
                                        placeholder="Mã sinh viên / tài khoản"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        onFocus={() => setFocused('username')}
                                        onBlur={() => setFocused(null)}
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="kb-field">
                                <label
                                    className={`kb-label ${focused === 'password' ? 'active' : ''}`}
                                    htmlFor="password"
                                >
                                    Mật khẩu
                                </label>
                                <div className="kb-input-wrap">
                                    <span className={`kb-input-icon ${focused === 'password' ? 'active' : ''}`}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </span>
                                    <input
                                        id="password"
                                        className="kb-input"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Nhập mật khẩu của bạn"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onFocus={() => setFocused('password')}
                                        onBlur={() => setFocused(null)}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="kb-eye-btn"
                                        onClick={() => setShowPassword(p => !p)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="kb-submit"
                                disabled={loading}
                            >
                                <span className="kb-btn-inner">
                                    {loading ? (
                                        <>
                                            <span className="kb-spinner" />
                                            Đang xác thực...
                                        </>
                                    ) : (
                                        <>
                                            Đăng nhập hệ thống
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                                <polyline points="12 5 19 12 12 19" />
                                            </svg>
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>

                        <div className="kb-divider">
                            <span className="kb-divider-line" />
                            <span className="kb-divider-text">Hỗ trợ đăng nhập cho</span>
                            <span className="kb-divider-line" />
                        </div>
                        <div className="kb-roles">
                            <span className="kb-role-chip">Admin</span>
                            <span className="kb-role-chip">Giảng viên</span>
                            <span className="kb-role-chip">Cố vấn</span>
                            <span className="kb-role-chip">Sinh viên</span>
                        </div>

                        <div className="kb-footer-note">
                            <p>
                                <strong>Lưu ý:</strong> Nếu quên mật khẩu, vui lòng liên hệ{' '}
                                <strong>Phòng Đào tạo</strong> hoặc cán bộ CNTT của trường để được hỗ trợ.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;