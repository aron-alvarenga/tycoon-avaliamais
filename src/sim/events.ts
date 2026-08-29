/**
 * Eventos aleatórios: título, descrição, dica e efeitos nos indicadores.
 * Situações condizentes com a realidade da gestão escolar.
 */

import type { SimState, EventModifier, School } from '../types';

/** Eventos que afetam a rede (receita) e ficam em state.activeEventModifiers. Os demais são por escola. */
const GLOBAL_EVENT_IDS = ['corte_verba', 'bonus_federal', 'festa_escolar'];

const MIN_DAYS_BETWEEN_EVENTS = 12;
const MAX_DAYS_BETWEEN_EVENTS = 32;
const EVENT_CHANCE_PER_DAY = 0.18;

/** Multiplicador das penalidades dos eventos por escola para impacto mais visível nos indicadores. */
const SCHOOL_EVENT_PENALTY_MULTIPLIER = 1.7;

/** Uso do mesmo tipo de ação acima desse valor dispara evento de punição */
export const OVERUSE_THRESHOLD = 5;

export interface EventDef {
  id: string;
  title: string;
  description: string;
  tip: string;
  revenueMultiplier: number;
  attendancePenalty: number;
  gradePenalty: number;
  diariesPenalty: number;
  oneTimeCostCents: number;
  /** Ações que normalizam o evento (ex.: 'maintenance', 'trainTeacher', 'bimesterEnd'). */
  resolvedByActions: string[];
}

