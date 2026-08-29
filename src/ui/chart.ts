/**
 * Gráfico de evolução dos indicadores (canvas 2D).
 */

import type { IndicatorSnapshot } from '../types';

const COLORS = {
  budget: '#1da1f2',
  attendance: '#17bf63',
  grade: '#7b68ee',
  diaries: '#ffad1f',
  alerts: '#e0245e',
  satisfaction: '#1da1f2',
} as const;

export function drawChart(
  canvas: HTMLCanvasElement,
  history: IndicatorSnapshot[],
  width: number,
  height: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || history.length < 2) return;

  const dpr = window.devicePixelRatio ?? 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  const padding = { top: 20, right: 20, bottom: 28, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.fillStyle = '#1a2332';
  ctx.fillRect(0, 0, width, height);

  function x(i: number): number {
    return padding.left + (i / Math.max(1, history.length - 1)) * chartWidth;
  }

  function yPct(pct: number): number {
    return padding.top + (1 - pct / 100) * chartHeight;
  }

  function yGrade(grade: number): number {
    return padding.top + (1 - grade / 10) * chartHeight;
  }

  // Grid
  ctx.strokeStyle = '#38444d';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (i / 5) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Linha: frequência (0–100%)
  ctx.strokeStyle = COLORS.attendance;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x(0), yPct(history[0].attendance));
  for (let i = 1; i < history.length; i++) {
    ctx.lineTo(x(i), yPct(history[i].attendance));
  }
  ctx.stroke();

  // Linha: média (0–10)
  ctx.strokeStyle = COLORS.grade;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x(0), yGrade(history[0].averageGrade));
  for (let i = 1; i < history.length; i++) {
    ctx.lineTo(x(i), yGrade(history[i].averageGrade));
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Linha: satisfação (0–100%)
  ctx.strokeStyle = COLORS.satisfaction;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(x(0), yPct(history[0].satisfaction));
  for (let i = 1; i < history.length; i++) {
    ctx.lineTo(x(i), yPct(history[i].satisfaction));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Legenda
  const legY = height - 8;
  ctx.font = '11px Outfit, sans-serif';
  ctx.fillStyle = COLORS.attendance;
  ctx.fillText('Frequência', padding.left, legY);
  ctx.fillStyle = COLORS.grade;
  ctx.fillText('Média', padding.left + 90, legY);
  ctx.fillStyle = COLORS.satisfaction;
  ctx.fillText('Satisfação', padding.left + 150, legY);
}
