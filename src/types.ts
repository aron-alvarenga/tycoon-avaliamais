/** Tipos do Avalia+ Tycoon da Educação */

export interface School {
  id: number;
  name: string;
  capacity: number;
  students: number;
  infrastructureLevel: number; // 0-5
  averageGrade: number;
  averageAttendance: number;
  diariesUpToDate: number;
  alertCount: number;
  /** Dia até quando campanha de frequência está ativa (0 = inativa) */
  campaignAttendanceEndDay: number;
  /** Dia até quando campanha de recuperação de notas está ativa (0 = inativa) */
  campaignGradeEndDay: number;
  /** Eventos ativos nesta escola (podem ser vários simultaneamente) */
  activeEvents: EventModifier[];
}

export interface Teacher {
  id: number;
  schoolId: number;
  qualification: number; // 0-100
  satisfaction: number; // 0-100
  /** Contribui para diários/planos em dia */
  diariesUpToDateContribution: number; // 0-100
}

export interface SimState {
  /** Dinheiro em centavos (evita float) */
  budgetCents: number;
  currentDay: number;
  currentBimester: number;
  currentYear: number;
  isPaused: boolean;
  speedMultiplier: number; // 1, 2, 4
  schools: School[];
  teachers: Teacher[];
  /** Histórico de indicadores para gráfico (últimos N pontos) */
  indicatorHistory: IndicatorSnapshot[];
  /** Meta de frequência mínima (%) */
  targetAttendance: number;
  /** Meta de média mínima (0-10) */
  targetAverageGrade: number;
  /** Satisfação da SEMED/comunidade (0-100) */
  communitySatisfaction: number;
  /** Game over se true */
  isGameOver: boolean;
  /** Vitória de campanha se true */
  isVictory: boolean;
  /** Mensagem de fim de jogo */
  endMessage: string;
  nextEventLabel: string;
  nextEventDays: number;
  /** Modificadores ativos de eventos aleatórios (ex.: corte de verba) */
  activeEventModifiers: EventModifier[];
  lastEventMessage: string;
  lastEventTitle: string;
  lastEventDescription: string;
  lastEventTip: string;
  nextRandomEventDay: number;
  /** Contagem de usos por tipo de ação (para punição por uso repetido) */
  actionUseCount: Record<string, number>;
  /** Verba emergencial já utilizada (uso único por partida) */
  emergencyFundUsed: boolean;
}

export interface EventModifier {
  id: string;
  name: string;
  description: string;
  tip: string;
  endDay: number;
  revenueMultiplier: number;
  attendancePenalty: number;
  gradePenalty: number;
  diariesPenalty: number;
  oneTimeCostCents: number;
  /** Ações que normalizam o evento; quando o jogador usa uma delas, o evento é encerrado. */
  resolvedByActions?: string[];
}

export interface IndicatorSnapshot {
  day: number;
  budgetCents: number;
  attendance: number;
  averageGrade: number;
  diariesUpToDate: number;
  alertCount: number;
  satisfaction: number;
}

export type GameSpeed = 1 | 2 | 4;

export const DAYS_PER_BIMESTER = 45;
export const BIMESTERS_PER_YEAR = 4;
export const DAYS_PER_YEAR = DAYS_PER_BIMESTER * BIMESTERS_PER_YEAR;
