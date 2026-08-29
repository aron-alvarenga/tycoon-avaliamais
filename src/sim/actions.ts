/**
 * Ações do jogador: construir escola, contratar docente, melhorar infraestrutura, etc.
 */

import type { SimState, School, Teacher } from '../types';
import { getNextSchoolId, getNextTeacherId } from './state';
import {
  SCHOOL_BUILD_COST_CENTS,
  SCHOOL_EXPAND_COST_PER_50,
  INFRASTRUCTURE_LEVEL_COST_CENTS,
  TEACHER_HIRE_COST_CENTS,
  TEACHER_TRAINING_COST_CENTS,
  CAMPAIGN_ATTENDANCE_COST_CENTS,
  CAMPAIGN_GRADE_COST_CENTS,
  CAMPAIGN_DURATION_DAYS,
  MAINTENANCE_EMERGENCY_COST_CENTS,
  EMERGENCY_FUND_CENTS,
} from './formulas';

export type ActionResult = { ok: true } | { ok: false; reason: string };

export function buildSchool(state: SimState): ActionResult {
  if (state.isGameOver || state.isVictory) return { ok: false, reason: 'Jogo encerrado.' };
  if (state.budgetCents < SCHOOL_BUILD_COST_CENTS) {
    return { ok: false, reason: `Orçamento insuficiente. Necessário: R$ ${(SCHOOL_BUILD_COST_CENTS / 100).toFixed(2)}` };
  }
  state.budgetCents -= SCHOOL_BUILD_COST_CENTS;
  const school: School = {
    id: getNextSchoolId(),
    name: `Escola Municipal ${state.schools.length + 1}`,
    capacity: 200,
    students: 0,
    infrastructureLevel: 1,
    averageGrade: 5,
    averageAttendance: 70,
    diariesUpToDate: 50,
    alertCount: 1,
    campaignAttendanceEndDay: 0,
    campaignGradeEndDay: 0,
    activeEvents: [],
  };
  state.schools.push(school);
  return { ok: true };
}

export function expandSchool(state: SimState, schoolId: number): ActionResult {
  if (state.isGameOver || state.isVictory) return { ok: false, reason: 'Jogo encerrado.' };
  const school = state.schools.find((s) => s.id === schoolId);
  if (!school) return { ok: false, reason: 'Escola não encontrada.' };
  const cost = SCHOOL_EXPAND_COST_PER_50;
  if (state.budgetCents < cost) {
    return { ok: false, reason: `Orçamento insuficiente. Necessário: R$ ${(cost / 100).toFixed(2)}` };
  }
  state.budgetCents -= cost;
  school.capacity += 50;
  return { ok: true };
}

export function improveInfrastructure(state: SimState, schoolId: number): ActionResult {
  if (state.isGameOver || state.isVictory) return { ok: false, reason: 'Jogo encerrado.' };
  const school = state.schools.find((s) => s.id === schoolId);
  if (!school) return { ok: false, reason: 'Escola não encontrada.' };
  if (school.infrastructureLevel >= 5) return { ok: false, reason: 'Infraestrutura já no nível máximo.' };
  const cost = INFRASTRUCTURE_LEVEL_COST_CENTS;
  if (state.budgetCents < cost) {
    return { ok: false, reason: `Orçamento insuficiente. Necessário: R$ ${(cost / 100).toFixed(2)}` };
  }
  state.budgetCents -= cost;
  school.infrastructureLevel++;
  return { ok: true };
}

export function hireTeacher(state: SimState, schoolId: number): ActionResult {
  if (state.isGameOver || state.isVictory) return { ok: false, reason: 'Jogo encerrado.' };
  const school = state.schools.find((s) => s.id === schoolId);
  if (!school) return { ok: false, reason: 'Escola não encontrada.' };
  if (state.budgetCents < TEACHER_HIRE_COST_CENTS) {
    return { ok: false, reason: `Orçamento insuficiente. Necessário: R$ ${(TEACHER_HIRE_COST_CENTS / 100).toFixed(2)}` };
  }
  state.budgetCents -= TEACHER_HIRE_COST_CENTS;
  const teacher: Teacher = {
    id: getNextTeacherId(),
    schoolId: school.id,
    qualification: 50 + Math.floor(Math.random() * 30),
    satisfaction: 60 + Math.floor(Math.random() * 25),
    diariesUpToDateContribution: 55 + Math.floor(Math.random() * 30),
  };
  state.teachers.push(teacher);
  return { ok: true };
}

