import React, { useEffect, useRef } from 'react';

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  shape: 'rect' | 'circle' | 'triangle';
}

const COLORS = [
  '#6366f1', '#818cf8', '#a78bfa',
  '#ec4899', '#f472b6',
  '#f59e0b', '#fbbf24',
  '#10b981', '#34d399',
  '#3b82f6', '#60a5fa',
  '#ef4444', '#f97316',
];

const NEXT_ACTIONS = [
  {
    label: '수술기록 등록',
    desc: '첫 수술기록을 입력해보세요',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: '재고 현황 확인',
    desc: '품목별 수량을 한눈에',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: '대시보드 둘러보기',
    desc: '발주 권장량 · FAIL 통계',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

interface Props {
  onClose: () => void;
  hospitalName?: string;
  userName?: string;
}

export default function OnboardingCompleteModal({ onClose, hospitalName, userName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const headline = hospitalName
    ? `${hospitalName} 설정이 완료되었습니다`
    : userName
      ? `${userName}님 설정이 완료되었습니다`
      : '초기 설정이 완료되었습니다';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const makeRainPiece = (i: number): ConfettiPiece => ({
      x: Math.random() * window.innerWidth,
      y: -Math.random() * window.innerHeight * 0.6 - i * 8,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      size: Math.random() * 10 + 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.15,
      shape: (['rect', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 3)],
    });

    // Center burst: explodes outward from screen center
    const makeBurstPiece = (): ConfettiPiece => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 14 + 5;
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 8,
        size: Math.random() * 13 + 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.22,
        shape: (['rect', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 3)],
      };
    };

    const pieces: ConfettiPiece[] = [
      ...Array.from({ length: 180 }, (_, i) => makeRainPiece(i)),
      ...Array.from({ length: 60 }, () => makeBurstPiece()),
    ];

    let animId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allGone = true;
      pieces.forEach(p => {
        if (p.y < canvas.height + 30) allGone = false;

        p.y += p.vy;
        p.x += p.vx;
        p.rotation += p.vr;
        p.vy = Math.min(p.vy + 0.04, 9);
        p.vx *= 0.995;

        const alpha = Math.max(0, 1 - Math.max(0, p.y - canvas.height * 0.75) / (canvas.height * 0.25));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size / 2, p.size / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      if (!allGone) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />
      <div className="relative z-20 bg-white rounded-3xl shadow-2xl px-8 py-10 max-w-sm w-full mx-4 text-center">
        {/* 아이콘 */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-1">준비 완료!</h2>
        <p className="text-sm font-semibold text-indigo-600 mb-5 leading-snug px-2">
          {headline}
        </p>

        {/* 다음 행동 힌트 */}
        <div className="space-y-2 mb-6 text-left">
          {NEXT_ACTIONS.map((action) => (
            <div key={action.label} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3.5 py-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
                {action.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">{action.label}</p>
                <p className="text-[11px] text-slate-400">{action.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          대시보드 시작하기
        </button>
      </div>
    </div>
  );
}
