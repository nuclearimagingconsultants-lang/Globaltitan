import * as THREE from "three";

const loader = new THREE.TextureLoader();

function colorMap(url: string, repeat: number): THREE.Texture {
  const t = loader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 1;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return t;
}

export function loadAsphalt(): { map: THREE.Texture } {
  return { map: colorMap("/textures/asphalt_diff.jpg", 10) };
}

export function loadBrick(): THREE.Texture {
  return colorMap("/textures/brick_diff.jpg", 2);
}