export const EVENT_DEFS: EventDef[] = [
  {
    id: 'corte_verba',
    title: 'Corte de verba na educação',
    description: 'A prefeitura anunciou redução temporária do repasse para a educação. A receita da SEMED será menor até a situação se normalizar.',
    tip: 'Priorize gastos essenciais (docentes e manutenção). O repasse volta ao normal no próximo bimestre.',
    revenueMultiplier: 0.65,
    attendancePenalty: 0,
    gradePenalty: 0,
    diariesPenalty: 0,
    oneTimeCostCents: 0,
    resolvedByActions: ['bimesterEnd'],
  },
  {
    id: 'chuva_faltas',
    title: 'Chuva forte e alagamentos',
    description: 'Chuvas intensas e pontos de alagamento impedem que muitos alunos e docentes cheguem às escolas. A frequência cai e o aviso permanece até você tomar uma ação.',
    tip: 'Use "Campanha de frequência" nas escolas mais afetadas e "Manutenção emergencial" se houver danos para normalizar a situação.',
    revenueMultiplier: 1,
    attendancePenalty: 10,
    gradePenalty: 0,
    diariesPenalty: 0,
    oneTimeCostCents: 0,
    resolvedByActions: ['campaignAttendance', 'maintenanceEmergency'],
  },
  {
    id: 'gripe',
    title: 'Surto de gripe nas escolas',
    description: 'Surto de gripe entre alunos e alguns docentes. Faltas e atraso em diários/planos aumentam. O efeito continua até você agir.',
    tip: 'Campanha de frequência e "Capacitar docente" ajudam a normalizar. Enquanto nada for feito, os indicadores seguem caindo.',
    revenueMultiplier: 1,
    attendancePenalty: 14,
    gradePenalty: 0.4,
    diariesPenalty: 8,
    oneTimeCostCents: 0,
    resolvedByActions: ['campaignAttendance', 'trainTeacher'],
  },
  {
    id: 'greve',
    title: 'Paralisação de docentes',
    description: 'Docentes em paralisação. Aulas reduzidas, diários e planos atrasados. A situação só normaliza com ações da gestão.',
    tip: 'Após investir em "Capacitar docente" e "Recuperação de notas", o evento é dado como normalizado.',
    revenueMultiplier: 0.8,
    attendancePenalty: 18,
    gradePenalty: 0.6,
    diariesPenalty: 22,
    oneTimeCostCents: 80000,
    resolvedByActions: ['trainTeacher', 'campaignGrade'],
  },
  {
    id: 'bonus_federal',
    title: 'Recurso federal extra repassado',
    description: 'O Ministério da Educação repassou recursos adicionais ao município para reforço da educação básica.',
    tip: 'Boa hora para investir em infraestrutura, novas escolas ou campanhas que elevem frequência e notas.',
    revenueMultiplier: 1,
    attendancePenalty: 0,
    gradePenalty: 0,
    diariesPenalty: 0,
    oneTimeCostCents: -350000,
    resolvedByActions: ['bimesterEnd'],
  },
  {
    id: 'festa_escolar',
    title: 'Evento de integração escola-comunidade',
    description: 'Evento de integração nas escolas aproximou famílias e alunos. A expectativa é de melhora na frequência.',
    tip: 'Aproveite o efeito positivo. Manter infraestrutura e docentes satisfeitos sustenta a melhora.',
    revenueMultiplier: 1,
    attendancePenalty: -3,
    gradePenalty: 0,
    diariesPenalty: 0,
    oneTimeCostCents: 22000,
    resolvedByActions: ['bimesterEnd'],
  },
  {
    id: 'falta_luz',
    title: 'Falhas de energia na rede',
    description: 'Falhas de energia em parte das escolas atrapalham aulas e diários eletrônicos. O impacto continua até você agir.',
    tip: 'Manutenção emergencial e "Melhorar infraestrutura" normalizam o evento. Enquanto nada for feito, os indicadores seguem sendo afetados.',
    revenueMultiplier: 1,
    attendancePenalty: 4,
    gradePenalty: 0.2,
    diariesPenalty: 12,
    oneTimeCostCents: 0,
    resolvedByActions: ['maintenanceEmergency', 'improveInfrastructure'],
  },
  {
    id: 'inspecao',
    title: 'Inspeção da SEMED — cobrança de diários',
    description: 'Inspeção cobra o preenchimento em dia dos diários e planos. A pressão permanece até a situação ser regularizada.',
    tip: 'Use "Capacitar docente" nas escolas com pior indicador de diários/planos em dia para normalizar.',
    revenueMultiplier: 1,
    attendancePenalty: 0,
    gradePenalty: 0,
    diariesPenalty: -8,
    oneTimeCostCents: 0,
    resolvedByActions: ['trainTeacher'],
  },
  {
    id: 'evasao_bairro',
    title: 'Risco de evasão em bairro vulnerável',
    description: 'Famílias em vulnerabilidade em um bairro com escola da rede. Frequência e engajamento podem cair até você intervir.',
    tip: 'Campanha de frequência na escola do bairro e manutenção emergencial normalizam o evento.',
    revenueMultiplier: 1,
    attendancePenalty: 9,
    gradePenalty: 0.3,
    diariesPenalty: 3,
    oneTimeCostCents: 0,
    resolvedByActions: ['campaignAttendance', 'maintenanceEmergency'],
  },
  {
    id: 'material_atraso',
    title: 'Atraso na entrega de material didático',
    description: 'A entrega de material atrasou. Docentes improvisam e os registros ficam desorganizados até você tomar uma ação.',
    tip: 'Capacitar docente e manutenção emergencial ajudam a reorganizar e normalizar o evento.',
    revenueMultiplier: 1,
    attendancePenalty: 2,
    gradePenalty: 0.3,
    diariesPenalty: 15,
    oneTimeCostCents: 0,
    resolvedByActions: ['trainTeacher', 'maintenanceEmergency'],
  },
  {
    id: 'reclamacao_pais',
    title: 'Reclamações de pais sobre notas',
    description: 'Pais e conselho reclamam das notas baixas. A pressão permanece até a gestão demonstrar ações para melhorar.',
    tip: 'Recuperação de notas, melhorar infraestrutura e capacitar docente normalizam o evento.',
    revenueMultiplier: 1,
    attendancePenalty: 0,
    gradePenalty: 0.5,
    diariesPenalty: 5,
    oneTimeCostCents: 0,
    resolvedByActions: ['campaignGrade', 'improveInfrastructure', 'trainTeacher'],
  },
  {
    id: 'obra_vizinha',
    title: 'Obra pesada próxima a escola',
    description: 'Obra em via próxima gera barulho e poeira. Há impacto na rotina até a escola ser estabilizada com ações.',
    tip: 'Manutenção emergencial e campanha de frequência ajudam a normalizar.',
    revenueMultiplier: 1,
    attendancePenalty: 6,
    gradePenalty: 0.2,
    diariesPenalty: 6,
    oneTimeCostCents: 0,
    resolvedByActions: ['maintenanceEmergency', 'campaignAttendance'],
  },
  {
    id: 'concurso_aprovados',
    title: 'Novos aprovados em concurso',
    description: 'Novos docentes aprovados ainda não assumiram. Sobrecarga e risco de diários atrasados até você agir.',
    tip: 'Capacitar os docentes atuais melhora diários/planos em dia e normaliza o evento.',
    revenueMultiplier: 1,
    attendancePenalty: 2,
    gradePenalty: 0.1,
    diariesPenalty: 10,
    oneTimeCostCents: 0,
    resolvedByActions: ['trainTeacher'],
  },
  {
    id: 'virus_internet',
    title: 'Problemas no sistema de diários online',
    description: 'Problemas técnicos no sistema de diários atrasam o lançamento. O impacto continua até a equipe ser apoiada.',
    tip: 'Manutenção emergencial e capacitação ajudam a recuperar diários em dia e normalizar.',
    revenueMultiplier: 1,
    attendancePenalty: 0,
    gradePenalty: 0,
    diariesPenalty: 14,
    oneTimeCostCents: 0,
    resolvedByActions: ['maintenanceEmergency', 'trainTeacher'],
  },
];

