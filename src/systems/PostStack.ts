import * as THREE from "three";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { QualityState } from "./Quality";

const GRADE = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    lift: { value: new THREE.Color(0x1c140c) },
    gain: { value: new THREE.Color(0xfff0d4) },
    sat: { value: 1.1 },
    crush: { value: 0.04 },
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
    uniform float sat;
    uniform float crush;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = max(vec3(0.0), (c.rgb - crush) / (1.0 - crush));
      col = mix(lift, gain, col);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, sat);
      float vig = smoothstep(1.28, 0.42, length(vUv - 0.5));
      col *= mix(0.88, 1.0, vig);
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
    this.ssao.kernelRadius = 8;
    this.ssao.minDistance = 0.005;
    this.ssao.maxDistance = 0.12;
    this.ssao.enabled = false;
    this.composer.addPass(this.ssao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.32, 0.42, 0.72);
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

  apply(q: QualityState, hulkBlur: boolean, cutPost = false): void {
    this.bloom.enabled = q.bloom && !cutPost;
    this.bloom.strength = q.id === "cinematic" ? 0.42 : 0.28;
    this.ssao.enabled = q.ssao && !cutPost;
    this.grade.enabled = q.grade && !cutPost;
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
