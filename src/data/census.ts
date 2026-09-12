/** City-proper Census 2023 estimates. Used for HUD + nearby density, never as a mesh count. */

export type CensusRow = {
  pop: number;
  landKm2: number;
};

const CENSUS: Record<string, CensusRow> = {
  "new-york": { pop: 8258000, landKm2: 778.2 },
  boston: { pop: 654000, landKm2: 125.2 },
  philadelphia: { pop: 1550000, landKm2: 347.3 },
  "washington-dc": { pop: 679000, landKm2: 158.4 },
  baltimore: { pop: 565000, landKm2: 209.6 },
  pittsburgh: { pop: 303000, landKm2: 143.5 },
  cleveland: { pop: 362000, landKm2: 201.2 },
  detroit: { pop: 633000, landKm2: 359.4 },
  chicago: { pop: 2666000, landKm2: 589.6 },
  milwaukee: { pop: 563000, landKm2: 249.1 },
  minneapolis: { pop: 425000, landKm2: 139.5 },
  "st-louis": { pop: 282000, landKm2: 160.2 },
  "kansas-city": { pop: 511000, landKm2: 815.0 },
  omaha: { pop: 483000, landKm2: 327.1 },
  denver: { pop: 716000, landKm2: 396.3 },
  "oklahoma-city": { pop: 702000, landKm2: 1570 },
  dallas: { pop: 1300000, landKm2: 882.9 },
  houston: { pop: 2304000, landKm2: 1651 },
  "san-antonio": { pop: 1511000, landKm2: 1194 },
  austin: { pop: 979000, landKm2: 704.7 },
  "new-orleans": { pop: 364000, landKm2: 438.7 },
  memphis: { pop: 610000, landKm2: 763.4 },
  nashville: { pop: 678000, landKm2: 1232 },
  atlanta: { pop: 511000, landKm2: 351.2 },
  charlotte: { pop: 911000, landKm2: 798.3 },
  richmond: { pop: 229000, landKm2: 155.7 },
  raleigh: { pop: 482000, landKm2: 375.8 },
  miami: { pop: 449000, landKm2: 92.7 },
  tampa: { pop: 403000, landKm2: 294.0 },
  orlando: { pop: 321000, landKm2: 265.5 },
  jacksonville: { pop: 986000, landKm2: 1935 },
  birmingham: { pop: 196000, landKm2: 378.3 },
  louisville: { pop: 624000, landKm2: 682.5 },
  indianapolis: { pop: 880000, landKm2: 936.2 },
  columbus: { pop: 913000, landKm2: 569.2 },
  cincinnati: { pop: 311000, landKm2: 201.9 },
  "las-vegas": { pop: 660000, landKm2: 348.1 },
  phoenix: { pop: 1656000, landKm2: 1341 },
  albuquerque: { pop: 561000, landKm2: 484.1 },
  "salt-lake-city": { pop: 209000, landKm2: 285.9 },
  seattle: { pop: 755000, landKm2: 217.0 },
  portland: { pop: 635000, landKm2: 345.0 },
  "san-francisco": { pop: 809000, landKm2: 121.4 },
  oakland: { pop: 433000, landKm2: 144.5 },
  "san-jose": { pop: 969000, landKm2: 459.8 },
  sacramento: { pop: 525000, landKm2: 253.6 },
  "san-diego": { pop: 1387000, landKm2: 842.2 },
  "los-angeles": { pop: 3820000, landKm2: 1213 },
  honolulu: { pop: 343000, landKm2: 156.7 },
  anchorage: { pop: 287000, landKm2: 4415 },
};

const FALLBACK: CensusRow = { pop: 400000, landKm2: 250 };

export function censusOf(cityId: string): CensusRow {
  return CENSUS[cityId] ?? FALLBACK;
}

export function perKm2(cityId: string): number {
  const c = censusOf(cityId);
  return c.pop / Math.max(20, c.landKm2);
}

/** People expected in a circle of radiusM, with a day/night mix. */
export function nearbyPeople(cityId: string, radiusM: number, hour: number): number {
  const night = hour < 6 || hour >= 21 ? 0.32 : hour >= 7 && hour < 9.5 ? 1.18 : hour >= 16.5 && hour < 19 ? 1.22 : 1;
  const areaKm2 = (Math.PI * radiusM * radiusM) / 1e6;
  return Math.max(4, Math.round(perKm2(cityId) * areaKm2 * night));
}

/** Instanced sidewalk bodies. Never the census total. */
export function crowdCap(cityId: string, overloaded: boolean): number {
  const dense = perKm2(cityId);
  const n = dense > 8000 ? 40 : dense > 3000 ? 28 : dense > 1200 ? 20 : 14;
  return overloaded ? Math.min(12, n) : n;
}

export function trafficCount(cityId: string): number {
  const dense = perKm2(cityId);
  return dense > 8000 ? 10 : dense > 3000 ? 8 : dense > 1200 ? 6 : 5;
}

export function formatPop(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)} million`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return String(n);
}
