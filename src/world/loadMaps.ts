import { makeAsphalt, makeBrick } from "./textures";

export function loadAsphalt(): { map: import("three").Texture } {
  return makeAsphalt();
}

export function loadBrick(): import("three").Texture {
  return makeBrick().map;
}
