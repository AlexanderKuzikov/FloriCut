# FloriCut — Instructions for AI Agents

## Commands
- start: `npm start`
- build: `npm run build`
- dev: `npm run dev`

## Conventions
- TypeScript ESM
- openai (VLM), sharp, commander, bottleneck, cli-progress, p-limit
- Умное кадрирование через Vision Language Model
- Rate limiting через bottleneck

## Structure
- `src/` — CLI + логика кадрирования
- `dist/` — build output

## Do NOT touch
- `.env` — API-ключи
- `node_modules/`
- `dist/` — генерируется

## Documentation rules
- После работы — обнови docs/CONTEXT.md
- НЕ создавай новых файлов документации без разрешения
