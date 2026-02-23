import React from 'react';

interface AccountSuspendedScreenProps {
  userEmail?: string;
  onSignOut: () => void;
}

const AccountSuspendedScreen: React.FC<AccountSuspendedScreenProps> = ({ userEmail, onSignOut }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-slate-800 mb-2">계정이 정지되었습니다</h1>

        {userEmail && (
          <p className="text-sm text-slate-500 mb-1">
            <span className="font-medium text-slate-700">{userEmail}</span>
          </p>
        )}

        <p className="text-sm text-slate-500 mb-8">
          서비스 이용이 일시적으로 제한되었습니다.<br />
          문의 사항은 운영팀에 연락해주세요.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@denjoy.kr"
            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            운영팀 문의하기
          </a>
          <button
            onClick={onSignOut}
            className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSuspendedScreen;
