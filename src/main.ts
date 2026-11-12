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
let activePanel = 'schools';

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
      <li><strong>Muitas faltas:</strong> faça uma <strong>Campanha de frequência</strong> na escola afetada. Melhorar a infraestrutura e contratar docentes também ajuda.</li>
      <li><strong>Notas baixas:</strong> use <strong>Recuperação de notas</strong> para reforço imediato. Capacite os docentes e melhore a infraestrutura para manter as notas altas.</li>
      <li><strong>Diários atrasados:</strong> capacite os docentes para melhorar os registros. A <strong>Manutenção emergencial</strong> também ajuda a colocar os diários em dia.</li>
      <li><strong>Alertas nas turmas:</strong> confira a frequência e os diários da escola. Escolha a ação de acordo com o indicador que caiu.</li>
      <li><strong>Comunidade insatisfeita:</strong> a satisfação acompanha os resultados da rede. Melhore a frequência, as notas e os registros para recuperar a confiança das famílias.</li>
    </ul>

    <h3>Ações e custos</h3>
    <p>Cada ação tem custo em orçamento. Construir escola e melhorar infraestrutura são os mais caros; campanhas e manutenção emergencial têm custo médio; contratar e capacitar docentes também custam. Fique de olho no orçamento e nos indicadores para escolher a melhor ação no momento.</p>

    <h3>Eventos aleatórios</h3>
    <p>Chuva, greve e cortes de verba podem mudar os planos. Leia o aviso na escola afetada e a dica de como resolver o problema. Alguns eventos só terminam quando você toma uma das ações indicadas; outros acabam no fechamento do bimestre.</p>

    <h3>Fim de jogo</h3>
    <p>Você pode perder o cargo antes dos 3 anos. O orçamento negativo por <strong>30 dias seguidos</strong> leva à intervenção. Frequência, notas ou satisfação em situação crítica por <strong>45 dias seguidos</strong> também encerram a gestão. Depois do dia 90, frequência abaixo de 50% encerra a partida; depois do dia 180, satisfação abaixo de 20% tem o mesmo efeito.</p>
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
  const resume = !!app.querySelector('.game-shell') && !game.getState().isPaused;
  if (resume) game.setPaused(true);
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
      if (resume) game.setPaused(false);
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
  const schoolScrollTop = app.querySelector('.school-panel')?.scrollTop ?? 0;
  const ind = networkIndicators(s);
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
        <strong>Eventos ativos (${sc.activeEvents.length})</strong>
        ${sc.activeEvents.map((ev) => `<div class="school-event"><strong>${ev.name}</strong><br><span class="event-tip">${ev.tip}</span></div>`).join('')}
      </div>` : ''}
      <div class="school-actions">
        <button class="btn btn-secondary btn-expand" data-school-id="${sc.id}">Expandir +50 vagas <span class="action-cost">${formatMoney(SCHOOL_EXPAND_COST_PER_50)}</span></button>
        <button class="btn btn-secondary btn-infra" data-school-id="${sc.id}" ${sc.infrastructureLevel >= 5 ? 'disabled' : ''}>Melhorar infraestrutura <span class="action-cost">${formatMoney(INFRASTRUCTURE_LEVEL_COST_CENTS)}</span></button>
        <button class="btn btn-primary btn-hire" data-school-id="${sc.id}">Contratar docente <span class="action-cost">${formatMoney(TEACHER_HIRE_COST_CENTS)}</span></button>
        <button class="btn btn-secondary btn-train" data-teacher-id="${firstTeacherId ?? ''}" ${!firstTeacherId ? 'disabled' : ''}>Capacitar docente <span class="action-cost">${formatMoney(TEACHER_TRAINING_COST_CENTS)}</span></button>
        <button class="btn btn-warning btn-campaign-att" data-school-id="${sc.id}" ${hasCampaignAtt ? 'disabled' : ''}>Campanha de frequência <span class="action-cost">${formatMoney(CAMPAIGN_ATTENDANCE_COST_CENTS)}</span></button>
        <button class="btn btn-warning btn-campaign-grade" data-school-id="${sc.id}" ${hasCampaignGrade ? 'disabled' : ''}>Recuperação de notas <span class="action-cost">${formatMoney(CAMPAIGN_GRADE_COST_CENTS)}</span></button>
        <button class="btn btn-secondary btn-maintenance" data-school-id="${sc.id}">Manutenção emergencial <span class="action-cost">${formatMoney(MAINTENANCE_EMERGENCY_COST_CENTS)}</span></button>
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
    <div class="game-shell" data-panel="${activePanel}"><header class="header">
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

    <section class="mission-strip" aria-label="Metas da rede">
      <div><span class="eyebrow">MISSÃO · 3 ANOS LETIVOS</span><strong>Cumpra as metas a cada ano.</strong></div>
      <div class="goal ${ind.attendance >= s.targetAttendance ? 'met' : ''}"><span>Frequência / meta ${s.targetAttendance}%</span><strong>${ind.attendance.toFixed(1)}%</strong><progress max="100" value="${ind.attendance}"></progress></div>
      <div class="goal ${ind.averageGrade >= s.targetAverageGrade ? 'met' : ''}"><span>Notas / meta ${s.targetAverageGrade}</span><strong>${ind.averageGrade.toFixed(1)}</strong><progress max="10" value="${ind.averageGrade}"></progress></div>
      <div class="goal"><span>Comunidade</span><strong>${s.communitySatisfaction.toFixed(0)}% satisfeita</strong></div>
    </section>
    ${s.activeEventModifiers?.length && s.lastEventTitle ? `
    <div class="event-banner">
      <strong>${s.lastEventTitle}</strong>
      <p class="event-desc">${s.lastEventDescription || ''}</p>
      <p class="event-tip"><strong>Dica:</strong> ${s.lastEventTip || ''}</p>
    </div>` : ''}

    <nav class="view-switch" aria-label="Painéis do jogo"><button class="btn ${activePanel === 'schools' ? 'btn-active' : ''}" data-panel-switch="schools">Escolas</button><button class="btn ${activePanel === 'network' ? 'btn-active' : ''}" data-panel-switch="network">Central da rede</button></nav>
    <div class="panels">
      <div>
        <div class="panel school-panel">
          <h2>Escolas da rede</h2>
          <ul class="school-list">${schoolsHtml}</ul>
        </div>
        <div class="panel chart-panel">
          <h2>Evolução dos indicadores</h2>
          <div class="chart-container">
            ${s.indicatorHistory.length < 2 ? '<p class="empty-chart">O primeiro balanço chega no fechamento do bimestre.</p>' : '<canvas id="chart"></canvas>'}
          </div>
        </div>
      </div>
      <div>
        <div class="panel actions-panel">
          <h2>Ações</h2>
          <button class="btn btn-success" data-build-school>Construir nova escola <span class="action-cost">${formatMoney(SCHOOL_BUILD_COST_CENTS)}</span></button>
          <button class="btn btn-danger" data-emergency-fund ${s.emergencyFundUsed ? 'disabled' : ''} title="${s.emergencyFundUsed ? 'Já utilizada nesta partida' : 'Adiciona R$ 10.000 ao orçamento. Uso único.'}">Verba emergencial (+${formatMoney(EMERGENCY_FUND_CENTS)}). Uso único</button>
          <div class="next-event">
            <strong>Próximo evento:</strong><br>${s.nextEventLabel} em ${s.nextEventDays} dias
          </div>
        </div>
      </div>
    </div></div>
  `;

  const schoolPanel = app.querySelector('.school-panel');
  if (schoolPanel) schoolPanel.scrollTop = schoolScrollTop;
  app.querySelectorAll<HTMLElement>('[data-panel-switch]').forEach(btn => btn.addEventListener('click', () => {
    activePanel = btn.dataset.panelSwitch!;
    renderGame();
  }));
  // Chart
  const chartEl = document.getElementById('chart') as HTMLCanvasElement;
  if (chartEl && s.indicatorHistory.length > 0) {
    const container = chartEl.parentElement!;
    const w = container.clientWidth;
    const h = container.clientHeight;
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
    if (r.ok) showToast('Nova escola aberta. Contrate docentes para receber os alunos.', 'success');
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
  const financial = /Orçamento/.test(state.endMessage);
  const expired = /período/.test(state.endMessage);
  const title = isVictory ? 'Metas cumpridas. Mandato aprovado!' : financial ? 'Faltou verba para continuar.' : expired ? 'Fim do mandato. Faltaram as metas.' : 'Você perdeu o cargo.';
  const story = isVictory
    ? `A frequência e as notas ficaram dentro das metas nos três fechamentos anuais. Sua rede termina o mandato com ${state.schools.length} escolas e ${totalStudents} alunos. Deu trabalho, mas deu certo.`
    : financial ? `O orçamento ficou negativo por 30 dias seguidos e a gestão sofreu intervenção. As ${state.schools.length} escolas continuam, mas com outra pessoa no comando.`
    : expired ? `Os três anos passaram e nem todos os fechamentos anuais tiveram as metas cumpridas. Você encerra o mandato com ${totalStudents} alunos na rede.`
    : `A situação da rede custou seu cargo no dia ${state.currentDay}. A prefeitura vai nomear outra pessoa para cuidar das ${state.schools.length} escolas.`;
  const closingRemarks = isVictory ? [
    'Metas cumpridas, diários conferidos. Dá até para tomar o café da sala dos professores ainda quente.',
    'A rede foi tão bem que sobrou tempo para procurar aquela chave do armário de materiais.',
    'Pode comemorar com a equipe! Só não use o verso do relatório final para anotar a lista do lanche.',
  ] : financial ? [
    'Na lista de compras tinha papel, tinta e lâmpadas. Faltou incluir o dinheiro para pagar tudo.',
    'Você economizou até nos clipes, mas abriu outra escola. A conta era um pouquinho maior que a caixa de papelaria.',
    'A escola nova ficou bonita no planejamento. A conta de manutenção veio sem pedir licença.',
  ] : ind.attendance < state.targetAttendance ? [
    'O cartaz da campanha ficou ótimo. Na próxima, vale tirar uma cópia para fora da sala da coordenação.',
    'Você conferiu a frequência em três planilhas. Era a mesma frequência, só que com mais abas abertas.',
    'O plano de acompanhamento estava na pasta certa. O problema foi lembrar qual era a pasta certa.',
  ] : ind.averageGrade < state.targetAverageGrade ? [
    'Você aumentou a fonte do boletim. As notas ficaram maiores, mas só no tamanho da letra.',
    'O material de recuperação estava pronto. A impressora escolheu justamente esse dia para pedir toner.',
    'O plano de recuperação tinha capa, sumário e tudo. Na próxima, reserve um tempo para as aulas também.',
  ] : [
    'Você escreveu resolver depois num post-it. Agora tem um mural inteiro de depois.',
    'A agenda ficou organizada por cores. Só faltou encontrar um horário livre para executar o planejamento.',
    'O último sinal tocou e ainda tinha tarefa na mesa da coordenação. Nem tudo cabe nos cinco minutinhos finais.',
  ];
  const advice = isVictory ? 'Quer tentar de novo? Abra mais escolas e veja se consegue fechar os três anos com uma rede maior.'
    : financial ? 'Na próxima partida, guarde dinheiro para os dias até o repasse. Cada escola nova também aumenta a conta de manutenção.'
    : ind.attendance < state.targetAttendance ? `A frequência ficou ${(state.targetAttendance - ind.attendance).toFixed(1)} pontos percentuais abaixo da meta. Faça campanhas nas escolas com mais faltas e confira se há docentes suficientes.`
    : ind.averageGrade < state.targetAverageGrade ? `A média terminou em ${ind.averageGrade.toFixed(1)}, abaixo da meta de ${state.targetAverageGrade.toFixed(1)}. Capacite docentes e faça recuperação nas escolas com notas baixas.`
    : 'Confira as metas antes de cada fechamento do ano letivo. Distribua os investimentos ao longo do calendário escolar.';
  const closing = `${closingRemarks[Math.floor(Math.random() * closingRemarks.length)]} ${advice}`;

  const overlay = document.createElement('div');
  overlay.className = 'overlay end-game-overlay';
  overlay.setAttribute('data-end-game', '');
  overlay.innerHTML = `
    <div class="overlay-box end-game-modal ${isVictory ? 'victory' : 'defeat'}">
      <span class="eyebrow">${isVictory ? 'MANDATO CONCLUÍDO' : 'BALANÇO DO MANDATO'}</span>
      <h2>${title}</h2>
      <p class="end-game-message">${story}</p>
      <p class="end-reason">${state.endMessage}</p>
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
  if (dismissBtn) {
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

window.addEventListener('resize', () => {
  if (app.querySelector('.game-shell')) renderGame();
});
