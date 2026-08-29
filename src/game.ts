/**
 * Loop do jogo: tick em intervalo fixo, callbacks para UI.
 */

import type { SimState } from './types';
import { createInitialState } from './sim/state';
import { runSimTick, resetConsecutiveNegativeDays, resetConsecutiveCriticalIndicatorDays, resetYearsWithTargetsMet } from './sim/tick';
import * as actions from './sim/actions';
import type { ActionResult } from './sim/actions';
import { tryTriggerOveruseEvent, resolveEventsByAction } from './sim/events';
import { loadGame, saveGame } from './storage';

const TICK_MS = 650; // ~1,5 dia por segundo em 1x — tempo mais legível

let state: SimState;
let rafId: number | null = null;
let lastTickTime = 0;
let accumulatedMs = 0;

type Listener = (s: SimState) => void;
const listeners: Listener[] = [];

export function getState(): SimState {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function notify(): void {
  const s = state;
  listeners.forEach((fn) => fn(s));
}

export function startNewGame(): SimState {
  state = createInitialState();
  resetConsecutiveNegativeDays();
  resetConsecutiveCriticalIndicatorDays();
  resetYearsWithTargetsMet();
  notify();
  return state;
}

export function loadSavedGame(): SimState | null {
  const loaded = loadGame();
  if (!loaded) return null;
  state = loaded;
  resetConsecutiveNegativeDays();
  resetConsecutiveCriticalIndicatorDays();
  resetYearsWithTargetsMet();
  notify();
  return state;
}

export function setPaused(paused: boolean): void {
  state.isPaused = paused;
  notify();
}

export function setSpeed(multiplier: 1 | 2 | 4): void {
  state.speedMultiplier = multiplier;
  notify();
}

function runOneTick(): void {
  if (state.isGameOver || state.isVictory) {
    return;
  }
  const mult = state.speedMultiplier;
  for (let i = 0; i < mult; i++) {
    runSimTick(state);
    if (state.isGameOver || state.isVictory) break;
  }
  notify();
}

function gameLoop(now: number): void {
  if (rafId == null) return;
  const delta = lastTickTime ? now - lastTickTime : TICK_MS;
  lastTickTime = now;
  accumulatedMs += delta;
  while (accumulatedMs >= TICK_MS) {
    accumulatedMs -= TICK_MS;
    runOneTick();
  }
  rafId = requestAnimationFrame(gameLoop);
}

export function startLoop(): void {
  if (rafId != null) return;
  lastTickTime = 0;
  accumulatedMs = 0;
  rafId = requestAnimationFrame(gameLoop);
}

export function stopLoop(): void {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function doSave(): void {
  saveGame(state);
}

export function runOneDay(): void {
  runOneTick();
}

export function buildSchool(): ActionResult {
  const r = actions.buildSchool(state);
  if (r.ok) {
    resolveEventsByAction(state, 'buildSchool');
    notify();
  }
  return r;
}

export function expandSchool(schoolId: number): ActionResult {
  const r = actions.expandSchool(state, schoolId);
  if (r.ok) {
    resolveEventsByAction(state, 'expandSchool', schoolId);
    notify();
  }
  return r;
}

export function improveInfrastructure(schoolId: number): ActionResult {
  const r = actions.improveInfrastructure(state, schoolId);
  if (r.ok) {
    resolveEventsByAction(state, 'improveInfrastructure', schoolId);
    notify();
  }
  return r;
}

export function hireTeacher(schoolId: number): ActionResult {
  const r = actions.hireTeacher(state, schoolId);
  if (r.ok) {
    resolveEventsByAction(state, 'hireTeacher', schoolId);
    notify();
  }
  return r;
}

export function trainTeacher(teacherId: number): ActionResult {
  const r = actions.trainTeacher(state, teacherId);
  if (r.ok) {
    state.actionUseCount.trainTeacher = (state.actionUseCount.trainTeacher ?? 0) + 1;
    tryTriggerOveruseEvent(state, 'trainTeacher');
    const teacher = state.teachers.find((t) => t.id === teacherId);
    if (teacher) resolveEventsByAction(state, 'trainTeacher', teacher.schoolId);
    else resolveEventsByAction(state, 'trainTeacher');
    notify();
  }
  return r;
}

export function campaignAttendance(schoolId: number): ActionResult {
  const r = actions.campaignAttendance(state, schoolId);
  if (r.ok) {
    state.actionUseCount.campaignAttendance = (state.actionUseCount.campaignAttendance ?? 0) + 1;
    tryTriggerOveruseEvent(state, 'campaignAttendance');
    resolveEventsByAction(state, 'campaignAttendance', schoolId);
    notify();
  }
  return r;
}

export function campaignGrade(schoolId: number): ActionResult {
  const r = actions.campaignGrade(state, schoolId);
  if (r.ok) {
    state.actionUseCount.campaignGrade = (state.actionUseCount.campaignGrade ?? 0) + 1;
    tryTriggerOveruseEvent(state, 'campaignGrade');
    resolveEventsByAction(state, 'campaignGrade', schoolId);
    notify();
  }
  return r;
}

export function maintenanceEmergency(schoolId: number): ActionResult {
  const r = actions.maintenanceEmergency(state, schoolId);
  if (r.ok) {
    state.actionUseCount.maintenance = (state.actionUseCount.maintenance ?? 0) + 1;
    tryTriggerOveruseEvent(state, 'maintenance');
    resolveEventsByAction(state, 'maintenanceEmergency', schoolId);
    notify();
  }
  return r;
}

export function emergencyFund(): ActionResult {
  const r = actions.emergencyFund(state);
  if (r.ok) notify();
  return r;
}
