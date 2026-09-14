import * as THREE from "three";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { LOOK_BUDGET } from "../world/lookBudget";
import type { QualityState } from "./Quality";

const GRADE = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    lift: { value: new THREE.Color(0x1a140e) },
    gain: { value: new THREE.Color(0xfff2dc) },
    haze: { value: new THREE.Color(0xc8daf0) },
    sat: { value: 1.14 },
    crush: { value: 0.035 },
    hazeAmt: { value: 0.12 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 lift;
    uniform vec3 gain;
    uniform vec3 haze;
    uniform float sat;
    uniform float crush;
    uniform float hazeAmt;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = max(vec3(0.0), (c.rgb - crush) / (1.0 - crush));
      col = mix(lift, gain, col);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, sat);
      float depthFeel = smoothstep(0.15, 0.92, length(vUv - 0.5));
      col = mix(col, mix(col, haze, 0.35), hazeAmt * depthFeel);
      float vig = smoothstep(1.32, 0.38, length(vUv - 0.5));
      col *= mix(0.9, 1.0, vig);
      gl_FragColor = vec4(col, c.a);
    }
  `,
};

export class PostStack {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private ssao: SSAOPass;
  private grade: ShaderPass;
  private after: AfterimagePass;
  private output: OutputPass;
  private w = 4;
  private h = 4;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ssao = new SSAOPass(scene, camera, 4, 4);
    this.ssao.kernelRadius = LOOK_BUDGET.ssaoKernel;
    this.ssao.minDistance = 0.004;
    this.ssao.maxDistance = 0.1;
    this.ssao.enabled = false;
    this.composer.addPass(this.ssao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), LOOK_BUDGET.bloomMedium, 0.38, 0.68);
    this.bloom.enabled = false;
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GRADE);
    this.grade.enabled = false;
    this.composer.addPass(this.grade);
    this.after = new AfterimagePass(0.78);
    this.after.enabled = false;
    this.composer.addPass(this.after);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
  }

  apply(q: QualityState, hulkBlur: boolean, cutPost = false, night = 0): void {
    this.bloom.enabled = q.bloom && !cutPost;
    this.bloom.strength =
      q.id === "cinematic" ? LOOK_BUDGET.bloomCinematic : q.id === "high" ? LOOK_BUDGET.bloomHigh : LOOK_BUDGET.bloomMedium;
    this.bloom.threshold = q.id === "medium" ? 0.78 : 0.7;
    this.ssao.enabled = q.ssao && !cutPost;
    this.grade.enabled = q.grade && !cutPost;
    const haze = this.grade.uniforms.hazeAmt;
    if (haze) haze.value = night > 0.45 ? 0.18 : 0.11;
    this.after.enabled = q.motionBlur && hulkBlur && !cutPost;
    this.after.uniforms.damp.value = hulkBlur ? 0.68 : 0.9;
  }

  setSize(w: number, h: number, scale: number): void {
    const rw = Math.max(4, Math.floor(w * scale));
    const rh = Math.max(4, Math.floor(h * scale));
    if (rw === this.w && rh === this.h) return;
    this.w = rw;
    this.h = rh;
    this.composer.setSize(rw, rh);
    this.ssao.setSize(rw, rh);
    this.bloom.setSize(rw, rh);
  }

  render(): void {
    this.composer.render();
  }
}
