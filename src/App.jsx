import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/common/ProtectedRoute';


// Pages
import LoginPage from './modules/public/LoginPage';
import AdminDashboard from './modules/admin/AdminDashboard';
import UserManagement from './modules/admin/UserManagement';
import VolunteerAdmin from './modules/admin/VolunteerAdmin';
import LateCheckinDashboard from './modules/admin/LateCheckinDashboard';
import AttendanceAdminDashboard from './modules/admin/AttendanceAdminDashboard';
import TeacherDashboard from './modules/teacher/TeacherDashboard';
import SubjectSetup from './modules/teacher/SubjectSetup';
import AttendanceSetup from './modules/teacher/AttendanceSetup';
import AttendanceGrid from './modules/teacher/AttendanceGrid';
import HomeroomDashboard from './modules/teacher/HomeroomDashboard';
import StudentAttendanceDetail from './modules/teacher/StudentAttendanceDetail';
import StudentDashboard from './modules/student/StudentDashboard';
import StudentAttendance from './modules/student/StudentAttendance';
import LateCheckin from './modules/student/LateCheckin';
import CheckinSuccess from './modules/student/CheckinSuccess';
import BehaviorHistory from './modules/student/BehaviorHistory';
import VolunteerGallery from './modules/student/VolunteerGallery';
import ParentDashboard from './modules/parent/ParentDashboard';
import AppHub from './modules/AppHub';

// Student Care / SDQ Pages
import TeacherSDQPage from './components/StudentCare/TeacherSDQPage';
import ParentSDQPage from './components/StudentCare/ParentSDQPage';
import StudentSDQPage from './components/StudentCare/StudentSDQPage';
import TeacherCareDashboard from './components/StudentCare/TeacherCareDashboard';
import CareCaseDetailPage from './components/StudentCare/CareCaseDetailPage';

function App() {
  return (
    <LanguageProvider>
      <Toaster position="top-center" reverseOrder={false} />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/sdq/parent/:token" element={<ParentSDQPage />} />

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected Routes */}
            <Route
              path="/hub"
              element={
                <ProtectedRoute>
                  <AppHub />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-dashboard/*"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']} allowedPermissions={['discipline.write', 'discipline.read', 'attendance.read']}>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/volunteer" element={<VolunteerAdmin />} />
                    <Route path="/late-checkin" element={<LateCheckinDashboard />} />
                    <Route path="/attendance" element={<AttendanceAdminDashboard />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <Routes>
                    <Route path="/" element={<TeacherDashboard />} />
                    <Route path="/subjects" element={<SubjectSetup />} />
                    <Route path="/attendance/checkin" element={<AttendanceSetup />} />
                    <Route path="/attendance-setup" element={<AttendanceSetup />} />
                    <Route path="/attendance/:sessionId" element={<AttendanceGrid />} />
                    <Route path="/homeroom" element={<HomeroomDashboard />} />
                    <Route path="/homeroom/student/:studentId" element={<StudentAttendanceDetail />} />
                    <Route path="/homeroom/care" element={<TeacherCareDashboard />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/*"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Routes>
                    <Route path="/" element={<StudentDashboard />} />
                    <Route path="/late-checkin" element={<LateCheckin />} />
                    <Route path="/late-checkin/success" element={<CheckinSuccess />} />
                    <Route path="/behavior-history" element={<BehaviorHistory />} />
                    <Route path="/attendance" element={<StudentAttendance />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            <Route
              path="/volunteer-gallery"
              element={<VolunteerGallery />}
            />

            <Route
              path="/student-care/sdq/teacher/:studentId"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherSDQPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student-care/sdq/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentSDQPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student-care/case/:caseId"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <CareCaseDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/parent/*"
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
