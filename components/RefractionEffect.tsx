
import React, { useRef, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
}

const RefractionEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fix: Corrected getcurrent typo to current to properly access the canvas element from the ref
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const settings = {
      gridSize: 25,
      radius: 180,
      strength: 0.6,
      relaxation: 0.94
    };

    let points: Point[] = [];
    let width = 0;
    let height = 0;
    let mouse = { x: -1000, y: -1000 };
    let animationFrameId: number;

    const img = new Image();
    // 추상적인 테크니컬/메디컬 느낌의 고해상도 배경 이미지
    img.src = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80';

    const setup = () => {
      const container = containerRef.current;
      if (!container) return;
      
      // 컨테이너 크기에 맞춰 캔버스 조정
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width;
      canvas.height = height;

      points = [];
      for (let y = 0; y <= height + settings.gridSize; y += settings.gridSize) {
        for (let x = 0; x <= width + settings.gridSize; x += settings.gridSize) {
          points.push({
            x, y,
            ox: x, oy: y,
            vx: 0, vy: 0
          });
        }
      }
    };

    const drawTriangle = (p1: Point, p2: Point, p3: Point) => {
      if (!ctx) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.clip();

      // 텍스처 매핑: 원래 위치(ox, oy)에서 현재 위치(x, y)로 이미지를 그림
      // 캔버스 크기와 이미지 크기 비율 계산
      const scaleX = img.width / width;
      const scaleY = img.height / height;

      ctx.drawImage(
        img,
        p1.ox * scaleX, p1.oy * scaleY, settings.gridSize * scaleX, settings.gridSize * scaleY,
        p1.x - 0.5, p1.y - 0.5, (p2.x - p1.x) + 1, (p3.y - p1.y) + 1
      );
      ctx.restore();
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // 1. 포인트 물리 계산
      points.forEach(p => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < settings.radius) {
          const angle = Math.atan2(dy, dx);
          const force = (settings.radius - dist) / settings.radius;
          p.vx -= Math.cos(angle) * force * settings.strength * 20;
          p.vy -= Math.sin(angle) * force * settings.strength * 20;
        }

        p.vx += (p.ox - p.x) * 0.04;
        p.vy += (p.oy - p.y) * 0.04;
        p.vx *= settings.relaxation;
        p.vy *= settings.relaxation;
        p.x += p.vx;
        p.y += p.vy;
      });

      // 2. 그리드 렌더링
      const cols = Math.ceil(width / settings.gridSize) + 1;
      const rows = Math.ceil(height / settings.gridSize) + 1;

      for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
          const p1 = points[y * cols + x];
          const p2 = points[y * cols + x + 1];
          const p3 = points[(y + 1) * cols + x + 1];
          const p4 = points[(y + 1) * cols + x];

          if (p1 && p2 && p3 && p4) {
            drawTriangle(p1, p2, p3);
            drawTriangle(p1, p3, p4);
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleResize = () => {
      setup();
    };

    img.onload = () => {
      setup();
      animate();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-40">
      <canvas ref={canvasRef} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/80"></div>
    </div>
  );
};

export default RefractionEffect;
