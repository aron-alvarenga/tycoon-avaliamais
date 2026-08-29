/**
 * Persistência em localStorage para salvar/carregar partida.
 */

import type { SimState } from './types';
import { createInitialState } from './sim/state';

const SAVE_KEY = 'avaliamais-tycoon-save';
const SAVE_VERSION = 7;

interface SaveData {
  version: number;
  state: SimState;
  savedAt: number;
}

export function saveGame(state: SimState): void {
  const data: SaveData = {
    version: SAVE_VERSION,
    state: JSON.parse(JSON.stringify(state)),
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    console.warn('localStorage full or unavailable');
  }
}

function migrateState(state: SimState): SimState {
  if (!state.activeEventModifiers) state.activeEventModifiers = [];
  if (state.lastEventMessage === undefined) state.lastEventMessage = '';
  if (state.lastEventTitle === undefined) state.lastEventTitle = '';
  if (state.lastEventDescription === undefined) state.lastEventDescription = '';
  if (state.lastEventTip === undefined) state.lastEventTip = '';
  if (!state.nextRandomEventDay) state.nextRandomEventDay = state.currentDay + 25;
  for (const school of state.schools) {
    if (school.campaignAttendanceEndDay === undefined) school.campaignAttendanceEndDay = 0;
    if (school.campaignGradeEndDay === undefined) school.campaignGradeEndDay = 0;
    if (!school.activeEvents) (school as { activeEvents: unknown[] }).activeEvents = [];
  }
  for (const mod of state.activeEventModifiers) {
    if (!('description' in mod)) (mod as { description?: string }).description = '';
    if (!('tip' in mod)) (mod as { tip?: string }).tip = '';
    if (!(mod as { resolvedByActions?: string[] }).resolvedByActions) (mod as { resolvedByActions: string[] }).resolvedByActions = ['bimesterEnd'];
  }
  if (!state.actionUseCount) {
    state.actionUseCount = {
      campaignAttendance: 0,
      campaignGrade: 0,
      maintenance: 0,
      trainTeacher: 0,
    };
  }
  if (state.emergencyFundUsed === undefined) state.emergencyFundUsed = false;
  return state;
}

export function loadGame(): SimState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    const state = data.state as SimState;
    if (data.version < SAVE_VERSION) return migrateState(state);
    return state;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) != null;
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function getInitialState(): SimState {
  const loaded = loadGame();
  return loaded ?? createInitialState();
}
