import type { SimState, School, Teacher, IndicatorSnapshot } from '../types';
import { DAYS_PER_BIMESTER, BIMESTERS_PER_YEAR } from '../types';
import {
  schoolAttendanceBase,
  schoolGradeBase,
  diariesUpToDateFromTeachers,
  alertCountFromIndicators,
  communitySatisfactionFromIndicators,
  BASE_STUDENT_DEMAND_PER_YEAR,
  studentDemandFactor,
  BONUS_ATTENDANCE_TARGET_CENTS,
  BONUS_GRADE_TARGET_CENTS,
} from './formulas';
import { dailyCosts, bimesterRevenue } from './state';
import { tryTriggerRandomEvent, getActiveModifierTotalsForSchool, applyModifiersToState, resolveEventsByAction } from './events';

const MAX_HISTORY = 120; // ~4 bimestres de dias
const GAME_OVER_BUDGET_DAYS = 30; // dias consecutivos com orçamento negativo
/** Dias consecutivos com indicadores críticos para game over (exoneração por má gestão) = 1 bimestre */
const GAME_OVER_CRITICAL_INDICATOR_DAYS = DAYS_PER_BIMESTER;
/** Limiares para considerar indicadores "críticos": abaixo disso por mais de um bimestre leva à exoneração */
const CRITICAL_ATTENDANCE = 55;
const CRITICAL_AVERAGE_GRADE = 4.5;
const CRITICAL_SATISFACTION = 35;
const VICTORY_YEARS = 3; // atingir metas por 3 anos

export interface TickResult {
  state: SimState;
  eventOccurred: 'none' | 'bimester' | 'year';
}

let consecutiveNegativeBudgetDays = 0;
let consecutiveCriticalIndicatorDays = 0;
let yearsWithTargetsMet = 0;

function teachersBySchool(teachers: Teacher[]): Map<number, Teacher[]> {
  const map = new Map<number, Teacher[]>();
  for (const t of teachers) {
    const list = map.get(t.schoolId) ?? [];
    list.push(t);
    map.set(t.schoolId, list);
  }
  return map;
}

const STUDENTS_PER_TEACHER_HIGH = 30;
const STUDENTS_PER_TEACHER_WARN = 20;
const DECAY_ATTENDANCE_OVERWORKED = 0.2;
const DECAY_GRADE_OVERWORKED = 0.03;
const DECAY_DIARIES_LOW_INFRA = 0.15;

function updateSchoolIndicators(state: SimState, school: School, schoolTeachers: Teacher[]): void {
  const mods = getActiveModifierTotalsForSchool(school);
  const day = state.currentDay;

  if (schoolTeachers.length === 0) {
    school.averageAttendance = Math.max(0, school.averageAttendance - 0.25);
    school.averageGrade = Math.max(0, school.averageGrade - 0.05);
    school.diariesUpToDate = Math.max(0, school.diariesUpToDate - 1.5);
    school.alertCount = Math.min(10, school.alertCount + (Math.random() > 0.7 ? 1 : 0));
    return;
  }

  const ratio = school.students / schoolTeachers.length;
  const avgSatisfaction = schoolTeachers.reduce((s, t) => s + t.satisfaction, 0) / schoolTeachers.length;
  const avgQualification = schoolTeachers.reduce((s, t) => s + t.qualification, 0) / schoolTeachers.length;

  let attendance = schoolAttendanceBase(school.infrastructureLevel, avgSatisfaction);
  let grade = schoolGradeBase(avgQualification, school.infrastructureLevel);
  let diaries = diariesUpToDateFromTeachers(
    schoolTeachers.map((t) => t.diariesUpToDateContribution)
  );

  if (ratio > STUDENTS_PER_TEACHER_HIGH) {
    attendance -= DECAY_ATTENDANCE_OVERWORKED;
    grade -= DECAY_GRADE_OVERWORKED;
    if (school.infrastructureLevel <= 2) {
      diaries -= DECAY_DIARIES_LOW_INFRA;
    }
    // Docentes sofrem com superlotação
    schoolTeachers.forEach(t => t.satisfaction = Math.max(0, t.satisfaction - 0.15));
  } else if (ratio > STUDENTS_PER_TEACHER_WARN) {
    attendance -= 0.08;
    grade -= 0.015;
    // Pequena perda de satisfação
    schoolTeachers.forEach(t => t.satisfaction = Math.max(0, t.satisfaction - 0.05));
  } else if (ratio <= 15 && school.infrastructureLevel >= 3) {
    // Turmas pequenas e boa infra melhoram a satisfação aos poucos
    schoolTeachers.forEach(t => t.satisfaction = Math.min(100, t.satisfaction + 0.05));
  }
  if (school.infrastructureLevel <= 1 && ratio > 15) {
    diaries -= 0.1;
  }

  attendance -= mods.attendancePenalty;
  grade -= mods.gradePenalty;
  diaries -= mods.diariesPenalty;

  if (day <= school.campaignAttendanceEndDay) {
    attendance = Math.min(98, attendance + 6);
  }
  if (day <= school.campaignGradeEndDay) {
    grade = Math.min(10, grade + 0.4);
  }

  school.averageAttendance = Math.max(0, Math.min(100, attendance));
  school.averageGrade = Math.max(0, Math.min(10, grade));
  school.diariesUpToDate = Math.max(0, Math.min(100, diaries));

  const totalAlerts = alertCountFromIndicators(
    school.averageAttendance,
    school.diariesUpToDate
  );
  school.alertCount = Math.max(0, Math.floor(totalAlerts));
}

