/** Ces: always use heavy CityWorld mesh so DROP IN has buildings (not Maps black/yellow void). */
export function cityMeshEnabled(_settingsFlag?: boolean): boolean {
  return true;
}