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

interface Props {
  onClose: () => void;
}

export default function OnboardingCompleteModal({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const pieces: ConfettiPiece[] = Array.from({ length: 160 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: -Math.random() * window.innerHeight * 0.6 - i * 8,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      size: Math.random() * 10 + 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.15,
      shape: (['rect', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 3)],
    }));

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
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl px-8 py-10 max-w-sm w-full mx-4 text-center">
        {/* 아이콘 */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-2">튜토리얼 완성!</h2>
        <p className="text-sm font-semibold text-indigo-600 mb-3">
          초기 설정이 모두 완료되었습니다
        </p>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          이제 수술기록 기반의 재고관리 및 주문 시스템을 이용해보세요.
          대시보드에서 재고 현황, 발주 권장량, FAIL 통계를 한눈에 확인할 수 있습니다.
        </p>

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