function pickRandomEvent(): EventDef {
  return EVENT_DEFS[Math.floor(Math.random() * EVENT_DEFS.length)];
}

/** Eventos não expiram por tempo; permanecem até o jogador tomar uma ação que os normalize. */
export function applyModifiersToState(state: SimState): void {
  for (const m of state.activeEventModifiers) {
    if (!m.resolvedByActions) m.resolvedByActions = ['bimesterEnd'];
  }
  for (const school of state.schools) {
    const events = school.activeEvents ?? [];
    for (const m of events) {
      if (!m.resolvedByActions) m.resolvedByActions = ['bimesterEnd'];
    }
  }
  syncLastEventFromActive(state);
}

/** Atualiza lastEvent* com o primeiro evento ativo para o aviso permanecer na tela. */
export function syncLastEventFromActive(state: SimState): void {
  const first = state.activeEventModifiers[0];
  if (first) {
    state.lastEventTitle = first.name;
    state.lastEventDescription = first.description;
    state.lastEventTip = first.tip;
    state.lastEventMessage = first.name;
  } else {
    state.lastEventTitle = '';
    state.lastEventDescription = '';
    state.lastEventTip = '';
    state.lastEventMessage = '';
  }
}

/** Remove eventos que são normalizados pela ação do jogador (ou por bimesterEnd). schoolId: escola alvo da ação; se omitido (ex.: bimesterEnd), aplica em todas. */
export function resolveEventsByAction(state: SimState, actionType: string, schoolId?: number): void {
  state.activeEventModifiers = state.activeEventModifiers.filter((m) => {
    const actions = m.resolvedByActions;
    if (!actions || !actions.length) return true;
    return !actions.includes(actionType);
  });
  const schoolsToResolve = schoolId != null
    ? state.schools.filter((s) => s.id === schoolId)
    : state.schools;
  for (const school of schoolsToResolve) {
    const events = school.activeEvents ?? [];
    school.activeEvents = events.filter((m) => {
      const actions = m.resolvedByActions;
      if (!actions || !actions.length) return true;
      return !actions.includes(actionType);
    });
  }
  syncLastEventFromActive(state);
}

export function tryTriggerRandomEvent(state: SimState): void {
  if (state.currentDay < state.nextRandomEventDay) return;
  if (Math.random() > EVENT_CHANCE_PER_DAY) return;

  const def = pickRandomEvent();
  const mod: EventModifier = {
    id: def.id + '_' + state.currentDay + '_' + Math.random().toString(36).slice(2, 8),
    name: def.title,
    description: def.description,
    tip: def.tip,
    endDay: state.currentDay,
    revenueMultiplier: def.revenueMultiplier,
    attendancePenalty: def.attendancePenalty,
    gradePenalty: def.gradePenalty,
    diariesPenalty: def.diariesPenalty,
    oneTimeCostCents: def.oneTimeCostCents,
    resolvedByActions: def.resolvedByActions,
  };

  if (GLOBAL_EVENT_IDS.includes(def.id)) {
    state.activeEventModifiers.push(mod);
    state.budgetCents -= def.oneTimeCostCents;
    state.lastEventMessage = def.title;
    state.lastEventTitle = def.title;
    state.lastEventDescription = def.description;
    state.lastEventTip = def.tip;
  } else {
    if (state.schools.length === 0) {
      state.nextRandomEventDay =
        state.currentDay + MIN_DAYS_BETWEEN_EVENTS + Math.floor(Math.random() * (MAX_DAYS_BETWEEN_EVENTS - MIN_DAYS_BETWEEN_EVENTS));
      return;
    }
    const school = state.schools[Math.floor(Math.random() * state.schools.length)];
    if (!school.activeEvents) school.activeEvents = [];
    school.activeEvents.push(mod);
    state.budgetCents -= def.oneTimeCostCents;
    state.lastEventMessage = `${def.title} (${school.name})`;
    state.lastEventTitle = def.title;
    state.lastEventDescription = def.description;
    state.lastEventTip = def.tip;
  }

  state.nextRandomEventDay =
    state.currentDay + MIN_DAYS_BETWEEN_EVENTS + Math.floor(Math.random() * (MAX_DAYS_BETWEEN_EVENTS - MIN_DAYS_BETWEEN_EVENTS));
}

/** Totais de penalidades dos eventos globais (para compatibilidade). */
export function getActiveModifierTotals(state: SimState): {
  attendancePenalty: number;
  gradePenalty: number;
  diariesPenalty: number;
} {
  let attendancePenalty = 0;
  let gradePenalty = 0;
  let diariesPenalty = 0;
  for (const m of state.activeEventModifiers) {
    attendancePenalty += m.attendancePenalty;
    gradePenalty += m.gradePenalty;
    diariesPenalty += m.diariesPenalty;
  }
  return { attendancePenalty, gradePenalty, diariesPenalty };
}

