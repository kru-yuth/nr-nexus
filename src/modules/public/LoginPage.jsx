import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { loginWithGoogle } from '../../services/auth';

const LoginPage = () => {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (user && role) {
            const from = location.state?.from?.pathname;
            if (from) {
                navigate(from, { replace: true });
            } else {
                // Redirect based on role
                switch (role) {
                    case 'admin': navigate('/admin'); break;
                    case 'teacher': navigate('/teacher'); break;
                    case 'parent': navigate('/parent'); break;
                    default: navigate('/student');
                }
            }
        }
    }, [user, role, navigate, location]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md w-full text-center">
                <div className="mb-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">NR Nexus</h1>
                    <p className="text-gray-500">School Management System</p>
                </div>

                <button
                    onClick={loginWithGoogle}
                    className="w-full bg-white border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition duration-300 flex items-center justify-center gap-3"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
