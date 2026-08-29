/**
 * Avalia+ Tycoon da Educação - Entrada e UI principal.
 */

import { initAudio, playMenuMusic, playGameMusic } from './audio';
import type { SimState } from './types';
import * as game from './game';
import { hasSave } from './storage';
import { drawChart } from './ui/chart';
import {
  SCHOOL_BUILD_COST_CENTS,
  SCHOOL_EXPAND_COST_PER_50,
  INFRASTRUCTURE_LEVEL_COST_CENTS,
  TEACHER_HIRE_COST_CENTS,
  TEACHER_TRAINING_COST_CENTS,
  CAMPAIGN_ATTENDANCE_COST_CENTS,
  CAMPAIGN_GRADE_COST_CENTS,
  MAINTENANCE_EMERGENCY_COST_CENTS,
  EMERGENCY_FUND_CENTS,
  communitySatisfactionFromIndicators,
} from './sim/formulas';

const app = document.getElementById('app')!;

function formatMoney(cents: number): string {
  return 'R$ ' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Conteúdo de ajuda/instruções (tela inicial e botão Ajuda) */
function getHelpContent(): string {
  return `
    <h3>Objetivo</h3>
    <p>Você comanda a SEMED (Secretaria Municipal de Educação). Mantenha orçamento saudável, indicadores no azul e a comunidade satisfeita. <strong>Vitória:</strong> atingir as metas de frequência e média de notas em 3 anos letivos seguidos.</p>

    <h3>Orçamento</h3>
    <p>O orçamento é <strong>repassado por bimestre</strong> pela prefeitura. A cada fechamento de bimestre você recebe um novo repasse; entre um e outro, só saem gastos (docentes, manutenção das escolas, ações que você escolher). É sua função administrar esse valor: evite gastar tudo no início do bimestre e deixe margem para imprevistos e eventos. Se o orçamento ficar negativo por muito tempo, a gestão pode ser interditada. Atingir as metas de frequência e notas no bimestre rende bônus extras.</p>

    <h3>Indicadores e o que fazer</h3>
    <p>Frequência média, média de notas, diários/planos em dia, alertas (turmas críticas) e satisfação são exibidos <strong>por escola</strong> no painel "Escolas da rede". Acompanhe cada unidade e use as ações na escola que precisar.</p>
    <ul class="help-list">
      <li><strong>Frequência média baixa</strong> — Muitas faltas. Use <strong>Campanha de frequência</strong> na escola afetada; invista em <strong>Melhorar infraestrutura</strong> e mais <strong>Docentes</strong> para não sobrecarregar turmas.</li>
      <li><strong>Média de notas baixa</strong> — Desempenho fraco. Use <strong>Recuperação de notas</strong> na escola; <strong>Capacitar docente</strong> e <strong>Melhorar infraestrutura</strong> ajudam no longo prazo.</li>
      <li><strong>Diários/planos em dia baixo</strong> — Registros atrasados. Use <strong>Capacitar docente</strong> (melhora o preenchimento) e <strong>Manutenção emergencial</strong> para alívio rápido.</li>
      <li><strong>Muitos alertas (turmas críticas)</strong> — Turmas com frequência ou média crítica. Combine <strong>Campanha de frequência</strong>, <strong>Recuperação de notas</strong> e <strong>Manutenção emergencial</strong> nas escolas com mais alertas.</li>
      <li><strong>Satisfação baixa</strong> — Resultado dos outros indicadores. Melhore frequência, notas e diários em dia; reduza alertas.</li>
    </ul>

    <h3>Ações e custos</h3>
    <p>Cada ação tem custo em orçamento. Construir escola e melhorar infraestrutura são os mais caros; campanhas e manutenção emergencial têm custo médio; contratar e capacitar docentes também custam. Fique de olho no orçamento e nos indicadores para escolher a melhor ação no momento.</p>

    <h3>Eventos aleatórios</h3>
    <p>Eventos (chuva, greve, corte de verba, bônus federal, etc.) mudam temporariamente receita ou indicadores. Cada evento mostra <strong>Título</strong>, <strong>Descrição</strong> e <strong>Dica</strong> — use a dica para decidir a melhor resposta.</p>

    <h3>Fim de jogo</h3>
    <p>Você <strong>perde</strong> antes dos 3 anos se: o orçamento ficar negativo por muito tempo (a SEMED intervém) ou se os indicadores da rede (frequência média, média de notas, satisfação) ficarem <strong>críticos por mais de um bimestre</strong> — nesse caso você é <strong>exonerado por não conseguir gerir a educação</strong>. Reaja rápido aos eventos e às quedas de indicadores para evitar a exoneração.</p>
  `;
}

function showToast(message: string, type: 'success' | 'error'): void {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function renderIntroScreen(): void {
  playMenuMusic();
  app.innerHTML = `
    <div class="intro-screen">
      <h1>Avalia+ Tycoon da Educação</h1>
      <p class="intro-tagline">Simulador de gestão da rede municipal</p>
      <div class="intro-text">
        <p>Você comanda a Secretaria Municipal de Educação (SEMED). Sua missão é manter as escolas em dia, os indicadores no azul e a comunidade satisfeita.</p>
        <p><strong>Recursos:</strong> orçamento limitado, escolas, docentes e alunos. <strong>Indicadores:</strong> frequência, notas, diários de classe em dia e alertas de turmas críticas.</p>
        <p>Construa escolas, contrate e capacite docentes, invista em infraestrutura e campanhas. Eventos aleatórios (corte de verba, chuva, greve, bônus federal…) vão exigir decisões rápidas. Atinga as metas por 3 anos letivos para vencer!</p>
      </div>
      <button class="btn btn-secondary" data-action="help">Como jogar</button>
      <button class="btn btn-primary btn-start" data-action="start">Começar</button>
    </div>
  `;
  app.querySelector('[data-action="help"]')?.addEventListener('click', () => openHelpModal());
  app.querySelector('[data-action="start"]')?.addEventListener('click', () => {
    if (hasSave()) {
      renderStartScreen();
    } else {
      game.startNewGame();
      game.startLoop();
      playGameMusic();
      renderGame();
    }
  });
}

function openHelpModal(): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay help-overlay';
  overlay.innerHTML = `
    <div class="help-modal">
      <h2>Como jogar</h2>
      <div class="help-content">${getHelpContent()}</div>
      <button class="btn btn-primary" data-close-help>Fechar</button>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('overlay') || (e.target as HTMLElement).closest?.('[data-close-help]')) {
      overlay.remove();
    }
  });
  document.body.appendChild(overlay);
}

function renderStartScreen(): void {
  app.innerHTML = `
    <div class="start-screen">
      <h1>Avalia+ Tycoon da Educação</h1>
      <p class="header-sub">Gerencie a rede municipal: escolas, docentes, frequência e notas.</p>
      <button class="btn btn-primary" data-action="continue">Continuar partida</button>
      <button class="btn btn-secondary" data-action="new">Nova partida</button>
    </div>
  `;
  app.querySelector('[data-action="continue"]')?.addEventListener('click', () => {
    game.loadSavedGame();
    game.startLoop();
    playGameMusic();
    renderGame();
  });
  app.querySelector('[data-action="new"]')?.addEventListener('click', () => {
    game.startNewGame();
    game.startLoop();
    playGameMusic();
    renderGame();
  });
}

function networkIndicators(s: SimState): { attendance: number; averageGrade: number; diariesUpToDate: number; alertCount: number } {
  if (s.schools.length === 0) return { attendance: 0, averageGrade: 0, diariesUpToDate: 0, alertCount: 0 };
  return {
    attendance: s.schools.reduce((a, e) => a + e.averageAttendance, 0) / s.schools.length,
    averageGrade: s.schools.reduce((a, e) => a + e.averageGrade, 0) / s.schools.length,
    diariesUpToDate: s.schools.reduce((a, e) => a + e.diariesUpToDate, 0) / s.schools.length,
    alertCount: s.schools.reduce((a, e) => a + e.alertCount, 0),
  };
}

function renderGame(): void {
  const s = game.getState();
  const totalStudents = s.schools.reduce((a, e) => a + e.students, 0);
  const budgetClass = s.budgetCents < 0 ? 'negative' : 'positive';

  const schoolsHtml = s.schools
    .map(
      (sc) => {
        const schoolTeachers = s.teachers.filter((t) => t.schoolId === sc.id);
        const firstTeacherId = schoolTeachers[0]?.id ?? null;
        const hasCampaignAtt = sc.campaignAttendanceEndDay >= s.currentDay;
        const hasCampaignGrade = sc.campaignGradeEndDay >= s.currentDay;
        const hasAlerts = sc.alertCount > 0;
        const schoolSatisfaction = communitySatisfactionFromIndicators(
          sc.averageAttendance,
          sc.averageGrade,
          sc.diariesUpToDate,
          sc.alertCount
        );
        const freqBad = sc.averageAttendance < s.targetAttendance;
        const gradeBad = sc.averageGrade < s.targetAverageGrade;
        const diariesBad = sc.diariesUpToDate < 75;
        const alertsCritical = sc.alertCount > 0;
        const satisfactionBad = schoolSatisfaction < 50;
        return `
    <li class="school-item ${hasAlerts ? 'school-has-alerts' : ''}">
      <div class="school-name">${sc.name}</div>
      <div class="school-stats">
        Alunos: ${sc.students}/${sc.capacity} · Docentes: ${schoolTeachers.length} · Infraestrutura: Nível ${sc.infrastructureLevel}
      </div>
      <div class="school-indicators">
        <div class="indicator-mini freq ${freqBad ? 'indicator-bad' : ''} ${sc.averageAttendance < 70 ? 'indicator-critical' : ''}" title="Frequência média (meta ${s.targetAttendance}%)">
          <span class="label">Frequência</span>
          <span class="value">${sc.averageAttendance.toFixed(1)}%</span>
        </div>
        <div class="indicator-mini grade ${gradeBad ? 'indicator-bad' : ''} ${sc.averageGrade < 5 ? 'indicator-critical' : ''}" title="Média de notas (meta ${s.targetAverageGrade})">
          <span class="label">Média</span>
          <span class="value">${sc.averageGrade.toFixed(1)}</span>
        </div>
        <div class="indicator-mini diaries ${diariesBad ? 'indicator-bad' : ''}" title="Diários/planos em dia">
          <span class="label">Diários</span>
          <span class="value">${sc.diariesUpToDate.toFixed(0)}%</span>
        </div>
        <div class="indicator-mini alerts ${alertsCritical ? 'indicator-bad indicator-critical' : ''}" title="Alertas (turmas críticas)">
          <span class="label">Alertas</span>
          <span class="value">${sc.alertCount}</span>
        </div>
        <div class="indicator-mini satisfaction ${satisfactionBad ? 'indicator-bad' : ''} ${schoolSatisfaction < 30 ? 'indicator-critical' : ''}" title="Satisfação (SEMED/comunidade)">
          <span class="label">Satisfação</span>
          <span class="value">${schoolSatisfaction.toFixed(0)}%</span>
        </div>
      </div>
      ${(sc.activeEvents && sc.activeEvents.length) ? `
      <div class="school-events">
        <strong>⚠️ Eventos ativos (${sc.activeEvents.length}):</strong>
        ${sc.activeEvents.map((ev) => `<div class="school-event"><strong>${ev.name}</strong><br><span class="event-tip">${ev.tip}</span></div>`).join('')}
      </div>` : ''}
      <div class="school-actions">
        <button class="btn btn-secondary btn-expand" data-school-id="${sc.id}">Expandir +50 vagas (${formatMoney(SCHOOL_EXPAND_COST_PER_50)})</button>
        <button class="btn btn-secondary btn-infra" data-school-id="${sc.id}" ${sc.infrastructureLevel >= 5 ? 'disabled' : ''}>Melhorar infraestrutura (${formatMoney(INFRASTRUCTURE_LEVEL_COST_CENTS)})</button>
        <button class="btn btn-primary btn-hire" data-school-id="${sc.id}">Contratar docente (${formatMoney(TEACHER_HIRE_COST_CENTS)})</button>
        <button class="btn btn-secondary btn-train" data-teacher-id="${firstTeacherId ?? ''}" ${!firstTeacherId ? 'disabled' : ''}>Capacitar docente (${formatMoney(TEACHER_TRAINING_COST_CENTS)})</button>
        <button class="btn btn-warning btn-campaign-att" data-school-id="${sc.id}" ${hasCampaignAtt ? 'disabled' : ''}>Campanha de frequência (${formatMoney(CAMPAIGN_ATTENDANCE_COST_CENTS)})</button>
        <button class="btn btn-warning btn-campaign-grade" data-school-id="${sc.id}" ${hasCampaignGrade ? 'disabled' : ''}>Recuperação de notas (${formatMoney(CAMPAIGN_GRADE_COST_CENTS)})</button>
        <button class="btn btn-secondary btn-maintenance" data-school-id="${sc.id}">Manutenção emergencial (${formatMoney(MAINTENANCE_EMERGENCY_COST_CENTS)})</button>
      </div>
    </li>
  `;
      }
    )
    .join('');

  const LOCAL_ICONS = {
    BUDGET: '/assets/v3-edu/budget_icon_1772242630604.png',
    SCHOOL: '/assets/v3-edu/school_icon_1772242647756.png',
    TEACHER: '/assets/v3-edu/teacher_icon_1772242661213.png',
    STUDENT: '/assets/v3-edu/student_icon_1772242675536.png'
  };

  app.innerHTML = `
    <header class="header">
      <div>
        <h1>Avalia+ Tycoon da Educação</h1>
        <div class="header-sub">Ano ${s.currentYear} · ${s.currentBimester}º bimestre · Dia ${s.currentDay}</div>
      </div>
      <div class="controls-row">
        <button class="btn btn-secondary" data-pause>${s.isPaused ? 'Retomar' : 'Pausar'}</button>
        <button class="btn btn-secondary ${s.speedMultiplier === 1 ? 'btn-active' : ''}" data-speed="1">1x</button>
        <button class="btn btn-secondary ${s.speedMultiplier === 2 ? 'btn-active' : ''}" data-speed="2">2x</button>
        <button class="btn btn-secondary ${s.speedMultiplier === 4 ? 'btn-active' : ''}" data-speed="4">4x</button>
        <button class="btn btn-primary" data-save>Salvar</button>
        <button class="btn btn-secondary" data-help title="Ver instruções">Ajuda</button>
      </div>
    </header>

    <section class="dashboard">
      <div class="dash-card">
        <img class="dash-card-icon" src="${LOCAL_ICONS.BUDGET}" alt="" />
        <label>Orçamento</label>
        <div class="value ${budgetClass}">${formatMoney(s.budgetCents)}</div>
      </div>
      <div class="dash-card">
        <img class="dash-card-icon" src="${LOCAL_ICONS.SCHOOL}" alt="" />
        <label>Escolas</label>
        <div class="value">${s.schools.length}</div>
      </div>
      <div class="dash-card">
        <img class="dash-card-icon" src="${LOCAL_ICONS.TEACHER}" alt="" />
        <label>Docentes</label>
        <div class="value">${s.teachers.length}</div>
      </div>
      <div class="dash-card">
        <img class="dash-card-icon" src="${LOCAL_ICONS.STUDENT}" alt="" />
        <label>Alunos</label>
        <div class="value">${totalStudents}</div>
      </div>
    </section>

    ${s.activeEventModifiers?.length && s.lastEventTitle ? `
    <div class="event-banner">
      <strong>⚠️ ${s.lastEventTitle}</strong>
      <p class="event-desc">${s.lastEventDescription || ''}</p>
      <p class="event-tip"><strong>Dica:</strong> ${s.lastEventTip || ''}</p>
    </div>` : ''}

    <div class="panels">
      <div>
        <div class="panel">
          <h2>Escolas da rede</h2>
          <ul class="school-list">${schoolsHtml}</ul>
        </div>
        <div class="panel chart-panel">
          <h2>Evolução dos indicadores</h2>
          <div class="chart-container">
            <canvas id="chart" width="600" height="200"></canvas>
          </div>
        </div>
      </div>
      <div>
        <div class="panel actions-panel">
          <h2>Ações</h2>
          <button class="btn btn-success" data-build-school>Construir nova escola (${formatMoney(SCHOOL_BUILD_COST_CENTS)})</button>
          <button class="btn btn-danger" data-emergency-fund ${s.emergencyFundUsed ? 'disabled' : ''} title="${s.emergencyFundUsed ? 'Já utilizado nesta partida' : 'Adiciona R$ 10.000 ao orçamento. Uso único.'}">Verba emergencial (+${formatMoney(EMERGENCY_FUND_CENTS)}) — uso único</button>
          <div class="next-event">
            <strong>Próximo evento:</strong><br>${s.nextEventLabel} em ${s.nextEventDays} dias
          </div>
        </div>
      </div>
    </div>
  `;

  // Chart
  const chartEl = document.getElementById('chart') as HTMLCanvasElement;
  if (chartEl && s.indicatorHistory.length > 0) {
    const container = chartEl.parentElement!;
    const w = container.clientWidth;
    const h = 200;
    drawChart(chartEl, s.indicatorHistory, w, h);
  }

  // Pausar/Retomar: listener direto; velocidade: listener direto com rAF para evitar clique fantasma
  app.querySelector('[data-pause]')?.addEventListener('click', () => {
    game.setPaused(!game.getState().isPaused);
    renderGame();
  });
  app.querySelectorAll<HTMLElement>('[data-speed]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const mult = Number(btn.dataset.speed) as 1 | 2 | 4;
      if (mult !== 1 && mult !== 2 && mult !== 4) return;
      game.setSpeed(mult);
      requestAnimationFrame(() => renderGame());
    });
  });
  app.querySelector('[data-save]')?.addEventListener('click', () => {
    game.doSave();
    showToast('Partida salva!', 'success');
  });
  app.querySelector('[data-help]')?.addEventListener('click', () => openHelpModal());
  app.querySelector('[data-build-school]')?.addEventListener('click', () => {
    const r = game.buildSchool();
    if (r.ok) showToast('Escola em construção!', 'success');
    else showToast(r.reason, 'error');
    renderGame();
  });
  app.querySelector('[data-emergency-fund]')?.addEventListener('click', () => {
    const r = game.emergencyFund();
    if (r.ok) showToast('Verba emergencial creditada. +R$ 10.000,00', 'success');
    else showToast(r.reason, 'error');
    renderGame();
  });

  app.querySelectorAll('.btn-expand').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.schoolId);
      const r = game.expandSchool(id);
      if (r.ok) showToast('Escola expandida.', 'success');
      else showToast(r.reason, 'error');
      renderGame();
    });
  });
  app.querySelectorAll('.btn-infra').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.schoolId);
      const r = game.improveInfrastructure(id);
      if (r.ok) showToast('Infraestrutura melhorada.', 'success');
      else showToast(r.reason, 'error');
      renderGame();
    });
  });
  app.querySelectorAll('.btn-hire').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.schoolId);
      const r = game.hireTeacher(id);
      if (r.ok) showToast('Docente contratado.', 'success');
      else showToast(r.reason, 'error');
      renderGame();
    });
  });
  app.querySelectorAll('.btn-train').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.teacherId);
      if (!id) return;
      const r = game.trainTeacher(id);
      if (r.ok) showToast('Docente capacitado.', 'success');
      else showToast(r.reason, 'error');
      renderGame();
    });
  });
  app.querySelectorAll('.btn-campaign-att').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.schoolId);
      const r = game.campaignAttendance(id);
      if (r.ok) showToast('Campanha de frequência ativa.', 'success');
      else showToast(r.reason, 'error');
      renderGame();
    });
  });
  app.querySelectorAll('.btn-campaign-grade').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.schoolId);
      const r = game.campaignGrade(id);
      if (r.ok) showToast('Recuperação de notas ativa.', 'success');
      else showToast(r.reason, 'error');
      renderGame();
    });
  });
  app.querySelectorAll('.btn-maintenance').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.schoolId);
      const r = game.maintenanceEmergency(id);
      if (r.ok) showToast('Manutenção realizada.', 'success');
      else showToast(r.reason, 'error');
      renderGame();
    });
  });
}

function renderEndGameModal(state: SimState): void {
  const ind = networkIndicators(state);
  const totalStudents = state.schools.reduce((a, e) => a + e.students, 0);
  const isVictory = state.isVictory;
  const closing = isVictory
    ? 'Parabéns! Você equilibrou recursos e indicadores e conduziu a rede aos objetivos.'
    : 'Conselhos para a próxima: mantenha o orçamento no positivo, invista em docentes e infraestrutura, e use as dicas dos eventos para reagir a cada situação.';

  const overlay = document.createElement('div');
  overlay.className = 'overlay end-game-overlay';
  overlay.setAttribute('data-end-game', '');
  overlay.innerHTML = `
    <div class="overlay-box end-game-modal ${isVictory ? 'victory' : 'defeat'}">
      <h2>${isVictory ? 'Vitória!' : 'Fim de jogo'}</h2>
      <p class="end-game-message">${state.endMessage}</p>
      <div class="end-game-overview">
        <h3>Visão geral</h3>
        <ul>
          <li>Ano letivo: ${state.currentYear} · Dia ${state.currentDay}</li>
          <li>Orçamento final: ${formatMoney(state.budgetCents)}</li>
          <li>Escolas: ${state.schools.length} · Docentes: ${state.teachers.length} · Alunos: ${totalStudents}</li>
          <li>Frequência média: ${ind.attendance.toFixed(1)}% · Média de notas: ${ind.averageGrade.toFixed(1)}</li>
          <li>Diários/planos em dia: ${ind.diariesUpToDate.toFixed(0)}% · Alertas: ${ind.alertCount}</li>
          <li>Satisfação: ${state.communitySatisfaction.toFixed(0)}%</li>
        </ul>
      </div>
      <p class="end-game-closing">${closing}</p>
      <button type="button" class="btn btn-primary" data-end-game-dismiss>Nova partida</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function handleEndGameDismissClick(e: Event): void {
  const target = e.target as Node;
  const el: HTMLElement | null = (target as HTMLElement).nodeType === 1 ? (target as HTMLElement) : (target as Node).parentElement;
  const dismissBtn = el?.closest?.('[data-end-game-dismiss]');
  const overlay: Element | null = dismissBtn?.closest?.('[data-end-game]') ?? (el?.closest?.('[data-end-game]') ?? (el?.hasAttribute?.('data-end-game') ? el : null));
  if (!overlay) return;
  const isBackdrop = target === overlay;
  if (dismissBtn || isBackdrop) {
    e.preventDefault();
    e.stopPropagation();
    overlay.remove();
    game.stopLoop();
    game.startNewGame();
    game.startLoop();
    playGameMusic();
    renderGame();
  }
}

function init(): void {
  initAudio();
  document.body.addEventListener('click', handleEndGameDismissClick, true);
  renderIntroScreen();
}

game.subscribe((s) => {
  if (s.isGameOver || s.isVictory) {
    renderGame();
    // Só abre o modal uma vez — evita empilhar overlays a cada frame enquanto o loop ainda roda
    if (!document.querySelector('.end-game-overlay')) {
      renderEndGameModal(s);
    }
    return;
  }
  setTimeout(() => renderGame(), 0);
});

init();