/** Totais de penalidades dos eventos desta escola, com multiplicador para impacto mais visível. */
export function getActiveModifierTotalsForSchool(school: School): {
  attendancePenalty: number;
  gradePenalty: number;
  diariesPenalty: number;
} {
  const events = school.activeEvents ?? [];
  let attendancePenalty = 0;
  let gradePenalty = 0;
  let diariesPenalty = 0;
  for (const m of events) {
    attendancePenalty += m.attendancePenalty;
    gradePenalty += m.gradePenalty;
    diariesPenalty += m.diariesPenalty;
  }
  const mult = SCHOOL_EVENT_PENALTY_MULTIPLIER;
  return {
    attendancePenalty: Math.round(attendancePenalty * mult),
    gradePenalty: Math.round(gradePenalty * mult * 100) / 100,
    diariesPenalty: Math.round(diariesPenalty * mult),
  };
}

const OVERUSE_RESOLVED_BY: Record<string, string[]> = {
  campaignAttendance: ['improveInfrastructure', 'hireTeacher'],
  campaignGrade: ['trainTeacher', 'improveInfrastructure'],
  maintenance: ['improveInfrastructure'],
  trainTeacher: ['hireTeacher', 'improveInfrastructure'],
};

const OVERUSE_BY_ACTION: Record<
  string,
  { title: string; description: string; tip: string; attendancePenalty: number; gradePenalty: number; diariesPenalty: number }
> = {
  campaignAttendance: {
    title: 'Sobrecarga com campanhas de frequência',
    description: 'O uso repetido de campanhas de frequência sobrecarregou as equipes escolares. A eficácia caiu e os diários de classe ficaram atrasados.',
    tip: 'Varie as ações: invista em infraestrutura e mais docentes para melhorar a frequência de forma sustentável.',
    attendancePenalty: 3,
    gradePenalty: 0,
    diariesPenalty: 12,
  },
  campaignGrade: {
    title: 'Recuperação de notas em excesso',
    description: 'Muitas campanhas de recuperação seguidas cansaram docentes e alunos. O efeito positivo diminuiu e a rotina de registros foi afetada.',
    tip: 'Priorize capacitação de docentes e melhoria de infraestrutura para ganhos de médias no longo prazo.',
    attendancePenalty: 2,
    gradePenalty: 0.3,
    diariesPenalty: 10,
  },
  maintenance: {
    title: 'Uso excessivo de manutenção emergencial',
    description: 'A rede passou a depender demais de manutenções emergenciais. As equipes estão sobrecarregadas e a satisfação caiu.',
    tip: 'Invista em melhorar infraestrutura de forma permanente para reduzir a necessidade de manutenções de emergência.',
    attendancePenalty: 4,
    gradePenalty: 0.2,
    diariesPenalty: 8,
  },
  trainTeacher: {
    title: 'Capacitação em excesso',
    description: 'Muitas capacitações seguidas tiraram docentes de sala e sobrecarregaram a rotina. Frequência e diários foram prejudicados.',
    tip: 'Espalhe as capacitações no tempo e combine com contratação de novos docentes para não sobrecarregar a rede.',
    attendancePenalty: 5,
    gradePenalty: 0.1,
    diariesPenalty: 15,
  },
};

export function tryTriggerOveruseEvent(state: SimState, actionType: string): boolean {
  const count = state.actionUseCount[actionType] ?? 0;
  if (count < OVERUSE_THRESHOLD) return false;
  const def = OVERUSE_BY_ACTION[actionType];
  if (!def) return false;
  state.actionUseCount[actionType] = 0;
  const mod: EventModifier = {
    id: 'overuse_' + actionType + '_' + state.currentDay + '_' + Math.random().toString(36).slice(2, 8),
    name: def.title,
    description: def.description,
    tip: def.tip,
    endDay: state.currentDay,
    revenueMultiplier: 1,
    attendancePenalty: def.attendancePenalty,
    gradePenalty: def.gradePenalty,
    diariesPenalty: def.diariesPenalty,
    oneTimeCostCents: 0,
    resolvedByActions: OVERUSE_RESOLVED_BY[actionType] ?? ['bimesterEnd'],
  };
  if (state.schools.length > 0) {
    const school = state.schools[Math.floor(Math.random() * state.schools.length)];
    if (!school.activeEvents) school.activeEvents = [];
    school.activeEvents.push(mod);
    state.lastEventMessage = `${def.title} (${school.name})`;
  } else {
    state.activeEventModifiers.push(mod);
    state.lastEventMessage = def.title;
  }
  state.lastEventTitle = def.title;
  state.lastEventDescription = def.description;
  state.lastEventTip = def.tip;
  return true;
}
