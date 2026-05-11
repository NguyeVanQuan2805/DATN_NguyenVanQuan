// src/components/ProtectedRoute.tsx
import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LayoutAdmin from './LayoutAdmin';
import LayoutStudent from './LayoutStudent';
import LayoutAdvisor from './LayoutAdvisor';
import LayoutTeacher from './LayoutTeacher';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, user } = useContext(AuthContext)!;
    const location = useLocation();

    // Log để debug
    console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);
    console.log('ProtectedRoute - user:', user);
    console.log('ProtectedRoute - path:', location.pathname);

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Xác định layout dựa trên role
    switch (user?.role) {
        case 'STUDENT':
            console.log('Routing to STUDENT layout');
            return (
                <LayoutStudent>
                    <Outlet />
                </LayoutStudent>
            );

        case 'ADVISOR':
            console.log('Routing to ADVISOR layout');
            return (
                <LayoutAdvisor>
                    <Outlet />
                </LayoutAdvisor>
            );

        case 'TEACHER':
            console.log('Routing to TEACHER layout');
            return (
                <LayoutTeacher>
                    <Outlet />
                </LayoutTeacher>
            );

        case 'ADMIN':
            console.log('Routing to ADMIN layout - role detected:', user.role);
            return (
                <LayoutAdmin>
                    <Outlet />
                </LayoutAdmin>
            );

        default:
            console.log('Unknown role:', user?.role);
            return <Navigate to="/unauthorized" replace />;
    }
};

export default ProtectedRoute;