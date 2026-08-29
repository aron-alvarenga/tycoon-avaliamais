# Assets do Avalia+ Tycoon

Ícones e imagens usados na UI. Gerados para o tema educação municipal (flat, minimalista).

## Estrutura

- **icons/** — Ícones do dashboard e indicadores (escola, docente, aluno, orçamento, satisfação).

## Uso no código

As chaves e URLs estão em `src/assets/manifest.ts`. Use `ICONS.SCHOOL`, `ICONS.TEACHER`, etc.

## Adicionar novos assets

1. Gere ou desenhe a imagem e salve em `public/assets/` (subpasta conforme o tipo).
2. Adicione a chave em `src/assets/manifest.ts`.
3. Use a constante no HTML/TS (ex.: `<img src="${ICONS.NOVA_CHAVE}" />`).
