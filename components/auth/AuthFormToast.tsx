import React from 'react';
import { Toast } from '../../hooks/useToast';

interface AuthFormToastProps {
  toast: Toast | null;
}

const AuthFormToast: React.FC<AuthFormToastProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${
        toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
      }`}
    >
      {toast.message}
    </div>
  );
};

export default AuthFormToast;
