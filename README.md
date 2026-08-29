# Avalia+ Tycoon da Educação

Simulador no estilo Tycoon em **TypeScript** para o navegador. O jogador gerencia uma rede municipal de educação inspirada no sistema Avalia+: abre escolas, contrata docentes, acompanha frequência e notas, investe em melhorias e tenta elevar os indicadores e a satisfação da comunidade.

## Como rodar

```bash
npm install
npm run dev
```

Abre no navegador o endereço indicado (geralmente `http://localhost:5173`).

## Build para produção

```bash
npm run build
```

Arquivos em `dist/`. Servir com qualquer servidor estático ou `npm run preview`.

## Executável desktop (Electron)

- **Desenvolvimento:** em um terminal rode `npm run dev`; em outro, `npm run electron:dev`. O Electron abre a janela carregando o Vite em `http://localhost:5173`.
- **Gerar instalador/executável:** `npm run electron:build`. O instalador Windows (NSIS) sai em `release/`.

## Mecânicas principais

- **Recursos:** orçamento (receita da prefeitura + bônus por metas), escolas (capacidade, infraestrutura), docentes (qualificação, satisfação), alunos (matrículas por escola).
- **Indicadores:** frequência média, média de notas, % diários/planos em dia, alertas (turmas críticas), satisfação da SEMED/comunidade.
- **Ações:** construir escola, expandir escola (+50 vagas), melhorar infraestrutura, contratar docente, capacitar docente.
- **Tempo:** simulado em dias; bimestres de 45 dias; fechamento de bimestre atualiza indicadores e concede bônus por metas.
- **Vitória:** atingir as metas (frequência e média) em **3 anos letivos** consecutivos.
- **Derrota:** orçamento negativo por 30 dias seguidos, ou indicadores críticos (evasão/satisfação muito baixos).

## Persistência

Use **Salvar** no jogo. A partida é gravada em `localStorage`. Na próxima abertura, pode **Continuar partida** ou iniciar uma **Nova partida**.

## Stack

- **TypeScript** (strict)
- **Vite** (build e dev server)
- HTML + CSS + JS no navegador; sem framework (UI em vanilla TS)
- Lógica de simulação em módulos puros em `src/sim/` (tick, fórmulas, ações)

Linguagem e identidade: português brasileiro, termos como bimestre, turma, docente, diário de classe, plano de aula e SEMED.
