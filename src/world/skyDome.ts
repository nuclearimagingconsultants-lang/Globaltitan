import * as THREE from "three";
import type { CityTheme } from "./themes";

/** Inverted-sphere gradient sky + sun disc. Stays inside the camera far clip. */
export class SkyDome {
  readonly mesh: THREE.Mesh;
  private readonly mat: THREE.ShaderMaterial;
  private radius = 420;

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color(0x6aa0d4) },
        horizon: { value: new THREE.Color(0xc8daf0) },
        ground: { value: new THREE.Color(0x5a6058) },
        sunColor: { value: new THREE.Color(0xfff2dc) },
        sunDir: { value: new THREE.Vector3(0.38, 0.88, 0.22).normalize() },
        night: { value: 0 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 top;
        uniform vec3 horizon;
        uniform vec3 ground;
        uniform vec3 sunColor;
        uniform vec3 sunDir;
        uniform float night;
        void main() {
          vec3 dir = normalize(vDir);
          float h = dir.y;
          vec3 col = mix(horizon, top, smoothstep(-0.02, 0.62, h));
          col = mix(ground, col, smoothstep(-0.28, 0.04, h));
          vec3 sd = normalize(sunDir);
          float glow = pow(max(0.0, dot(dir, sd)), 24.0);
          col += sunColor * glow * mix(0.62, 0.14, night);
          float disc = smoothstep(0.9975, 0.9996, dot(dir, sd));
          col += sunColor * disc * mix(2.2, 0.35, night);
          float skyNight = night * smoothstep(0.05, 0.55, h);
          col = mix(col, col * vec3(0.12, 0.16, 0.28) + vec3(0.02, 0.04, 0.08), skyNight);
          float twinkle = fract(sin(dot(dir.xy, vec2(12.9898, 78.233))) * 43758.5453);
          col += vec3(0.55, 0.62, 0.8) * skyNight * step(0.992, twinkle) * 0.55;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: true,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -2000;
    this.mesh.name = "sky-dome";
    this.mesh.scale.setScalar(this.radius);
  }

  setRadius(farClip: number): void {
    const r = Math.max(180, farClip * 0.86);
    if (Math.abs(r - this.radius) < 4) return;
    this.radius = r;
    this.mesh.scale.setScalar(r);
  }

  follow(x: number, z: number): void {
    this.mesh.position.set(x, 0, z);
  }

  apply(theme: CityTheme, night: number, sunDir: THREE.Vector3): void {
    this.mat.uniforms.top.value.setHex(theme.sky).lerp(new THREE.Color(0x0a1220), night * 0.85);
    this.mat.uniforms.horizon.value.setHex(theme.fog).lerp(new THREE.Color(0x1a2438), night * 0.7);
    this.mat.uniforms.ground.value.setHex(theme.hemiGround);
    this.mat.uniforms.sunColor.value.setHex(theme.sunColor);
    this.mat.uniforms.sunDir.value.copy(sunDir).normalize();
    this.mat.uniforms.night.value = night;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