export function trainTeacher(state: SimState, teacherId: number): ActionResult {
  if (state.isGameOver || state.isVictory) return { ok: false, reason: 'Jogo encerrado.' };
  const teacher = state.teachers.find((t) => t.id === teacherId);
  if (!teacher) return { ok: false, reason: 'Docente não encontrado.' };
  if (state.budgetCents < TEACHER_TRAINING_COST_CENTS) {
    return { ok: false, reason: `Orçamento insuficiente. Necessário: R$ ${(TEACHER_TRAINING_COST_CENTS / 100).toFixed(2)}` };
  }
  state.budgetCents -= TEACHER_TRAINING_COST_CENTS;
  teacher.qualification = Math.min(100, teacher.qualification + 10);
  teacher.diariesUpToDateContribution = Math.min(100, teacher.diariesUpToDateContribution + 8);
  teacher.satisfaction = Math.min(100, teacher.satisfaction + 5);
  return { ok: true };
}

export function campaignAttendance(state: SimState, schoolId: number): ActionResult {
  if (state.isGameOver || state.isVictory) return { ok: false, reason: 'Jogo encerrado.' };
  const school = state.schools.find((s) => s.id === schoolId);
  if (!school) return { ok: false, reason: 'Escola não encontrada.' };
  if (state.budgetCents < CAMPAIGN_ATTENDANCE_COST_CENTS) {
    return { ok: false, reason: `Orçamento insuficiente. Necessário: R$ ${(CAMPAIGN_ATTENDANCE_COST_CENTS / 100).toFixed(2)}` };
  }
  state.budgetCents -= CAMPAIGN_ATTENDANCE_COST_CENTS;
  school.campaignAttendanceEndDay = state.currentDay + CAMPAIGN_DURATION_DAYS;
  return { ok: true };
}

export function campaignGrade(state: SimState, schoolId: number): ActionResult {
  if (state.isGameOver || state.isVictory) return { ok: false, reason: 'Jogo encerrado.' };
  const school = state.schools.find((s) => s.id === schoolId);
  if (!school) return { ok: false, reason: 'Escola não encontrada.' };
  if (state.budgetCents < CAMPAIGN_GRADE_COST_CENTS) {
    return { ok: false, reason: `Orçamento insuficiente. Necessário: R$ ${(CAMPAIGN_GRADE_COST_CENTS / 100).toFixed(2)}` };
  }
  state.budgetCents -= CAMPAIGN_GRADE_COST_CENTS;
  school.campaignGradeEndDay = state.currentDay + CAMPAIGN_DURATION_DAYS;
  return { ok: true };
}

export function maintenanceEmergency(state: SimState, schoolId: number): ActionResult {
  if (state.isGameOver || state.isVictory) return { ok: false, reason: 'Jogo encerrado.' };
  const school = state.schools.find((s) => s.id === schoolId);
  if (!school) return { ok: false, reason: 'Escola não encontrada.' };
  if (state.budgetCents < MAINTENANCE_EMERGENCY_COST_CENTS) {
    return { ok: false, reason: `Orçamento insuficiente. Necessário: R$ ${(MAINTENANCE_EMERGENCY_COST_CENTS / 100).toFixed(2)}` };
  }
  state.budgetCents -= MAINTENANCE_EMERGENCY_COST_CENTS;
  school.averageAttendance = Math.min(100, school.averageAttendance + 2);
  school.diariesUpToDate = Math.min(100, school.diariesUpToDate + 3);
  school.alertCount = Math.max(0, school.alertCount - 1);
  return { ok: true };
}

/** Verba emergencial: uso único por partida; adiciona R$ 10.000 ao orçamento. */
export function emergencyFund(state: SimState): ActionResult {
  if (state.isGameOver || state.isVictory) return { ok: false, reason: 'Jogo encerrado.' };
  if (state.emergencyFundUsed) return { ok: false, reason: 'Verba emergencial já foi utilizada nesta partida.' };
  state.emergencyFundUsed = true;
  state.budgetCents += EMERGENCY_FUND_CENTS;
  return { ok: true };
}
