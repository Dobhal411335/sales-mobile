import type {ContentBounds, FloorTable} from '../types/table';

/**
 * Matches Web sales floor (`page.js`): crop to the table cluster, but keep a
 * real floor footprint so a single table is not blown up to fill the screen.
 */
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
    minX = Math.min(minX, Number(table.x) || 0);
    minY = Math.min(minY, Number(table.y) || 0);
    maxX = Math.max(maxX, (Number(table.x) || 0) + (Number(table.width) || 80));
    maxY = Math.max(
      maxY,
      (Number(table.y) || 0) + (Number(table.height) || 80),
    );
  });

  const clusterW = maxX - minX + pad * 2;
  const clusterH = maxY - minY + pad * 2;

  const minW = Math.min(floorWidth, Math.max(640, floorWidth * 0.45));
  const minH = Math.min(floorHeight, Math.max(480, floorHeight * 0.45));
  const width = Math.min(floorWidth, Math.max(clusterW, minW));
  const height = Math.min(floorHeight, Math.max(clusterH, minH));

  const extraX = Math.max(0, width - clusterW);
  const extraY = Math.max(0, height - clusterH);
  const offsetX = Math.max(
    0,
    Math.min(minX - pad - extraX / 2, floorWidth - width),
  );
  const offsetY = Math.max(
    0,
    Math.min(minY - pad - extraY / 2, floorHeight - height),
  );

  return {width, height, offsetX, offsetY};
}

/**
 * Matches Web sales floor: fit to viewport, shrink only — never enlarge past
 * admin design size (max scale 1).
 */
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
  return Math.min(Math.max(next, 0.35), 1);
}
