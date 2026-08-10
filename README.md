<p align="center">
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://github.com/AlexanderKuzikov/FloriCut/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/License-Apache--2.0-blue"></a>
</p>

<h1 align="center">FloriCut</h1>
<p align="center">Умное кадрирование фото букетов через VLM</p>

---

Пакетный CLI для автоматического кадрирования фотографий букетов с использованием vision-language моделей. Определяет оптимальную область обрезки через OpenAI-compatible API.

- **VLM-кадрирование** — определение границ букета через анализ изображения.
- **Пакетная обработка** — массовая обработка директорий с rate limiting (bottleneck).
- **CLI-интерфейс** — гибкая настройка через commander.

## Быстрый старт

```bash
git clone https://github.com/AlexanderKuzikov/FloriCut.git
cd FloriCut
npm install
npm run build
npm start
```

## Документация

- [`docs/CONTEXT.md`](docs/CONTEXT.md) — состояние проекта
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — архитектурные решения

## Статус

**v1.0.0** — работает.

## Лицензия

[Apache-2.0](LICENSE) © Alexander Kuzikov
