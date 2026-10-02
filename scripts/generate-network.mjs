import { mkdir, writeFile } from 'node:fs/promises';

// Original invented layout at Null Island. No imported geography or operational records.
const positions = new Map();
const spans = [];
const point = (id, x, y) => { positions.set(id, [x / 111195.08, y / 111195.08]); return id; };
const distance = (a, b) => {
  const rad = Math.PI / 180;
  const h = Math.sin((b[1] - a[1]) * rad / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((b[0] - a[0]) * rad / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
};
const families = [
  { conductorType: 'Aluminum · light', linearDensityKgPerM: 0.32, modeledTensionN: 6500, displayClass: 'distribution' },
  { conductorType: 'Aluminum · reinforced', linearDensityKgPerM: 0.85, modeledTensionN: 14000, displayClass: 'distribution' },
  { conductorType: 'Bundled · heavy', linearDensityKgPerM: 1.65, modeledTensionN: 29000, displayClass: 'transmission' },
];
function connect(from, to, family) {
  const index = spans.length;
  const coordinates = [positions.get(from), positions.get(to)];
  const p = families[family];
  const spanLengthM = distance(...coordinates);
  const tension = p.modeledTensionN * (0.9 + (index % 5) * 0.065);
  spans.push({ type: 'Feature', id: `DEMO-${String(index + 1).padStart(2, '0')}`, geometry: { type: 'LineString', coordinates }, properties: {
    id: `DEMO-${String(index + 1).padStart(2, '0')}`, fromStructureId: from, toStructureId: to,
    ...p, spanLengthM, modeledTensionN: tension, modeledSagM: p.linearDensityKgPerM * 9.80665 * spanLengthM ** 2 / (8 * tension),
    temperatureC: 20, dampingRatio: 0.035 + (index % 4) * 0.012, source: 'synthetic', lengthSource: 'geometry',
  } });
}
const spine = [[-920, -220], [-760, -100], [-600, -30], [-410, 30], [-190, 80], [30, 180], [260, 220], [480, 150], [690, 210], [880, 360]];
spine.forEach(([x, y], i) => point(`SUPPORT-${i}`, x, y));
for (let i = 0; i < spine.length - 1; i++) connect(`SUPPORT-${i}`, `SUPPORT-${i + 1}`, i % 3);
for (const i of [1, 3, 5, 7, 8]) {
  const [x, y] = spine[i];
  for (const dir of [-1, 1]) {
    let prev = `SUPPORT-${i}`;
    for (let j = 1; j <= 3; j++) {
      const next = point(`BRANCH-${i}-${dir}-${j}`, x + j * (dir === 1 ? 65 : -30), y + dir * j * (90 + i * 6));
      connect(prev, next, (i + j) % 3);
      prev = next;
    }
  }
}
await mkdir('src/data', { recursive: true });
await writeFile('src/data/network.geojson', JSON.stringify({ type: 'FeatureCollection', name: 'Original synthetic demonstration network', features: spans }, null, 2) + '\n');
await writeFile('src/data/structures.geojson', JSON.stringify({ type: 'FeatureCollection', features: Array.from(positions, ([id, coordinates]) => ({ type: 'Feature', id, properties: { id }, geometry: { type: 'Point', coordinates } })) }, null, 2) + '\n');
