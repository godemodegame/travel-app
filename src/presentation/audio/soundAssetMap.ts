import {Image, NativeModules} from 'react-native';

const SOUND_SAMPLE_ASSETS: Record<string, number> = {
  'forest/forest_bird_soft_01.wav': require('../../assets/audio/forest/forest_bird_soft_01.wav'),
  'forest/forest_bird_soft_02.wav': require('../../assets/audio/forest/forest_bird_soft_02.wav'),
  'forest/forest_bird_soft_03.wav': require('../../assets/audio/forest/forest_bird_soft_03.wav'),
  'forest/forest_bird_soft_04.wav': require('../../assets/audio/forest/forest_bird_soft_04.wav'),
  'forest/forest_bird_soft_05.wav': require('../../assets/audio/forest/forest_bird_soft_05.wav'),
  'forest/forest_bird_soft_06.wav': require('../../assets/audio/forest/forest_bird_soft_06.wav'),
  'forest/forest_bird_soft_07.wav': require('../../assets/audio/forest/forest_bird_soft_07.wav'),
  'forest/forest_bird_soft_08.wav': require('../../assets/audio/forest/forest_bird_soft_08.wav'),
  'forest/forest_bird_soft_09.wav': require('../../assets/audio/forest/forest_bird_soft_09.wav'),
  'forest/forest_bird_soft_10.wav': require('../../assets/audio/forest/forest_bird_soft_10.wav'),
  'forest/forest_leaves_brush_01.wav': require('../../assets/audio/forest/forest_leaves_brush_01.wav'),
  'forest/forest_leaves_brush_02.wav': require('../../assets/audio/forest/forest_leaves_brush_02.wav'),
  'forest/forest_leaves_brush_03.wav': require('../../assets/audio/forest/forest_leaves_brush_03.wav'),
  'forest/forest_leaves_brush_04.wav': require('../../assets/audio/forest/forest_leaves_brush_04.wav'),
  'forest/forest_leaves_brush_05.wav': require('../../assets/audio/forest/forest_leaves_brush_05.wav'),
  'forest/forest_leaves_brush_06.wav': require('../../assets/audio/forest/forest_leaves_brush_06.wav'),
  'forest/forest_leaves_brush_07.wav': require('../../assets/audio/forest/forest_leaves_brush_07.wav'),
  'forest/forest_leaves_brush_08.wav': require('../../assets/audio/forest/forest_leaves_brush_08.wav'),
  'forest/forest_leaves_brush_09.wav': require('../../assets/audio/forest/forest_leaves_brush_09.wav'),
  'forest/forest_leaves_brush_10.wav': require('../../assets/audio/forest/forest_leaves_brush_10.wav'),
  'forest/forest_leaves_brush_11.wav': require('../../assets/audio/forest/forest_leaves_brush_11.wav'),
  'forest/forest_leaves_brush_12.wav': require('../../assets/audio/forest/forest_leaves_brush_12.wav'),
  'rain/rain_drizzle_dense_loop_01.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_01.wav'),
  'rain/rain_drizzle_dense_loop_02.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_02.wav'),
  'rain/rain_drizzle_dense_loop_03.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_03.wav'),
  'rain/rain_drizzle_dense_loop_04.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_04.wav'),
  'rain/rain_drizzle_dense_loop_05.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_05.wav'),
  'rain/rain_drizzle_dense_loop_06.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_06.wav'),
  'rain/rain_drizzle_dense_loop_07.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_07.wav'),
  'rain/rain_drizzle_dense_loop_08.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_08.wav'),
  'rain/rain_drizzle_dense_loop_09.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_09.wav'),
  'rain/rain_drizzle_dense_loop_10.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_10.wav'),
  'rain/rain_drizzle_dense_loop_11.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_11.wav'),
  'rain/rain_drizzle_dense_loop_12.wav': require('../../assets/audio/rain/rain_drizzle_dense_loop_12.wav'),
  'rain/rain_drizzle_soft_loop_01.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_01.wav'),
  'rain/rain_drizzle_soft_loop_02.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_02.wav'),
  'rain/rain_drizzle_soft_loop_03.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_03.wav'),
  'rain/rain_drizzle_soft_loop_04.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_04.wav'),
  'rain/rain_drizzle_soft_loop_05.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_05.wav'),
  'rain/rain_drizzle_soft_loop_06.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_06.wav'),
  'rain/rain_drizzle_soft_loop_07.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_07.wav'),
  'rain/rain_drizzle_soft_loop_08.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_08.wav'),
  'rain/rain_drizzle_soft_loop_09.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_09.wav'),
  'rain/rain_drizzle_soft_loop_10.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_10.wav'),
  'rain/rain_drizzle_soft_loop_11.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_11.wav'),
  'rain/rain_drizzle_soft_loop_12.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_12.wav'),
  'rain/rain_drizzle_soft_loop_13.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_13.wav'),
  'rain/rain_drizzle_soft_loop_14.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_14.wav'),
  'rain/rain_drizzle_soft_loop_15.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_15.wav'),
  'rain/rain_drizzle_soft_loop_16.wav': require('../../assets/audio/rain/rain_drizzle_soft_loop_16.wav'),
  'rain/rain_steady_dense_loop_01.wav': require('../../assets/audio/rain/rain_steady_dense_loop_01.wav'),
  'rain/rain_steady_dense_loop_02.wav': require('../../assets/audio/rain/rain_steady_dense_loop_02.wav'),
  'rain/rain_steady_dense_loop_03.wav': require('../../assets/audio/rain/rain_steady_dense_loop_03.wav'),
  'rain/rain_steady_dense_loop_04.wav': require('../../assets/audio/rain/rain_steady_dense_loop_04.wav'),
  'rain/rain_steady_dense_loop_05.wav': require('../../assets/audio/rain/rain_steady_dense_loop_05.wav'),
  'rain/rain_steady_dense_loop_06.wav': require('../../assets/audio/rain/rain_steady_dense_loop_06.wav'),
  'rain/rain_steady_dense_loop_07.wav': require('../../assets/audio/rain/rain_steady_dense_loop_07.wav'),
  'rain/rain_steady_dense_loop_08.wav': require('../../assets/audio/rain/rain_steady_dense_loop_08.wav'),
  'rain/rain_steady_dense_loop_09.wav': require('../../assets/audio/rain/rain_steady_dense_loop_09.wav'),
  'rain/rain_steady_dense_loop_10.wav': require('../../assets/audio/rain/rain_steady_dense_loop_10.wav'),
  'rain/rain_steady_dense_loop_11.wav': require('../../assets/audio/rain/rain_steady_dense_loop_11.wav'),
  'rain/rain_steady_dense_loop_12.wav': require('../../assets/audio/rain/rain_steady_dense_loop_12.wav'),
  'rain/rain_steady_dense_loop_13.wav': require('../../assets/audio/rain/rain_steady_dense_loop_13.wav'),
  'rain/rain_steady_soft_loop_01.wav': require('../../assets/audio/rain/rain_steady_soft_loop_01.wav'),
  'rain/rain_steady_soft_loop_02.wav': require('../../assets/audio/rain/rain_steady_soft_loop_02.wav'),
  'rain/rain_steady_soft_loop_03.wav': require('../../assets/audio/rain/rain_steady_soft_loop_03.wav'),
  'rain/rain_steady_soft_loop_04.wav': require('../../assets/audio/rain/rain_steady_soft_loop_04.wav'),
  'rain/rain_steady_soft_loop_05.wav': require('../../assets/audio/rain/rain_steady_soft_loop_05.wav'),
  'rain/rain_steady_soft_loop_06.wav': require('../../assets/audio/rain/rain_steady_soft_loop_06.wav'),
  'rain/rain_steady_soft_loop_07.wav': require('../../assets/audio/rain/rain_steady_soft_loop_07.wav'),
  'rain/rain_steady_soft_loop_08.wav': require('../../assets/audio/rain/rain_steady_soft_loop_08.wav'),
  'rain/rain_steady_soft_loop_09.wav': require('../../assets/audio/rain/rain_steady_soft_loop_09.wav'),
  'rain/rain_steady_soft_loop_10.wav': require('../../assets/audio/rain/rain_steady_soft_loop_10.wav'),
  'rain/rain_steady_soft_loop_11.wav': require('../../assets/audio/rain/rain_steady_soft_loop_11.wav'),
  'rain/rain_steady_soft_loop_12.wav': require('../../assets/audio/rain/rain_steady_soft_loop_12.wav'),
  'rain/rain_steady_soft_loop_13.wav': require('../../assets/audio/rain/rain_steady_soft_loop_13.wav'),
  'rain/rain_steady_soft_loop_14.wav': require('../../assets/audio/rain/rain_steady_soft_loop_14.wav'),
  'rain/rain_steady_soft_loop_15.wav': require('../../assets/audio/rain/rain_steady_soft_loop_15.wav'),
  'rain/rain_steady_soft_loop_16.wav': require('../../assets/audio/rain/rain_steady_soft_loop_16.wav'),
  'rain/rain_storm_dense_loop_01.wav': require('../../assets/audio/rain/rain_storm_dense_loop_01.wav'),
  'rain/rain_storm_dense_loop_02.wav': require('../../assets/audio/rain/rain_storm_dense_loop_02.wav'),
  'rain/rain_storm_dense_loop_03.wav': require('../../assets/audio/rain/rain_storm_dense_loop_03.wav'),
  'rain/rain_storm_dense_loop_04.wav': require('../../assets/audio/rain/rain_storm_dense_loop_04.wav'),
  'rain/rain_storm_dense_loop_05.wav': require('../../assets/audio/rain/rain_storm_dense_loop_05.wav'),
  'rain/rain_storm_dense_loop_06.wav': require('../../assets/audio/rain/rain_storm_dense_loop_06.wav'),
  'rain/rain_storm_dense_loop_07.wav': require('../../assets/audio/rain/rain_storm_dense_loop_07.wav'),
  'rain/rain_storm_dense_loop_08.wav': require('../../assets/audio/rain/rain_storm_dense_loop_08.wav'),
  'rain/rain_storm_dense_loop_09.wav': require('../../assets/audio/rain/rain_storm_dense_loop_09.wav'),
  'rain/rain_storm_dense_loop_10.wav': require('../../assets/audio/rain/rain_storm_dense_loop_10.wav'),
  'rain/rain_storm_dense_loop_11.wav': require('../../assets/audio/rain/rain_storm_dense_loop_11.wav'),
  'rain/rain_storm_dense_loop_12.wav': require('../../assets/audio/rain/rain_storm_dense_loop_12.wav'),
  'rain/rain_storm_soft_loop_01.wav': require('../../assets/audio/rain/rain_storm_soft_loop_01.wav'),
  'rain/rain_storm_soft_loop_02.wav': require('../../assets/audio/rain/rain_storm_soft_loop_02.wav'),
  'rain/rain_storm_soft_loop_03.wav': require('../../assets/audio/rain/rain_storm_soft_loop_03.wav'),
  'rain/rain_storm_soft_loop_04.wav': require('../../assets/audio/rain/rain_storm_soft_loop_04.wav'),
  'rain/rain_storm_soft_loop_05.wav': require('../../assets/audio/rain/rain_storm_soft_loop_05.wav'),
  'rain/rain_storm_soft_loop_06.wav': require('../../assets/audio/rain/rain_storm_soft_loop_06.wav'),
  'rain/rain_storm_soft_loop_07.wav': require('../../assets/audio/rain/rain_storm_soft_loop_07.wav'),
  'rain/rain_storm_soft_loop_08.wav': require('../../assets/audio/rain/rain_storm_soft_loop_08.wav'),
  'rain/rain_storm_soft_loop_09.wav': require('../../assets/audio/rain/rain_storm_soft_loop_09.wav'),
  'rain/rain_storm_soft_loop_10.wav': require('../../assets/audio/rain/rain_storm_soft_loop_10.wav'),
  'rain/rain_storm_soft_loop_11.wav': require('../../assets/audio/rain/rain_storm_soft_loop_11.wav'),
  'rain/rain_storm_soft_loop_12.wav': require('../../assets/audio/rain/rain_storm_soft_loop_12.wav'),
  'rain/rain_storm_soft_loop_13.wav': require('../../assets/audio/rain/rain_storm_soft_loop_13.wav'),
  'rain/rain_storm_soft_loop_14.wav': require('../../assets/audio/rain/rain_storm_soft_loop_14.wav'),
  'rain/rain_storm_soft_loop_15.wav': require('../../assets/audio/rain/rain_storm_soft_loop_15.wav'),
  'rain/rain_storm_soft_loop_16.wav': require('../../assets/audio/rain/rain_storm_soft_loop_16.wav'),
  'thunder/thunder_crack_close_01.wav': require('../../assets/audio/thunder/thunder_crack_close_01.wav'),
  'thunder/thunder_crack_close_02.wav': require('../../assets/audio/thunder/thunder_crack_close_02.wav'),
  'thunder/thunder_crack_close_03.wav': require('../../assets/audio/thunder/thunder_crack_close_03.wav'),
  'thunder/thunder_crack_close_04.wav': require('../../assets/audio/thunder/thunder_crack_close_04.wav'),
  'thunder/thunder_crack_close_05.wav': require('../../assets/audio/thunder/thunder_crack_close_05.wav'),
  'thunder/thunder_crack_close_06.wav': require('../../assets/audio/thunder/thunder_crack_close_06.wav'),
  'thunder/thunder_crack_close_07.wav': require('../../assets/audio/thunder/thunder_crack_close_07.wav'),
  'thunder/thunder_crack_close_08.wav': require('../../assets/audio/thunder/thunder_crack_close_08.wav'),
  'thunder/thunder_crack_close_09.wav': require('../../assets/audio/thunder/thunder_crack_close_09.wav'),
  'thunder/thunder_crack_close_10.wav': require('../../assets/audio/thunder/thunder_crack_close_10.wav'),
  'thunder/thunder_crack_close_11.wav': require('../../assets/audio/thunder/thunder_crack_close_11.wav'),
  'thunder/thunder_crack_close_12.wav': require('../../assets/audio/thunder/thunder_crack_close_12.wav'),
  'thunder/thunder_crack_close_13.wav': require('../../assets/audio/thunder/thunder_crack_close_13.wav'),
  'thunder/thunder_crack_close_14.wav': require('../../assets/audio/thunder/thunder_crack_close_14.wav'),
  'thunder/thunder_crack_close_15.wav': require('../../assets/audio/thunder/thunder_crack_close_15.wav'),
  'thunder/thunder_roll_far_01.wav': require('../../assets/audio/thunder/thunder_roll_far_01.wav'),
  'thunder/thunder_roll_far_02.wav': require('../../assets/audio/thunder/thunder_roll_far_02.wav'),
  'thunder/thunder_roll_far_03.wav': require('../../assets/audio/thunder/thunder_roll_far_03.wav'),
  'thunder/thunder_roll_far_04.wav': require('../../assets/audio/thunder/thunder_roll_far_04.wav'),
  'thunder/thunder_roll_far_05.wav': require('../../assets/audio/thunder/thunder_roll_far_05.wav'),
  'thunder/thunder_roll_far_06.wav': require('../../assets/audio/thunder/thunder_roll_far_06.wav'),
  'thunder/thunder_roll_far_07.wav': require('../../assets/audio/thunder/thunder_roll_far_07.wav'),
  'thunder/thunder_roll_far_08.wav': require('../../assets/audio/thunder/thunder_roll_far_08.wav'),
  'thunder/thunder_roll_far_09.wav': require('../../assets/audio/thunder/thunder_roll_far_09.wav'),
  'thunder/thunder_roll_far_10.wav': require('../../assets/audio/thunder/thunder_roll_far_10.wav'),
  'thunder/thunder_roll_far_11.wav': require('../../assets/audio/thunder/thunder_roll_far_11.wav'),
  'wind/wind_dark_gust_01.wav': require('../../assets/audio/wind/wind_dark_gust_01.wav'),
  'wind/wind_dark_gust_02.wav': require('../../assets/audio/wind/wind_dark_gust_02.wav'),
  'wind/wind_dark_gust_03.wav': require('../../assets/audio/wind/wind_dark_gust_03.wav'),
  'wind/wind_dark_gust_04.wav': require('../../assets/audio/wind/wind_dark_gust_04.wav'),
  'wind/wind_dark_gust_05.wav': require('../../assets/audio/wind/wind_dark_gust_05.wav'),
  'wind/wind_dark_gust_06.wav': require('../../assets/audio/wind/wind_dark_gust_06.wav'),
  'wind/wind_dark_gust_07.wav': require('../../assets/audio/wind/wind_dark_gust_07.wav'),
  'wind/wind_dark_gust_08.wav': require('../../assets/audio/wind/wind_dark_gust_08.wav'),
  'wind/wind_dark_gust_09.wav': require('../../assets/audio/wind/wind_dark_gust_09.wav'),
  'wind/wind_dark_gust_10.wav': require('../../assets/audio/wind/wind_dark_gust_10.wav'),
  'wind/wind_dark_gust_11.wav': require('../../assets/audio/wind/wind_dark_gust_11.wav'),
  'wind/wind_dark_gust_12.wav': require('../../assets/audio/wind/wind_dark_gust_12.wav'),
  'wind/wind_dark_gust_13.wav': require('../../assets/audio/wind/wind_dark_gust_13.wav'),
  'wind/wind_dark_gust_14.wav': require('../../assets/audio/wind/wind_dark_gust_14.wav'),
  'wind/wind_dark_gust_15.wav': require('../../assets/audio/wind/wind_dark_gust_15.wav'),
  'wind/wind_dark_gust_16.wav': require('../../assets/audio/wind/wind_dark_gust_16.wav'),
  'wind/wind_soft_gust_01.wav': require('../../assets/audio/wind/wind_soft_gust_01.wav'),
  'wind/wind_soft_gust_02.wav': require('../../assets/audio/wind/wind_soft_gust_02.wav'),
  'wind/wind_soft_gust_03.wav': require('../../assets/audio/wind/wind_soft_gust_03.wav'),
  'wind/wind_soft_gust_04.wav': require('../../assets/audio/wind/wind_soft_gust_04.wav'),
  'wind/wind_soft_gust_05.wav': require('../../assets/audio/wind/wind_soft_gust_05.wav'),
  'wind/wind_soft_gust_06.wav': require('../../assets/audio/wind/wind_soft_gust_06.wav'),
  'wind/wind_soft_gust_07.wav': require('../../assets/audio/wind/wind_soft_gust_07.wav'),
  'wind/wind_soft_gust_08.wav': require('../../assets/audio/wind/wind_soft_gust_08.wav'),
  'wind/wind_soft_gust_09.wav': require('../../assets/audio/wind/wind_soft_gust_09.wav'),
  'wind/wind_soft_gust_10.wav': require('../../assets/audio/wind/wind_soft_gust_10.wav'),
  'wind/wind_soft_gust_11.wav': require('../../assets/audio/wind/wind_soft_gust_11.wav'),
  'wind/wind_soft_gust_12.wav': require('../../assets/audio/wind/wind_soft_gust_12.wav'),
  'wind/wind_soft_gust_13.wav': require('../../assets/audio/wind/wind_soft_gust_13.wav'),
};

