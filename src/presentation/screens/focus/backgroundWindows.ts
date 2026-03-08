export type BgWindow = {
  top: number;
  left: `${number}%`;
  width: `${number}%`;
  height: number;
  rotate: string;
  opacity: number;
  zIndex: number;
  barColor: string;
  appName: string;
  status: string;
  lines: [`${number}%`, `${number}%`, `${number}%`];
};

export const createWindowStack = (screenHeight: number): BgWindow[] => {
  const appNames = [
    'Rain Logs', 'Mint Queue', 'Forest FX', 'Storm Lab', 'Wave Cache', 'Loop Tool', 'Audio Bus',
    'NFT Traits', 'Session', 'Thunder RNG', 'Wind Mod', 'Memory', 'Bird Layer', 'Patch Notes',
    'Tones', 'Profile', 'Mint Gas', 'Explorer', 'Deck', 'Cache', 'Ambient', 'Mixer'
  ] as const;
  const statuses = [
    'Syncing...', 'Waiting', 'Idle', 'Analyzing', 'Indexed', 'Ready', '0 drops',
    'Loaded', 'Focus mode', 'Seeded', 'Calm', '66% free', 'Muted', 'v0.1',
    'Queued', 'Connected', '0.00', 'Pinned', 'Warm', 'Preview', 'Armed'
  ] as const;
  const barColors = [
    '#214C9A', '#7A1442', '#2F6D40', '#2D3A9E', '#7B5C0F', '#4A4A4A', '#0F4E79',
    '#6B2B88', '#166446', '#6B1C1C', '#2D2D2D', '#1C5A72', '#734A11', '#273A87',
    '#3F1D78', '#0E5D4C', '#86550F', '#6A2340'
  ] as const;

  let seed = 872341;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const verticalMax = Math.max(520, Math.floor(screenHeight + 180));

  return Array.from({length: 120}).map((_, index) => {
    const width = `${34 + Math.floor(rand() * 18)}%` as const;
    const height = 70 + Math.floor(rand() * 34);
    const top = -40 + Math.floor(rand() * verticalMax);
    const left = `${-18 + Math.floor(rand() * 98)}%` as const;
    const rotate = `${-4 + rand() * 8}deg`;
    const opacity = 0.44 + rand() * 0.22;
    const zIndex = Math.floor(rand() * 10) + 1;
    const line1 = `${48 + Math.floor(rand() * 45)}%` as const;
    const line2 = `${40 + Math.floor(rand() * 42)}%` as const;
    const line3 = `${44 + Math.floor(rand() * 40)}%` as const;

    return {
      top,
      left,
      width,
      height,
      rotate,
      opacity,
      zIndex,
      barColor: barColors[index % barColors.length],
      appName: appNames[index % appNames.length],
      status: statuses[(index * 3) % statuses.length],
      lines: [line1, line2, line3]
    };
  });
};
