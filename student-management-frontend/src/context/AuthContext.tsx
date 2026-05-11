import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

interface JwtPayload {
    sub: string;
    username: string;
    fullName?: string;
    role: string;
    advisorId?: string;
    teacherId?: string;
    studentId?: string;
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: any | null;
    login: (token: string) => void;
    logout: () => void;
}

// Tạo AuthContext
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tạo useAuth hook - THÊM DÒNG NÀY
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<any | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser(decoded);
                setIsAuthenticated(true);
                // Set token cho axios
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } catch (err) {
                localStorage.removeItem('token');
            }
        }
    }, []);

    const login = (token: string) => {
        localStorage.setItem('token', token);
        const decoded = jwtDecode<JwtPayload>(token);

        // Set token cho axios
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const role =
            decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
            decoded.role ||
            'UNKNOWN';

        console.log('Decoded token:', decoded);

        setUser({
            id: decoded.sub,
            username: decoded.username,
            fullName: decoded.fullName,
            role: decoded.role,
            advisorId: decoded.advisorId,
            teacherId: decoded.teacherId,
            studentId: decoded.studentId,
        });

        setIsAuthenticated(true);

        console.log('Login success - isAuthenticated:', true, 'role:', role);
        console.log('User sau login:', {
            role,
            advisorId: decoded.advisorId,
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};