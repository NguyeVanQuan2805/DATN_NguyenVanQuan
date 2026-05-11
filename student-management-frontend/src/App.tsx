// src/App.tsx
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute'; // Layout phân nhánh theo role
import Login from './pages/Login'; // Trang đăng nhập chung
import { AuthContext } from './context/AuthContext';
import NotificationsPage from './pages/shared/NotificationsPage';


// Import các trang theo role 
import DashboardStudent from './pages/student/DashboardStudent';
import Registration from './pages/student/Registration';
import PersonalSchedule from './pages/student/PersonalSchedule';
import MyGrades from './pages/student/MyGrades';
import StudentCurriculum from './pages/student/StudentCurriculum';
import StudentGraduation from './pages/student/StudentGraduation';
import MyTuitions from './pages/student/MyTuitions';
import StudentWarnings from './pages/student/StudentWarnings';


import DashboardAdvisor from './pages/advisor/DashboardAdvisor';
import AdvisorStudents from './pages/advisor/AdvisorStudents';
import AdvisorWarnings from './pages/advisor/AdvisorWarnings';
import AdvisorRegistrations from './pages/advisor/AdvisorRegistrations';

import Attendance from './pages/teacher/Attendance';
import DashboardTeacher from './pages/teacher/DashboardTeacher';
import TeacherClasses from './pages/teacher/TeacherClasses';
import Grading from './pages/teacher/Grading';
import ClassDetail from './pages/teacher/ClassDetail';
import TeacherSchedule from './pages/teacher/TeacherSchedule';

// import Grading from './pages/teacher/Grading'; 

import DashboardAdmin from './pages/admin/DashboardAdmin';
import SubjectsManagement from './pages/admin/SubjectsManagement';
import ClassesManagement from './pages/admin/ClassesManagement';
import AccountsManagement from './pages/admin/AccountsManagement';
import MaintenancePage from './pages/admin/MaintenancePage';
import RegistrationListPage from './pages/admin/RegistrationListPage';
import RoomAndScheduleManagement from './pages/admin/RoomAndScheduleManagement';
import CurriculumManagement from './pages/admin/CurriculumManagement';
import SemesterManagement from './pages/admin/SemesterManagement';
import GraduationManagement from './pages/admin/GraduationManagement';
import NotificationsManagement from './pages/admin/NotificationsManagement';
import TuitionsManagement from './pages/admin/TuitionsManagement';
import PaymentConfig from './pages/admin/PaymentConfig';


// import ManageUsers from './pages/admin/ManageUsers'; // Uncomment khi có

import ProfilePage from './pages/shared/ProfilePage';
import Maintenance from './pages/Maintenance';
function App() {
    return (
        <Router>
            <Routes>
                {/* Trang đăng nhập - không cần bảo vệ */}
                <Route path="/login" element={<Login />} />
                <Route path="/maintenance" element={<Maintenance />} />

                <Route path="/notifications" element={<NotificationsPage />} />
                {/* Tất cả route bảo vệ sẽ đi qua ProtectedRoute */}
                {/* ProtectedRoute sẽ tự động chọn Layout tương ứng dựa trên role */}
                <Route element={<ProtectedRoute />}>
                    {/* Redirect root to appropriate dashboard */}
                    <Route index element={<Navigate to="/dashboard" replace />} />

                    {/* Dashboard by role */}
                    <Route path="dashboard" element={<DashboardRouter />} />

                    {/* STUDENT routes */}
                    <Route path="/dashboard-student" element={<DashboardStudent />} /> {/* optional: route riêng */}
                    <Route path="/registration" element={<Registration />} />
                    <Route path="/schedule" element={<PersonalSchedule />} />
                    <Route path="/grades" element={<MyGrades />} />
                    <Route path="/curriculum" element={<StudentCurriculum />} />
                    <Route path="/graduation" element={<StudentGraduation />} />
                    <Route path="/student/tuitions" element={<MyTuitions />} />
                    <Route path="/st_warnings" element={<StudentWarnings />} />


                    {/* ADVISOR routes */}
                    <Route path="/dashboard-advisor" element={<DashboardAdvisor />} />
                    <Route path="/students" element={<AdvisorStudents />} />
                    <Route path="/warnings" element={<AdvisorWarnings />} />
                    <Route path="/analytics" element={<AdvisorRegistrations />} />

                    {/* TEACHER routes */}
                    <Route path="/dashboard-teacher" element={<DashboardTeacher />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/teacher-classes" element={<TeacherClasses />} />
                    <Route path="/grading" element={<Grading />} />
                    <Route path="/teacher/class/:classId" element={<ClassDetail />} />
                    <Route path="/teacher/schedule" element={<TeacherSchedule />} />



                    {/* ADMIN routes */}
                    <Route path="/dashboard-admin" element={<DashboardAdmin />} />
                    <Route path="/subjects" element={<SubjectsManagement />} />
                    <Route path="/classes" element={<ClassesManagement />} />
                    <Route path="/accounts" element={<AccountsManagement />} />
                    <Route path="/maintenance-page" element={<MaintenancePage />} />
                    <Route path="/classes/:classId/registrations" element={<RegistrationListPage />} />
                    <Route path="/room-schedule" element={<RoomAndScheduleManagement />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="/admin/curriculums" element={<CurriculumManagement />} />
                    <Route path="/admin/semesters" element={<SemesterManagement />} />
                    <Route path="/admin/graduation" element={<GraduationManagement />} />
                    <Route path="/admin/notifications" element={<NotificationsManagement />} />
                    <Route path="/admin/tuitions" element={<TuitionsManagement />} />
                    <Route path="/admin/payment-config" element={<PaymentConfig />} />
                </Route>

                {/* Trang lỗi quyền */}
                <Route path="/unauthorized" element={
                    <div style={{ padding: '50px', textAlign: 'center' }}>
                        <h1>403 - Không có quyền truy cập</h1>
                        <p>Bạn không được phép vào trang này.</p>
                    </div>
                } />

                {/* Trang 404 */}
                <Route path="*" element={
                    <div style={{ padding: '50px', textAlign: 'center' }}>
                        <h1>404 - Không tìm thấy trang</h1>
                    </div>
                } />
            </Routes>
        </Router>
    );
}
const DashboardRouter: React.FC = () => {
    const { isAuthenticated, user } = useContext(AuthContext)!;

    switch (user?.role) {
        case 'STUDENT':
            return <DashboardStudent />;
        case 'ADVISOR':
            return <DashboardAdvisor />;
        case 'TEACHER':
            return <DashboardTeacher />;
        case 'ADMIN':
            return <DashboardAdmin />;
        default:
            return null;
    }
};

export default App;