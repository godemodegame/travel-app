# Hokus Audio Assets Plan (Micro-Samples)

Этот план ориентирован на **гипер-короткие сэмплы**, из которых движок сам собирает длинные живые лупы.

## Куда добавлять файлы

Основная папка:
- `/Users/godemodegame/repos/travel-app/src/assets/audio/`

Структура:
- `/Users/godemodegame/repos/travel-app/src/assets/audio/rain/`
- `/Users/godemodegame/repos/travel-app/src/assets/audio/thunder/`
- `/Users/godemodegame/repos/travel-app/src/assets/audio/forest/`
- `/Users/godemodegame/repos/travel-app/src/assets/audio/wind/`

Для web-версии (если нужны статические файлы):
- `/Users/godemodegame/repos/travel-app/web/public/audio/`

## Общие требования

- Формат: `wav` (приоритет) или `ogg`.
- Частота: `44.1 kHz` (можно `48 kHz`).
- Битность: `16-bit` или `24-bit`.
- Каждый файл с коротким fade-in/fade-out: `5–15 ms`.
- Без клиппинга, с запасом headroom.
- Нужно много вариаций, чтобы не было слышно повторов.

## Целевые длительности (микро-сэмплы)

- `rain`: `80–400 ms`
- `thunder_attack`: `50–250 ms`
- `thunder_tail`: `300–1200 ms`
- `forest`: `120–700 ms`
- `wind`: `200–900 ms`

## Naming-конвенция

Шаблон:
- `<group>_<type>_<intensity>_<index>.wav`

Примеры:
- `rain_drop_soft_001.wav`
- `rain_noise_mid_004.wav`
- `thunder_attack_hard_002.wav`
- `thunder_tail_far_005.wav`
- `forest_bird_soft_003.wav`
- `wind_gust_dark_006.wav`

## Рекомендуемые наборы по группам

### Rain
Папка:
- `/Users/godemodegame/repos/travel-app/src/assets/audio/rain/`

Добавить:
- 12-20 файлов `rain_drop_*`
- 10-16 файлов `rain_noise_*`
- 6-10 файлов `rain_roof_*`

### Thunder
Папка:
- `/Users/godemodegame/repos/travel-app/src/assets/audio/thunder/`

Добавить:
- 8-12 файлов `thunder_attack_*`
- 8-12 файлов `thunder_tail_*`
- 4-8 файлов `thunder_rumble_*`

### Forest
Папка:
- `/Users/godemodegame/repos/travel-app/src/assets/audio/forest/`

Добавить:
- 8-14 файлов `forest_bird_*`
- 8-14 файлов `forest_leaf_*`

### Wind
Папка:
- `/Users/godemodegame/repos/travel-app/src/assets/audio/wind/`

Добавить:
- 10-16 файлов `wind_gust_*`
- 6-10 файлов `wind_bed_*`

## Минимальный MVP-набор (для старта)

Если нужно быстро стартовать:
- `rain`: минимум 8 файлов
- `thunder_attack`: минимум 4 файла
- `thunder_tail`: минимум 4 файла
- `wind`: минимум 6 файлов
- `forest`: минимум 6 файлов

Итого: **~28 коротких файлов** уже дадут заметно более живой результат.

## Как использовать в движке (идея)

- Случайно выбирать 1-3 микро-сэмпла в каждом такте.
- Чередовать панораму и громкость в пределах маленького диапазона.
- Для thunder всегда комбинировать `attack + tail`.
- Каждые 20-40 секунд менять «набор активных» файлов, чтобы луп не утомлял.