function networkIndicators(state: SimState): {
  attendance: number;
  averageGrade: number;
  diariesUpToDate: number;
  alertCount: number;
} {
  const schools = state.schools;
  if (schools.length === 0) {
    return { attendance: 0, averageGrade: 0, diariesUpToDate: 0, alertCount: 0 };
  }
  const attendance = schools.reduce((s, e) => s + e.averageAttendance, 0) / schools.length;
  const averageGrade = schools.reduce((s, e) => s + e.averageGrade, 0) / schools.length;
  const diariesUpToDate = schools.reduce((s, e) => s + e.diariesUpToDate, 0) / schools.length;
  const alertCount = schools.reduce((s, e) => s + e.alertCount, 0);
  return { attendance, averageGrade, diariesUpToDate, alertCount };
}

function pushSnapshot(state: SimState): void {
  const ind = networkIndicators(state);
  state.communitySatisfaction = communitySatisfactionFromIndicators(
    ind.attendance,
    ind.averageGrade,
    ind.diariesUpToDate,
    ind.alertCount
  );
  const snap: IndicatorSnapshot = {
    day: state.currentDay,
    budgetCents: state.budgetCents,
    attendance: ind.attendance,
    averageGrade: ind.averageGrade,
    diariesUpToDate: ind.diariesUpToDate,
    alertCount: ind.alertCount,
    satisfaction: state.communitySatisfaction,
  };
  state.indicatorHistory.push(snap);
  if (state.indicatorHistory.length > MAX_HISTORY) {
    state.indicatorHistory.shift();
  }
}

function applyBimesterEnd(state: SimState): void {
  state.budgetCents += bimesterRevenue(state);
  const ind = networkIndicators(state);
  let bonus = 0;
  if (ind.attendance >= state.targetAttendance) {
    bonus += BONUS_ATTENDANCE_TARGET_CENTS;
  }
  if (ind.averageGrade >= state.targetAverageGrade) {
    bonus += BONUS_GRADE_TARGET_CENTS;
  }
  state.budgetCents += bonus;
  pushSnapshot(state);

  // Decair uso de ações para não punir ações espaçadas
  for (const key in state.actionUseCount) {
    if (state.actionUseCount.hasOwnProperty(key)) {
      if (state.actionUseCount[key] > 0) {
        state.actionUseCount[key]--;
      }
    }
  }
}

function tryCountYearWithTargetsMet(state: SimState): void {
  if (state.currentBimester !== 1) return;
  const ind = networkIndicators(state);
  if (ind.attendance >= state.targetAttendance && ind.averageGrade >= state.targetAverageGrade) {
    yearsWithTargetsMet++;
  }
}

function distributeStudents(state: SimState): void {
  const demand = BASE_STUDENT_DEMAND_PER_YEAR * studentDemandFactor(state.communitySatisfaction);
  const totalCapacity = state.schools.reduce((s, e) => s + (e.capacity - e.students), 0);
  if (totalCapacity <= 0) return;
  const toAdd = Math.min(Math.floor(demand), totalCapacity);
  if (toAdd <= 0) return;
  let remaining = toAdd;
  const bySchool = state.schools
    .map((s) => ({ school: s, space: s.capacity - s.students }))
    .filter((x) => x.space > 0);
  for (let i = 0; remaining > 0 && i < bySchool.length; i++) {
    const take = Math.min(remaining, bySchool[i].space);
    bySchool[i].school.students += take;
    remaining -= take;
  }
}

function areIndicatorsCritical(state: SimState): boolean {
  const ind = networkIndicators(state);
  return (
    ind.attendance < CRITICAL_ATTENDANCE ||
    ind.averageGrade < CRITICAL_AVERAGE_GRADE ||
    state.communitySatisfaction < CRITICAL_SATISFACTION
  );
}

