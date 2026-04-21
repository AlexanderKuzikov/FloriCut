# FloriCut

**Пакетный CLI-инструмент для умного кадрирования фотографий букетов с помощью VLM**

FloriCut отправляет фото в Vision Language Model, получает вертикальные границы букета и автоматически обрезает изображение до нужного соотношения сторон — сохраняя ширину и центрируя кадр по букету.

---

## Как это работает

```
Оригинал WebP
    → resize до 512px (в памяти, для VLM)
    → VLM определяет {top, bottom} букета в шкале 0–100
    → расчёт кропа по оригинальным размерам
    → extract + сохранение WebP
```

VLM возвращает относительные координаты, поэтому ресайз для запроса не влияет на качество кропа — он применяется к оригиналу.

---

## Структура проекта

```
floricut/
├── src/
│   ├── index.ts        # CLI, точка входа
│   ├── processor.ts    # batch pipeline
│   ├── vlm.ts          # VLM client (OpenAI-compatible)
│   ├── cropper.ts      # sharp + математика кропа
│   └── types.ts        # типы
├── config.json         # настройки (не секреты)
├── .env                # API ключ
├── .env.example
├── input/              # исходные WebP
├── output/             # результаты
├── errors/             # файлы с ошибками VLM/обработки
├── package.json
└── tsconfig.json
```

---

## Установка

```bash
git clone https://github.com/AlexanderKuzikov/FloriCut.git
cd FloriCut
npm install
```

---

## Настройка

### `.env`

```env
OPENAI_API_KEY=sk-...
```

### `config.json`

```json
{
  "baseURL": "https://api.your-provider.ru/v1",
  "model": "qwen/qwen3.5-flash-02-23",
  "targetAspectRatio": { "w": 3, "h": 4 },
  "vlmResizeWidth": 512,
  "concurrency": 4,
  "outputFormat": "webp",
  "outputQuality": 75,
  "skipExisting": true,
  "dryRun": false,
  "inputDir": "./input",
  "outputDir": "./output",
  "errorDir": "./errors",
  "prompt": "Imagine the image height is exactly 100 units (top=0, bottom=100). Where is the bouquet (including packaging, wrapping, or basket) located vertically? Return ONLY valid JSON: {\"top\": <integer>, \"bottom\": <integer>}"
}
```

| Параметр | Описание |
|---|---|
| `baseURL` | Endpoint OpenAI-совместимого провайдера |
| `model` | Имя модели на провайдере |
| `targetAspectRatio` | Целевое соотношение сторон `w:h` |
| `vlmResizeWidth` | Ширина ресайза для отправки в VLM (пикс.) |
| `concurrency` | Параллельные запросы к VLM |
| `outputQuality` | Качество WebP на выходе (0–100) |
| `skipExisting` | Пропускать уже обработанные файлы |
| `dryRun` | Расчёт без записи файлов |
| `inputDir` | Папка с исходными WebP |
| `outputDir` | Папка для результатов |
| `errorDir` | Папка для файлов с ошибками обработки |

---

## Запуск

```bash
# стандартный запуск
npm start

# dry-run — покажет что будет обрезано без записи
npm start -- --dry-run

# конкретная папка
npm start -- --input ./my-photos --output ./cropped

# пересчитать все, игнорируя skipExisting
npm start -- --force
```

---

## Логика кропа

```
targetH = imgW × (h / w)

bouquetTopPx    = (top / 100) × imgH
bouquetBottomPx = (bottom / 100) × imgH
centerY         = (bouquetTopPx + bouquetBottomPx) / 2

cropTop = centerY − targetH / 2
cropTop = clamp(cropTop, 0, imgH − targetH)
```

Если `imgH ≤ targetH` — файл пропускается (кропить нечего), записывается в лог.

---

## Поддерживаемые модели

Любая OpenAI-совместимая VLM с поддержкой vision. Протестировано на:

- `qwen/qwen3.5-flash-02-23`
- `google/gemma-4-31b`

---

## Требования

- Node.js 20+
- npm 10+
