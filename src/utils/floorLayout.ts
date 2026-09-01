import type {ContentBounds, FloorTable} from '../types/table';

export function computeContentBounds(
  tables: FloorTable[],
  floorWidth: number,
  floorHeight: number,
): ContentBounds {
  if (!tables.length) {
    return {width: floorWidth, height: floorHeight, offsetX: 0, offsetY: 0};
  }

  const pad = 56;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;

  tables.forEach((table) => {
    const cardWidth = (table.width || 80) * 1.2;
    const cardHeight = (table.height || 80) * 1.1;
    const x = (table.x || 0) - cardWidth * 0.1;
    const y = (table.y || 0) - cardHeight * 0.1;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + cardWidth);
    maxY = Math.max(maxY, y + cardHeight);
  });

  const offsetX = Math.max(0, minX - pad);
  const offsetY = Math.max(0, minY - pad);

  return {
    width: Math.max(maxX - offsetX + pad, 320),
    height: Math.max(maxY - offsetY + pad, 240),
    offsetX,
    offsetY,
  };
}

export function computeFitScale(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
): number {
  const pad = 12;
  const availW = Math.max(viewportWidth - pad, 200);
  const availH = Math.max(viewportHeight - pad, 200);
  const next = Math.min(availW / contentWidth, availH / contentHeight);
  return Math.min(Math.max(next, 0.35), 3.2);
}
