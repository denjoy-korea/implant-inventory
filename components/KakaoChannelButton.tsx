import React from 'react';

const KakaoChannelButton: React.FC = () => {
    return (
        <div className="fixed bottom-6 right-6 z-[200] md:bottom-8 md:right-8 print:hidden pointer-events-none">
            <div className="relative pointer-events-auto group">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-300" />

                {/* Main button */}
                <a
                    href="http://pf.kakao.com/_TxbxgDn/chat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-[#FEE500] hover:bg-[#FADA0A] text-slate-900 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(254,229,0,0.4)] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden ring-1 ring-[#FEE500]/50"
                    aria-label="카카오톡 채널 상담"
                >
                    {/* Glass highlight effect */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Kakao icon */}
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-8 md:h-8 relative z-10 transition-transform group-hover:scale-110">
                        <path d="M12 3C6.477 3 2 6.544 2 10.914c0 2.846 1.83 5.334 4.545 6.74-.214.717-.775 2.65-.89 3.1-.144.57.199.563.42.42.176-.113 2.76-1.85 3.88-2.61a12.186 12.186 0 002.045.176c5.523 0 10-3.545 10-7.914S17.523 3 12 3z" />
                    </svg>
                </a>

                {/* Tooltip */}
                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap hidden sm:block">
                    실시간 문의하기
                    {/* Triangle pointer */}
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-y-4 border-y-transparent border-l-4 border-l-slate-800" />
                </div>
            </div>
        </div>
    );
};

export default KakaoChannelButton;
