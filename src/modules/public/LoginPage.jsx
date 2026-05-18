import React, { useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { ShieldCheck, Info } from 'lucide-react';

const LoginPage = () => {
    const { user, roles, authError, login } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    
    const moduleMode = searchParams.get('module');
    const isDisciplineMode = moduleMode === 'discipline';

    useEffect(() => {
        if (user && roles && roles.length > 0) {
            console.log("LoginPage: Login Debug", { email: user.email, roles });
            const from = location.state?.from?.pathname;

            if (from) {
                navigate(from, { replace: true });
            } else {
                // Discipline Mode Redirect
                if (isDisciplineMode) {
                    if (roles.includes('student')) {
                        navigate('/student/late-checkin');
                    } else if (roles.includes('admin')) {
                        navigate('/admin-dashboard/late-checkin');
                    } else {
                        navigate('/hub');
                    }
                    return;
                }

                // Priority-based Redirection
                if (roles.includes('admin')) {
                    navigate('/admin-dashboard');
                } else {
                    // All other authenticated users go to App Hub first
                    navigate('/hub');
                }
            }
        }
    }, [user, roles, navigate, location, isDisciplineMode]);

    const handleLogin = async () => {
        try {
            await login();
        } catch (error) {
            console.error("LoginPage: Login failure", error);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 relative transition-colors duration-700 ${isDisciplineMode ? 'bg-[#1a5c38]' : 'bg-gradient-to-br from-green-500 to-emerald-600'}`}>
            <div className="absolute top-8 right-8">
                <LanguageSwitcher />
            </div>

            <div className={`bg-white p-10 shadow-2xl max-w-md w-full text-center transition-all duration-500 ${isDisciplineMode ? 'rounded-[3rem]' : 'rounded-2xl'}`}>
                <div className="mb-8">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isDisciplineMode ? 'bg-emerald-50 text-[#1a5c38]' : 'bg-green-100 text-green-600'}`}>
                        {isDisciplineMode ? <ShieldCheck size={40} /> : (
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        )}
                    </div>
                    <h1 className={`text-3xl font-black mb-2 tracking-tight ${isDisciplineMode ? 'text-[#1a5c38]' : 'text-gray-800'}`}>
                        {isDisciplineMode ? 'NR DISCIPLINE' : 'NR Nexus'}
                    </h1>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">{isDisciplineMode ? 'ระบบบริหารจัดการพฤติกรรม' : t('login_subtitle')}</p>
                </div>

                {isDisciplineMode && (
                    <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex gap-4 text-left items-start">
                        <Info className="text-[#1a5c38] shrink-0" size={20} />
                        <p className="text-emerald-900 text-xs font-bold leading-relaxed">
                            กรุณาล็อกอินด้วยอีเมลโรงเรียน <span className="underline italic">@nr.ac.th</span> เท่านั้น
                        </p>
                    </div>
                )}

                {authError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-bold">
                        {t(authError === 'whitelist_error' ? 'whitelist_error' :
                            authError === 'domain_error' ? 'domain_error' : 'login_error')}
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    className={`w-full bg-white border-2 font-black py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-4 group ${isDisciplineMode ? 'border-emerald-100 hover:border-[#1a5c38] hover:bg-emerald-50 text-slate-700' : 'border-gray-200 hover:border-green-500 hover:bg-green-50 text-gray-700'}`}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 transition-transform group-hover:scale-110" alt="Google" />
                    <span className="uppercase text-xs tracking-widest">{t('login_google')}</span>
                </button>
                
                {isDisciplineMode && (
                    <p className="mt-8 text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-loose">
                        หากล็อกอินไม่ได้ หรือไม่พบข้อมูล <br/> 
                        <span className="text-[#1a5c38]/40 italic">โปรดติดต่อครูผู้ดูแลระบบ (งานเทคโนโลยีสารสนเทศ)</span>
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
