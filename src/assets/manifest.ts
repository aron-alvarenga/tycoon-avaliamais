/**
 * Chaves e caminhos dos assets do jogo (ícones, sprites, etc.).
 * Assets estáticos ficam em public/assets/ e são referenciados por URL.
 */

const ASSETS_BASE = '/assets';

export const ICONS = {
  /** Ícone de escola/edifício para dashboard e lista de escolas */
  SCHOOL: `${ASSETS_BASE}/icons/icon-school.png`,
  /** Ícone de docente/professor */
  TEACHER: `${ASSETS_BASE}/icons/icon-teacher.png`,
  /** Ícone de aluno/estudante */
  STUDENT: `${ASSETS_BASE}/icons/icon-student.png`,
  /** Ícone de orçamento/dinheiro */
  BUDGET: `${ASSETS_BASE}/icons/icon-budget.png`,
  /** Ícone de satisfação/comunidade (opcional) */
  SATISFACTION: `${ASSETS_BASE}/icons/icon-satisfaction.png`,
} as const;

export type IconKey = keyof typeof ICONS;
