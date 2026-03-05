import React from 'react';
import { gradeColorMap } from '../analyzeGradeConfig';

interface ScoreGaugeProps {
  score: number;
  color: string;
}

const SCORE_GAUGE_RADIUS = 80;
const SCORE_GAUGE_CIRCUMFERENCE = Math.PI * SCORE_GAUGE_RADIUS;

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, color }) => {
  const colors = gradeColorMap[color] || gradeColorMap.emerald;
  const offset = SCORE_GAUGE_CIRCUMFERENCE - (score / 100) * SCORE_GAUGE_CIRCUMFERENCE;

  return (
    <svg viewBox="0 0 200 130" className="w-72 h-auto mx-auto">
      <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="#334155" strokeWidth="14" strokeLinecap="round" />
      <path
        d="M 20 105 A 80 80 0 0 1 180 105"
        fill="none"
        stroke={colors.stroke}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={SCORE_GAUGE_CIRCUMFERENCE}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
      <text x="100" y="88" textAnchor="middle" fill="#ffffff" fontSize="48" fontWeight="900">{score}</text>
      <text x="100" y="110" textAnchor="middle" fill="#94a3b8" fontSize="14">/ 100점</text>
    </svg>
  );
};

export default ScoreGauge;