function checkGameOver(state: SimState): void {
  if (state.isGameOver || state.isVictory) return;
  if (state.budgetCents < 0) {
    consecutiveNegativeBudgetDays++;
    if (consecutiveNegativeBudgetDays >= GAME_OVER_BUDGET_DAYS) {
      state.isGameOver = true;
      state.endMessage = 'Orçamento negativo por muito tempo. A SEMED interveio na gestão.';
    }
  } else {
    consecutiveNegativeBudgetDays = 0;
  }
  if (state.schools.length > 0) {
    if (areIndicatorsCritical(state)) {
      consecutiveCriticalIndicatorDays++;
      if (consecutiveCriticalIndicatorDays >= GAME_OVER_CRITICAL_INDICATOR_DAYS) {
        state.isGameOver = true;
        state.endMessage =
          'Os indicadores da rede permaneceram críticos por mais de um bimestre. Você foi exonerado por não conseguir gerir a educação.';
      }
    } else {
      consecutiveCriticalIndicatorDays = 0;
    }
  }
  const ind = networkIndicators(state);
  if (ind.attendance < 50 && state.currentDay > 90) {
    state.isGameOver = true;
    state.endMessage = 'Indicadores de frequência críticos. Evasão em níveis inaceitáveis.';
  }
  if (state.communitySatisfaction < 20 && state.currentDay > 180) {
    state.isGameOver = true;
    state.endMessage = 'Satisfação da comunidade muito baixa. Gestão substituída.';
  }
}

function checkVictory(state: SimState): void {
  if (state.isGameOver || state.isVictory) return;
  if (yearsWithTargetsMet >= VICTORY_YEARS) {
    state.isVictory = true;
    state.endMessage = `Parabéns! Metas atingidas por ${VICTORY_YEARS} anos letivos. Campanha concluída com sucesso!`;
  }
}

function updateNextEvent(state: SimState): void {
  const daysIntoBimester = state.currentDay % DAYS_PER_BIMESTER;
  const daysToBimesterEnd = DAYS_PER_BIMESTER - daysIntoBimester;
  state.nextEventDays = daysToBimesterEnd === DAYS_PER_BIMESTER ? DAYS_PER_BIMESTER : daysToBimesterEnd;
  const nextBim = (state.currentBimester % BIMESTERS_PER_YEAR) + 1;
  state.nextEventLabel = `Início do ${nextBim}º bimestre`;
}

export function runSimTick(state: SimState): TickResult {
  if (state.isPaused || state.isGameOver || state.isVictory) {
    return { state, eventOccurred: 'none' };
  }

  applyModifiersToState(state);
  tryTriggerRandomEvent(state);

  const bySchool = teachersBySchool(state.teachers);
  for (const school of state.schools) {
    updateSchoolIndicators(state, school, bySchool.get(school.id) ?? []);
  }

  const costs = dailyCosts(state);
  state.budgetCents -= costs;

  state.currentDay++;
  const wasBimesterEnd =
    state.currentDay > 0 && state.currentDay % DAYS_PER_BIMESTER === 0;

  let eventOccurred: 'none' | 'bimester' | 'year' = 'none';

  if (wasBimesterEnd) {
    state.currentBimester = (state.currentBimester % BIMESTERS_PER_YEAR) + 1;
    if (state.currentBimester === 1) {
      state.currentYear++;
      distributeStudents(state);
      eventOccurred = 'year';
    } else {
      eventOccurred = 'bimester';
    }
    resolveEventsByAction(state, 'bimesterEnd');
    applyBimesterEnd(state);
    tryCountYearWithTargetsMet(state);
    // Campanha tem duração de 3 anos: ao concluir o 3º ano, encerra o jogo (não avança para ano 4)
    if (state.currentYear > 3) {
      state.currentYear = 3; // mantém "Ano 3" na visão geral do fim de jogo
      if (yearsWithTargetsMet >= VICTORY_YEARS) {
        state.isVictory = true;
        state.endMessage = `Parabéns! Metas atingidas por ${VICTORY_YEARS} anos letivos. Campanha concluída com sucesso!`;
      } else {
        state.isGameOver = true;
        state.endMessage = 'O período de 3 anos letivos terminou. As metas não foram atingidas no tempo da campanha.';
      }
    }
  }

  updateNextEvent(state);
  checkGameOver(state);
  checkVictory(state);

  return { state, eventOccurred };
}

export function resetConsecutiveNegativeDays(): void {
  consecutiveNegativeBudgetDays = 0;
}

export function resetConsecutiveCriticalIndicatorDays(): void {
  consecutiveCriticalIndicatorDays = 0;
}

export function resetYearsWithTargetsMet(): void {
  yearsWithTargetsMet = 0;
}