export const resolveSampleAssetUri = (samplePath: string): string | null => {
  const assetRef = SOUND_SAMPLE_ASSETS[samplePath];
  if (!assetRef) {
    return null;
  }

  const resolved = Image.resolveAssetSource(assetRef);
  const uri = resolved?.uri ?? null;
  if (!uri) {
    return null;
  }

  const scriptUrl = NativeModules?.SourceCode?.scriptURL as string | undefined;
  const devServerOrigin = (() => {
    if (!scriptUrl || !scriptUrl.startsWith('http')) {
      return null;
    }
    try {
      return new URL(scriptUrl).origin;
    } catch {
      return null;
    }
  })();

  if (devServerOrigin) {
    return uri.replace(/^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2):8081/, devServerOrigin);
  }

  return uri;
};

export const resolveSampleAssetUriCandidates = (samplePath: string): string[] => {
  const primary = resolveSampleAssetUri(samplePath);
  if (!primary) {
    return [];
  }

  const match = primary.match(/^http:\/\/[^/]+(:\d+)?(\/.*)$/);
  const pathAndQuery = match?.[2];
  if (!pathAndQuery) {
    return [primary];
  }

  const variants = [
    primary,
    `http://10.0.2.2:8081${pathAndQuery}`,
    `http://127.0.0.1:8081${pathAndQuery}`,
    `http://localhost:8081${pathAndQuery}`
  ];

  return Array.from(new Set(variants));
};

export const hasMappedSample = (samplePath: string): boolean => {
  return Boolean(SOUND_SAMPLE_ASSETS[samplePath]);
};

export const getSampleAsset = (samplePath: string): number | null => {
  return SOUND_SAMPLE_ASSETS[samplePath] ?? null;
};
