import type { SimState, School, Teacher, IndicatorSnapshot } from '../types';
import { TEACHER_DAILY_COST_CENTS, REVENUE_CENTS_PER_BIMESTER } from './formulas';

let nextSchoolId = 1;
let nextTeacherId = 1;

function createInitialSchool(id: number): School {
  return {
    id,
    name: `Escola Municipal ${id}`,
    capacity: 200,
    students: 120,
    infrastructureLevel: 2,
    averageGrade: 6.2,
    averageAttendance: 82,
    diariesUpToDate: 75,
    alertCount: 2,
    campaignAttendanceEndDay: 0,
    campaignGradeEndDay: 0,
    activeEvents: [],
  };
}

function createInitialTeacher(id: number, schoolId: number): Teacher {
  return {
    id,
    schoolId,
    qualification: 65,
    satisfaction: 70,
    diariesUpToDateContribution: 72,
  };
}

export function getNextSchoolId(): number {
  return nextSchoolId++;
}

export function getNextTeacherId(): number {
  return nextTeacherId++;
}

export function createInitialState(): SimState {
  nextSchoolId = 1;
  nextTeacherId = 1;
  const school1 = createInitialSchool(getNextSchoolId());
  const school2 = createInitialSchool(getNextSchoolId());
  const schools: School[] = [school1, school2];
  const teachers: Teacher[] = [
    createInitialTeacher(getNextTeacherId(), school1.id),
    createInitialTeacher(getNextTeacherId(), school1.id),
    createInitialTeacher(getNextTeacherId(), school2.id),
  ];
  const snapshot: IndicatorSnapshot = {
    day: 0,
    budgetCents: REVENUE_CENTS_PER_BIMESTER, // começa com um repasse bimestral
    attendance: 82,
    averageGrade: 6.2,
    diariesUpToDate: 75,
    alertCount: 4,
    satisfaction: 68,
  };
  return {
    budgetCents: REVENUE_CENTS_PER_BIMESTER,
    currentDay: 0,
    currentBimester: 1,
    currentYear: 1,
    isPaused: false,
    speedMultiplier: 1,
    schools,
    teachers,
    indicatorHistory: [snapshot],
    targetAttendance: 85,
    targetAverageGrade: 6,
    communitySatisfaction: 68,
    isGameOver: false,
    isVictory: false,
    endMessage: '',
    nextEventLabel: 'Início do 1º bimestre',
    nextEventDays: 45,
    activeEventModifiers: [],
    lastEventMessage: '',
    lastEventTitle: '',
    lastEventDescription: '',
    lastEventTip: '',
    nextRandomEventDay: 25,
    actionUseCount: {
      campaignAttendance: 0,
      campaignGrade: 0,
      maintenance: 0,
      trainTeacher: 0,
    },
    emergencyFundUsed: false,
  };
}

export function dailyCosts(state: SimState): number {
  const teacherCost = state.teachers.length * TEACHER_DAILY_COST_CENTS;
  const schoolMaintenance = state.schools.length * 1200; // manutenção fixa por escola
  return teacherCost + schoolMaintenance;
}

/** Repasse bimestral (aplicado ao fechar o bimestre). Eventos globais e por escola podem alterar o valor. */
export function bimesterRevenue(state: SimState): number {
  let mult = 1;
  for (const mod of state.activeEventModifiers) {
    mult *= mod.revenueMultiplier;
  }
  for (const school of state.schools) {
    for (const mod of school.activeEvents ?? []) {
      mult *= mod.revenueMultiplier;
    }
  }
  return Math.round(REVENUE_CENTS_PER_BIMESTER * mult);
}
