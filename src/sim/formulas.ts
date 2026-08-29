/**
 * Fórmulas centralizadas do Avalia+ Tycoon.
 * Sem números mágicos; todos os valores vêm daqui.
 */

/** Repasse da prefeitura por bimestre (em centavos). O jogador administra esse valor até o próximo repasse. */
export const REVENUE_CENTS_PER_BIMESTER = 1600000;

/** Custo por docente por dia (centavos) */
export const TEACHER_DAILY_COST_CENTS = 1200;

/** Custo de construção de uma escola nova (centavos) */
export const SCHOOL_BUILD_COST_CENTS = 3000000;

/** Custo de expansão de capacidade (centavos por 50 vagas) */
export const SCHOOL_EXPAND_COST_PER_50 = 420000;

/** Custo de um nível de infraestrutura (centavos) */
export const INFRASTRUCTURE_LEVEL_COST_CENTS = 580000;

/** Custo de contratação de um docente (centavos) */
export const TEACHER_HIRE_COST_CENTS = 58000;

/** Custo de capacitação (aumenta qualificação) por docente (centavos) */
export const TEACHER_TRAINING_COST_CENTS = 32000;

/** Bônus por meta de frequência atingida (centavos por bimestre) */
export const BONUS_ATTENDANCE_TARGET_CENTS = 100000;

/** Bônus por meta de média atingida (centavos por bimestre) */
export const BONUS_GRADE_TARGET_CENTS = 80000;

/** Custo campanha de frequência por escola (centavos) */
export const CAMPAIGN_ATTENDANCE_COST_CENTS = 105000;

/** Custo campanha de recuperação de notas (centavos) */
export const CAMPAIGN_GRADE_COST_CENTS = 125000;

/** Custo manutenção emergencial por escola (centavos) */
export const MAINTENANCE_EMERGENCY_COST_CENTS = 72000;

/** Verba emergencial (uma vez por partida): valor adicionado ao orçamento (centavos). R$ 10.000 = 1.000.000 centavos. */
export const EMERGENCY_FUND_CENTS = 1_000_000;

/** Duração em dias do efeito da campanha de frequência ou de recuperação */
export const CAMPAIGN_DURATION_DAYS = 15;

/** Demanda base de alunos por ano (novos interessados) */
export const BASE_STUDENT_DEMAND_PER_YEAR = 150;

/** Fator de reputação na demanda (quanto maior a satisfação, mais matrículas) */
export function studentDemandFactor(satisfaction: number): number {
  return 1 + (satisfaction / 100) * 0.5; // até 1.5x
}

/** Cálculo de frequência média: base + infraestrutura + satisfação docente */
export function schoolAttendanceBase(
  infrastructureLevel: number,
  avgTeacherSatisfaction: number
): number {
  const infra = (infrastructureLevel / 5) * 15; // até 15 pontos
  const sat = (avgTeacherSatisfaction / 100) * 10; // até 10 pontos
  return Math.min(98, 70 + infra + sat + (Math.random() * 4 - 2));
}

/** Cálculo de média de notas: qualificação docente + infraestrutura */
export function schoolGradeBase(
  avgQualification: number,
  infrastructureLevel: number
): number {
  const qual = (avgQualification / 100) * 4; // até 4 pontos
  const infra = (infrastructureLevel / 5) * 2; // até 2 pontos
  return Math.min(10, 4 + qual + infra + (Math.random() * 0.5 - 0.25));
}

/** % diários/planos em dia: contribuição dos docentes */
export function diariesUpToDateFromTeachers(contributions: number[]): number {
  if (contributions.length === 0) return 50;
  const avg = contributions.reduce((a, b) => a + b, 0) / contributions.length;
  return Math.min(100, Math.max(0, avg + (Math.random() * 5 - 2.5)));
}

/** Número de alertas (turmas críticas): piora em função de baixa frequência e diários atrasados */
export function alertCountFromIndicators(
  attendance: number,
  diariesUpToDate: number
): number {
  const attPenalty = attendance < 85 ? (85 - attendance) * 0.5 : 0;
  const diariesPenalty = diariesUpToDate < 80 ? (80 - diariesUpToDate) * 0.3 : 0;
  // Alertas aumentam em função do mau desempenho
  return Math.max(0, Math.floor(attPenalty + diariesPenalty + (Math.random() * 2)));
}

/** Satisfação da comunidade: média ponderada dos indicadores */
export function communitySatisfactionFromIndicators(
  attendance: number,
  averageGrade: number,
  diariesUpToDate: number,
  alertCount: number
): number {
  const attScore = Math.min(100, (attendance / 95) * 100);
  const gradeScore = (averageGrade / 10) * 100;
  const diariesScore = diariesUpToDate;
  const alertPenalty = Math.min(40, alertCount * 2);
  return Math.max(0, Math.min(100, (attScore * 0.35 + gradeScore * 0.35 + diariesScore * 0.2) - alertPenalty));
}
