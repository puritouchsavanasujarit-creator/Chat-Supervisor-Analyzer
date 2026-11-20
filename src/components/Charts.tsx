import React from 'react';
import type { CriterionAverage, MonthlyTrendPoint } from '../utils/qaAnalytics.ts';

export const MonthlyTrendChart: React.FC<{ data: MonthlyTrendPoint[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-500">
        ยังไม่มีข้อมูลรายเดือนเพียงพอสำหรับแสดงกราฟแนวโน้ม
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 34;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const minY = 50;
  const maxY = 100;

  const getX = (idx: number) =>
    data.length === 1 ? padLeft + innerW / 2 : padLeft + (idx / (data.length - 1)) * innerW;

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return padTop + ((maxY - clamped) / (maxY - minY)) * innerH;
  };

  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.avgPercentage),
    passY: getY(d.passRate),
    ...d,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : '';

  const yTicks = [50, 65, 80, 90, 100];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-56 min-w-[420px]"
        role="img"
        aria-label="กราฟแนวโน้มคะแนน QA เฉลี่ยรายเดือน"
      >
        <defs>
          <linearGradient id="qaTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6D28D9" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke={tick === 80 ? '#A5B4FC' : '#E2E8F0'}
                strokeDasharray={tick === 80 ? '4 4' : undefined}
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[11px] font-mono tabular-nums"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#qaTrendFill)" />}
        {points.length > 1 && (
          <path d={linePath} fill="none" stroke="#6D28D9" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {points.map((p) => (
          <g key={p.monthKey}>
            <circle cx={p.x} cy={p.y} r="5" fill="#FFFFFF" stroke="#6D28D9" strokeWidth="2.5" />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="fill-slate-800 text-[11px] font-semibold font-mono tabular-nums"
            >
              {p.avgPercentage}%
            </text>
            <text
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-500 text-[11px]"
            >
              {p.monthLabel} ({p.auditCount})
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 px-2">
        <span>เส้นประสีคราม: เกณฑ์มาตรฐาน 80%</span>
        <span>ตัวเลขในวงเล็บคือจำนวนแชทที่ตรวจในเดือนนั้น</span>
      </div>
    </div>
  );
};

export const CriteriaBarChart: React.FC<{ criteria: CriterionAverage[] }> = ({ criteria }) => {
  return (
    <div className="space-y-3.5">
      {criteria.map((c) => {
        const barColor =
          c.avgPercent >= 85
            ? 'bg-indigo-600'
            : c.avgPercent >= 75
              ? 'bg-violet-600'
              : c.avgPercent >= 60
                ? 'bg-amber-500'
                : 'bg-rose-600';

        return (
          <div key={c.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-800 truncate">{c.name}</span>
              <div className="flex items-center gap-2 shrink-0 font-mono text-xs tabular-nums">
                <span className="font-semibold text-slate-900">
                  {c.evaluatedCount > 0 ? `${c.avgScore}/${c.maxScore}` : 'ไม่มีข้อมูล'}
                </span>
                <span className="text-slate-400">·</span>
                <span className="w-12 text-right font-medium text-slate-600">
                  {c.evaluatedCount > 0 ? `${c.avgPercent}%` : '-'}
                </span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, c.avgPercent))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
