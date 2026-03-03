# Hokus x ElevenLabs: Ultra-Short Micro-Samples Prompt Pack

Документ покрывает все sample-id из текущего кода, но в формате **ультракоротких микро-сэмплов**.

## 1) Что нужно сгенерировать

Обязательные sample-id:
- `rain_drizzle_soft_loop`
- `rain_drizzle_dense_loop`
- `rain_steady_soft_loop`
- `rain_steady_dense_loop`
- `rain_storm_soft_loop`
- `rain_storm_dense_loop`
- `thunder_crack_close`
- `thunder_roll_far`
- `forest_bird_soft`
- `forest_leaves_brush`
- `wind_soft_gust`
- `wind_dark_gust`

Важно: суффикс `_loop` в rain-id оставляем для совместимости с кодом, но сами ассеты делаем микро-длинами.

## 2) Технические настройки экспорта

- Формат: `WAV`
- Sample rate: `48 kHz`
- Bit depth: `24-bit`
- Каналы: `mono` (для всех микро-сэмплов)
- Peak: не выше `-1 dBFS`
- Fade in/out: `5-10 ms`
- Без музыки, без мелодии, без голоса, без UI SFX

## 3) Целевые длительности (строго)

- rain (`rain_*_loop`): `80-400 ms`
- thunder attack (`thunder_crack_close`): `50-250 ms`
- thunder tail (`thunder_roll_far`): `300-1200 ms`
- forest (`forest_*`): `120-700 ms`
- wind (`wind_*`): `200-900 ms`

## 4) Сколько вариантов делать

Минимум (MVP):
- каждый из 12 id: по `8` вариантов

Рекомендуемо:
- rain ids: по `12` вариантов
- thunder ids: по `12` вариантов
- forest ids: по `10` вариантов
- wind ids: по `10` вариантов

## 5) Промпты по каждому sample-id

Ниже промпты сразу под микро-длины. Для вариаций меняй только `Variation hint`.

### rain_drizzle_soft_loop ✅ 16шт
- Длительность: `80-220 ms`
- Prompt:

```text
Ultra-short rain micro-sample one-shot, light drizzle, soft tiny droplets, close texture, no thunder, no birds, no wind gust, no voices, no music. Very clean transient and quick natural decay. Length must stay under 220 milliseconds.
```

- Variation hint:
`Variation hint: brighter top, slightly drier body, very low dynamics.`

### rain_drizzle_dense_loop ✅ 12шт
- Длительность: `120-300 ms`
- Prompt:

```text
Ultra-short rain micro-sample one-shot, light drizzle but denser droplet cluster, many tiny particles, no thunder, no birds, no voices, no music. Crisp micro texture with short decay. Length must stay under 300 milliseconds.
```

- Variation hint:
`Variation hint: more micro-particle detail, slightly wider timbre, restrained highs.`

### rain_steady_soft_loop ✅ 16шт
- Длительность: `160-320 ms`
- Prompt:

```text
Ultra-short rain micro-sample one-shot, steady rain character, soft and smooth transient, natural water texture, no thunder, no wind gust, no voices, no music. Clean short tail. Length must stay under 320 milliseconds.
```

- Variation hint:
`Variation hint: warmer mids, less sharp attack, gentle body.`

### rain_steady_dense_loop ✅ 13шт
- Длительность: `180-380 ms`
- Prompt:

```text
Ultra-short rain micro-sample one-shot, steady dense rain texture, compact and detailed droplets, no thunder crack, no birds, no voices, no music. Tight transient with controlled short tail. Length must stay under 380 milliseconds.
```

- Variation hint:
`Variation hint: sharper droplets, slightly noisier texture, same loudness.`

### rain_storm_soft_loop ✅ 16шт
- Длительность: `220-400 ms`
- Prompt:

```text
Ultra-short rain micro-sample one-shot, storm-intensity rain feel but softened attack, heavy water texture in a compact hit, no thunder event included, no voices, no music. Natural short decay. Length must stay under 400 milliseconds.
```

- Variation hint:
`Variation hint: more low body, smoother highs, compact tail.`

### rain_storm_dense_loop ✅ 12шт
- Длительность: `250-400 ms`
- Prompt:

```text
Ultra-short rain micro-sample one-shot, heavy storm dense rain burst, rich droplet noise, punchy and compact, no thunder crack inside, no voices, no music. Keep tail short and clean. Length must stay under 400 milliseconds.
```

- Variation hint:
`Variation hint: brighter transient, denser mid texture, faster fade out.`

### thunder_crack_close ✅ 15шт
- Длительность: `50-250 ms`
- Prompt:

```text
Ultra-short thunder attack micro-sample one-shot, close bright crack transient only, very fast impact, minimal tail, no rain bed, no wind bed, no voices, no music, no distortion. Length must stay under 250 milliseconds.
```

- Variation hint:
`Variation hint: harder attack edge, tiny spectral variation, same peak target.`

### thunder_roll_far ✅ 11шт
- Длительность: `300-1200 ms`
- Prompt:

```text
Ultra-short thunder tail micro-sample one-shot, distant low rumble decay, soft onset and short rolling tail, no rain loop, no voices, no music. Keep it compact and natural. Length must stay under 1200 milliseconds.
```

- Variation hint:
`Variation hint: darker low end, slower tail curve, reduced high content.`

### forest_bird_soft ✅ 10шт
- Длительность: `120-500 ms`
- Prompt:

```text
Ultra-short forest micro-sample one-shot, single soft bird chirp fragment, delicate and clean, no background rain, no wind bed, no voices, no music. Short natural decay. Length must stay under 500 milliseconds.
```

- Variation hint:
`Variation hint: tiny pitch shift, slightly different chirp tone, same softness.`

### forest_leaves_brush ✅ 12шт
- Длительность: `180-700 ms`
- Prompt:

```text
Ultra-short forest micro-sample one-shot, subtle leaves brush rustle, organic dry texture, no bird vocalization, no rain, no footsteps, no voices, no music. Keep transient clear and tail short. Length must stay under 700 milliseconds.
```

- Variation hint:
`Variation hint: drier leaves, mildly longer rustle, reduced highs.`

### wind_soft_gust ✅ 13шт
- Длительность: `200-700 ms`
- Prompt:

```text
Ultra-short wind micro-sample one-shot, soft airy gust fragment, smooth rise and quick fall, no tonal whistle, no rain layer, no voices, no music. Compact and clean. Length must stay under 700 milliseconds.
```

- Variation hint:
`Variation hint: lighter low end, smoother top, slightly softer onset.`

### wind_dark_gust ✅ 16шт
- Длительность: `300-900 ms`
- Prompt:

```text
Ultra-short wind micro-sample one-shot, dark low gust fragment, deeper airflow texture, short natural decay, no melody, no rain embedded, no voices, no music. Length must stay under 900 milliseconds.
```

- Variation hint:
`Variation hint: more low body, rougher mids, tighter fade out.`

## 6) Шаблон имен файлов

- `<sample_id>_<index>.wav`

Примеры:
- `rain_steady_dense_loop_01.wav`
- `thunder_roll_far_05.wav`
- `forest_bird_soft_07.wav`

## 7) Мини-чек качества

- Длина каждого файла в своем диапазоне (мс).
- Нет клиппинга.
- Нет голоса/музыки.
- Файл не обрезан слишком резко (короткий fade обязателен).
- Варианты внутри одного id слышимо различаются.
