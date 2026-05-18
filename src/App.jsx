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
import TeacherDashboard from './modules/teacher/TeacherDashboard';
import StudentDashboard from './modules/student/StudentDashboard';
import LateCheckin from './modules/student/LateCheckin';
import CheckinSuccess from './modules/student/CheckinSuccess';
import BehaviorHistory from './modules/student/BehaviorHistory';
import VolunteerGallery from './modules/student/VolunteerGallery';
import ParentDashboard from './modules/parent/ParentDashboard';
import AppHub from './modules/AppHub';

function App() {
  return (
    <LanguageProvider>
      <Toaster position="top-center" reverseOrder={false} />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

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
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/volunteer" element={<VolunteerAdmin />} />
                    <Route path="/late-checkin" element={<LateCheckinDashboard />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
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
                  </Routes>
                </ProtectedRoute>
              }
            />

            <Route
              path="/volunteer-gallery"
              element={<VolunteerGallery />}
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
