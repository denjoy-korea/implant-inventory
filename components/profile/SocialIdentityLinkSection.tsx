import React from 'react';

type SocialProvider = 'google' | 'kakao';

interface LinkedIdentity {
  id: string;
  provider: string;
}

interface SocialIdentityLinkSectionProps {
  linkedIdentities: LinkedIdentity[];
  isLinkingProvider: string | null;
  onLink: (provider: SocialProvider) => void;
  onUnlink: (provider: SocialProvider, linkedId: string) => void;
}

const PROVIDERS: SocialProvider[] = ['google', 'kakao'];

const SocialIdentityLinkSection: React.FC<SocialIdentityLinkSectionProps> = ({
  linkedIdentities,
  isLinkingProvider,
  onLink,
  onUnlink,
}) => {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">소셜 계정 연동</h4>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {PROVIDERS.map((provider, idx) => {
          const linked = linkedIdentities.find((identity) => identity.provider === provider);
          const isLoading = isLinkingProvider === provider;
          const label = provider === 'google' ? 'Google' : '카카오';
          const icon = provider === 'google' ? (
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0 text-[#3C1E1E]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.6 2 11c0 2.82 1.7 5.3 4.27 6.79l-1.09 4.05a.3.3 0 00.44.33L10.1 19.5A11.3 11.3 0 0012 19.6c5.52 0 10-3.6 10-8.04C22 6.6 17.52 3 12 3z"/>
            </svg>
          );

          return (
            <div key={provider} className={`flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50/50 ${idx === 0 ? 'border-b border-slate-100' : ''} transition-colors`}>
              <div className="flex items-center gap-2.5">
                {icon}
                <div>
                  <p className="text-xs font-medium text-slate-700">{label}</p>
                  <p className="text-[10px] text-slate-400">{linked ? '연동됨' : '연동 안됨'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {linked ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <button
                      onClick={() => onUnlink(provider, linked.id)}
                      disabled={isLoading}
                      className="text-xs text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '처리 중...' : '해제'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onLink(provider)}
                    disabled={isLoading}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? '연결 중...' : '연동하기'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SocialIdentityLinkSection;
