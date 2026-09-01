import {getMockFloorData} from '../mocks/floorMockData';
import type {FloorData} from '../types/table';

/**
 * Floor data service.
 * Currently returns mock data; swap implementation to use api.ts when backend is wired.
 */
export async function fetchFloorData(floorId?: string): Promise<FloorData> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });

  return getMockFloorData(floorId);
}
