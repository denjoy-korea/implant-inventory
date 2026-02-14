import React, { useState, useEffect } from 'react';
import { User, UserRole, Hospital } from '../types';

interface AuthFormProps {
  type: 'login' | 'signup';
  onSuccess: (user: User) => void;
  onSwitch: () => void;
}

type SignupStep = 'role_selection' | 'form_input';
type UserType = 'dentist' | 'staff';

const AuthForm: React.FC<AuthFormProps> = ({ type, onSuccess, onSwitch }) => {
  const [step, setStep] = useState<SignupStep>('role_selection');
  const [userType, setUserType] = useState<UserType | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [errorStatus, setErrorStatus] = useState<{ message: string; showSignup: boolean } | null>(null);

  // Reset state when switching between login/signup
  useEffect(() => {
    setErrorStatus(null);
    setStep('role_selection');
    setUserType(null);
    setEmail('');
    setPassword('');
    setName('');
    setHospitalName('');
  }, [type]);

  const handleRoleSelect = (selectedType: UserType) => {
    setUserType(selectedType);
    setStep('form_input');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);

    const storedUsersJson = localStorage.getItem('app_users');
    const users = storedUsersJson ? JSON.parse(storedUsersJson) : [];

    const storedHospitalsJson = localStorage.getItem('app_hospitals');
    const hospitals = storedHospitalsJson ? JSON.parse(storedHospitalsJson) : [];

    if (type === 'signup') {
      // Validation based on user type
      if (!name || !email || !password) {
        alert("모든 필드를 입력해주세요.");
        return;
      }

      if (userType === 'dentist' && !hospitalName) {
        alert("병원명을 입력해주세요.");
        return;
      }

      // Email duplication check
      if (users.some((u: any) => u.email === email)) {
        setErrorStatus({ message: "이미 등록된 이메일/아이디입니다.", showSignup: false });
        return;
      }

      let newUser: User;

      if (userType === 'dentist') {
        // 1. Create Hospital
        const newHospitalId = `hosp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newHospital: Hospital = {
          id: newHospitalId,
          name: hospitalName,
          masterAdminId: email,
          createdAt: new Date().toISOString()
        };
        hospitals.push(newHospital);
        localStorage.setItem('app_hospitals', JSON.stringify(hospitals));

        // 2. Create Master User (Active)
        newUser = {
          name,
          email,
          role: 'master',
          hospitalId: newHospitalId,
          status: 'active'
        };
        // Password handling (Note: In a real app, this wouldn't be in the User object like this)
        (newUser as any).password = password;
      } else {
        // Staff Signup (Pending, No Hospital yet)
        // They will need to "Join" a hospital later, or we can ask for hospital code here.
        // For now, let's set them as 'staff' with no hospitalId (or a placeholder) and status 'pending'.
        // Actually, usually staff signs up given a code, or they search for a hospital.
        // Let's assume they search AFTER login.
        newUser = {
          name,
          email,
          role: 'staff',
          hospitalId: '', // Empty initially
          status: 'pending' // Pending mainly means "not joined/approved"
        };
        (newUser as any).password = password;
      }

      users.push(newUser);
      localStorage.setItem('app_users', JSON.stringify(users));

      alert("회원가입이 완료되었습니다.");
      onSuccess(newUser);

    } else {
      // Login Logic
      if (!email || !password) {
        alert("아이디와 비밀번호를 입력해주세요.");
        return;
      }

      // Admin backdoor
      if (email === 'admin' && password === 'admin123') {
        onSuccess({ email: 'admin', name: '시스템 관리자', role: 'master', hospitalId: 'system', status: 'active' });
        return;
      }

      const foundUser = users.find((u: any) => u.email === email && u.password === password);
      if (foundUser) {
        onSuccess(foundUser);
      } else {
        setErrorStatus({ message: "아이디 또는 비밀번호가 일치하지 않습니다.", showSignup: false });
      }
    }
  };

  // Render Role Selection Screen
  if (type === 'signup' && step === 'role_selection') {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50">
        <div className="w-full max-w-[800px] p-10 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <h2 className="text-[28px] font-bold text-slate-900 tracking-tight">회원 유형 선택</h2>
            <p className="text-base text-slate-400 font-medium mt-3">가입하실 유형을 선택해주세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleRoleSelect('dentist')}
              className="p-8 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group text-center relative overflow-hidden flex flex-col items-center gap-4 py-12"
            >
              <div className="w-20 h-20 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <svg className="w-10 h-10 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">치과 회원 (관리자)</h3>
                <p className="text-slate-500 text-sm break-keep leading-relaxed px-4">
                  병원의 데이터를 생성하고 보존합니다.<br />
                  <span className="text-indigo-600 font-bold">스태프(개인회원)</span>에게<br />관리 권한을 부여합니다.
                </p>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('staff')}
              className="p-8 rounded-2xl border-2 border-slate-100 hover:border-green-500 hover:bg-green-50/30 transition-all group text-center relative overflow-hidden flex flex-col items-center gap-4 py-12"
            >
              <div className="w-20 h-20 rounded-full bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">개인 회원 (스태프)</h3>
                <p className="text-slate-500 text-sm break-keep leading-relaxed px-4">
                  원장님의 승인을 받아<br />재고를 관리합니다.<br />
                  <span className="text-rose-500 font-bold">이직 시 설정이 초기화됩니다.</span>
                </p>
              </div>
            </button>
          </div>

          <div className="mt-10 text-center">
            <button onClick={onSwitch} className="text-slate-400 hover:text-slate-600 font-medium">
              이미 계정이 있으신가요? 로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Login or Signup Form
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50">
      <div className="w-full max-w-[440px] p-10 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 text-indigo-600 mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-[28px] font-bold text-slate-900 tracking-tight">
            {type === 'login' ? '로그인' : (userType === 'dentist' ? '치과 회원가입' : '개인 회원가입')}
          </h2>
          <p className="text-base text-slate-400 font-medium mt-3">
            {type === 'login'
              ? '서비스 이용을 위해 로그인해주세요.'
              : (userType === 'dentist' ? '병원 정보를 입력해주세요.' : '본인 정보를 입력해주세요.')}
          </p>
        </div>

        {errorStatus && (
          <div className={`mb-8 p-4 rounded-2xl border flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${errorStatus.showSignup ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <div className="flex items-start gap-3">
              <p className="text-sm font-semibold leading-relaxed">{errorStatus.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {type === 'signup' && userType === 'dentist' && (
            <div>
              <label className="block text-[15px] font-bold text-slate-800 mb-2.5 ml-1">치과 병원명</label>
              <input
                type="text"
                name="hospitalName"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-base placeholder:text-slate-300"
                placeholder="예: 강남덴조이치과"
                required
              />
            </div>
          )}

          {type === 'signup' && (
            <div>
              <label className="block text-[15px] font-bold text-slate-800 mb-2.5 ml-1">이름</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-base placeholder:text-slate-300"
                placeholder="실명 입력"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[15px] font-bold text-slate-800 mb-2.5 ml-1">아이디 (이메일)</label>
            <input
              type="text"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-base placeholder:text-slate-300"
              placeholder="example@clinic.com"
              required
            />
          </div>

          <div>
            <label className="block text-[15px] font-bold text-slate-800 mb-2.5 ml-1">비밀번호</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-base placeholder:text-slate-300"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full h-16 bg-indigo-600 text-white text-lg font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] mt-4"
          >
            {type === 'login' ? '로그인' : '가입완료'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
          {type === 'signup' && (
            <button
              onClick={() => setStep('role_selection')}
              className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors mr-4"
            >
              이전 단계로
            </button>
          )}
          <button
            onClick={onSwitch}
            className="text-base font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {type === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
