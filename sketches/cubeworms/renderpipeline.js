// licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
// https://creativecommons.org/licenses/by-sa/4.0/

import * as THREE from 'three';
import {
  D_LIGHT, SHININESS, BRIGHT_PASS, BLUR_SIZE, BLUR_SIGMA, GLOW_STRENGTH
} from './settings.js';

// --- Shader definitions ---

// Vertex shader shared by all post-processing passes
const postVertexShader = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Bright-pass shader — extracts pixels above luminance threshold
const BrightPassShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightPassThreshold: { value: BRIGHT_PASS }
  },
  vertexShader: postVertexShader,
  fragmentShader: /* glsl */`
uniform sampler2D tDiffuse;
uniform float brightPassThreshold;
varying vec2 vUv;

void main() {
  vec3 luminanceVector = vec3(0.2125, 0.7154, 0.0721);
  vec4 c = texture2D(tDiffuse, vUv);
  float luminance = dot(luminanceVector, c.xyz);
  luminance = max(0.0, luminance - brightPassThreshold);
  c.xyz *= sign(luminance);
  c.a = 1.0;
  gl_FragColor = c;
}`
};

// Separable Gaussian blur shader (horizontal or vertical)
// Adapted from http://callumhay.blogspot.com/2010/09/gaussian-blur-shader-glsl.html
const BlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    texOffset: { value: new THREE.Vector2(1.0 / 1024, 1.0 / 1024) },
    blurSize: { value: BLUR_SIZE },
    horizontalPass: { value: 1 },
    sigma: { value: BLUR_SIGMA }
  },
  vertexShader: postVertexShader,
  fragmentShader: /* glsl */`
uniform sampler2D tDiffuse;
uniform vec2 texOffset;
uniform int blurSize;
uniform int horizontalPass;
uniform float sigma;
varying vec2 vUv;

const float pi = acos(-1.0);

void main() {
  float numBlurPixelsPerSide = float(blurSize / 2);
  vec2 blurMultiplyVec = 0 < horizontalPass ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

  // Incremental Gaussian Coefficient Calculation (GPU Gems 3 pp. 877-889)
  vec3 incrementalGaussian;
  incrementalGaussian.x = 1.0 / (sqrt(2.0 * pi) * sigma);
  incrementalGaussian.y = exp(-0.5 / (sigma * sigma));
  incrementalGaussian.z = incrementalGaussian.y * incrementalGaussian.y;

  vec4 avgValue = vec4(0.0);
  float coefficientSum = 0.0;

  // central sample
  avgValue += texture2D(tDiffuse, vUv) * incrementalGaussian.x;
  coefficientSum += incrementalGaussian.x;
  incrementalGaussian.xy *= incrementalGaussian.yz;

  for (float i = 1.0; i <= numBlurPixelsPerSide; i++) {
    avgValue += texture2D(tDiffuse, vUv - i * texOffset * blurMultiplyVec) * incrementalGaussian.x;
    avgValue += texture2D(tDiffuse, vUv + i * texOffset * blurMultiplyVec) * incrementalGaussian.x;
    coefficientSum += 2.0 * incrementalGaussian.x;
    incrementalGaussian.xy *= incrementalGaussian.yz;
  }

  gl_FragColor = avgValue / coefficientSum;
}`
};

// Compositing shader: BLEND(faces) + SCREEN(vertices) + ADD(blur * glowStrength)
const CompositeShader = {
  uniforms: {
    facesTexture: { value: null },
    verticesTexture: { value: null },
    blurTexture: { value: null },
    glowStrength: { value: GLOW_STRENGTH }
  },
  vertexShader: postVertexShader,
  fragmentShader: /* glsl */`
uniform sampler2D facesTexture;
uniform sampler2D verticesTexture;
uniform sampler2D blurTexture;
uniform int glowStrength;
varying vec2 vUv;

void main() {
  vec4 base = texture2D(facesTexture, vUv);
  vec4 glow = texture2D(verticesTexture, vUv);
  vec4 blur = texture2D(blurTexture, vUv);

  // SCREEN blend: 1 - (1-base) * (1-glow)
  vec3 screened = 1.0 - (1.0 - base.rgb) * (1.0 - glow.rgb);

  // ADD blur N times (equivalent to multiplying)
  vec3 result = screened + blur.rgb * float(glowStrength);

  gl_FragColor = vec4(result, 1.0);
}`
};

// --- RenderPipeline class ---

export class RenderPipeline {
  constructor(renderer, camera) {
    this._renderer = renderer;
    this._camera = camera;

    const w = renderer.domElement.width;
    const h = renderer.domElement.height;

    // --- Scenes ---

    // Faces scene: lit cubes with directional lighting and specularity
    this.facesScene = new THREE.Scene();
    this.facesScene.background = new THREE.Color(0x000000);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(0, 0, 1); // light direction toward camera (Processing: 0,0,-1 but light.position in Three.js is opposite)
    this.facesScene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0x000000);
    this.facesScene.add(ambientLight);

    // Vertices scene: unlit, emissive materials, transparent background
    this.verticesScene = new THREE.Scene();
    // null background = transparent (for SCREEN blending later)

    // --- Rotation groups (one per scene, kept in sync) ---
    this.facesRotationGroup = new THREE.Group();
    this.verticesRotationGroup = new THREE.Group();
    this.facesScene.add(this.facesRotationGroup);
    this.verticesScene.add(this.verticesRotationGroup);

    // --- Render targets ---
    const rtParams = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType
    };

    this._facesRT = new THREE.WebGLRenderTarget(w, h, rtParams);
    this._verticesRT = new THREE.WebGLRenderTarget(w, h, rtParams);
    this._brightPassRT = new THREE.WebGLRenderTarget(w, h, rtParams);
    this._hBlurRT = new THREE.WebGLRenderTarget(w, h, rtParams);
    this._vBlurRT = new THREE.WebGLRenderTarget(w, h, rtParams);

    // --- Post-processing materials ---
    this._brightPassMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(BrightPassShader.uniforms),
      vertexShader: BrightPassShader.vertexShader,
      fragmentShader: BrightPassShader.fragmentShader
    });

    this._hBlurMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(BlurShader.uniforms),
      vertexShader: BlurShader.vertexShader,
      fragmentShader: BlurShader.fragmentShader
    });
    this._hBlurMaterial.uniforms.horizontalPass.value = 1;

    this._vBlurMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(BlurShader.uniforms),
      vertexShader: BlurShader.vertexShader,
      fragmentShader: BlurShader.fragmentShader
    });
    this._vBlurMaterial.uniforms.horizontalPass.value = 0;

    this._compositeMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(CompositeShader.uniforms),
      vertexShader: CompositeShader.vertexShader,
      fragmentShader: CompositeShader.fragmentShader
    });

    // --- Fullscreen quad for post-processing passes ---
    this._fsQuadGeo = new THREE.PlaneGeometry(2, 2);
    this._fsQuadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._fsQuadScene = new THREE.Scene();
    this._fsQuadMesh = new THREE.Mesh(this._fsQuadGeo, this._brightPassMaterial);
    this._fsQuadScene.add(this._fsQuadMesh);

    this._updateTexOffsets(w, h);
  }

  // Update texel offsets for blur shaders
  _updateTexOffsets(w, h) {
    const offset = new THREE.Vector2(1.0 / w, 1.0 / h);
    this._hBlurMaterial.uniforms.texOffset.value.copy(offset);
    this._vBlurMaterial.uniforms.texOffset.value.copy(offset);
  }

  // Sync rotation group transforms (call after updating rotation/position/scale)
  syncRotationGroups(quaternion, position, scale) {
    for (const group of [this.facesRotationGroup, this.verticesRotationGroup]) {
      group.quaternion.copy(quaternion);
      group.position.copy(position);
      group.scale.copy(scale);
    }
  }

  // Resize render targets and update uniforms
  resize(w, h) {
    this._facesRT.setSize(w, h);
    this._verticesRT.setSize(w, h);
    this._brightPassRT.setSize(w, h);
    this._hBlurRT.setSize(w, h);
    this._vBlurRT.setSize(w, h);
    this._updateTexOffsets(w, h);
  }

  // Render the complete pipeline
  render() {
    const renderer = this._renderer;
    const camera = this._camera;

    // 1. Render faces scene to facesRT
    renderer.setRenderTarget(this._facesRT);
    renderer.clear();
    renderer.render(this.facesScene, camera);

    // 2. Render vertices scene to verticesRT
    renderer.setRenderTarget(this._verticesRT);
    renderer.clear();
    renderer.render(this.verticesScene, camera);

    // 3. Bright pass: verticesRT → brightPassRT
    this._fsQuadMesh.material = this._brightPassMaterial;
    this._brightPassMaterial.uniforms.tDiffuse.value = this._verticesRT.texture;
    renderer.setRenderTarget(this._brightPassRT);
    renderer.clear();
    renderer.render(this._fsQuadScene, this._fsQuadCamera);

    // 4. Horizontal blur: brightPassRT → hBlurRT
    this._fsQuadMesh.material = this._hBlurMaterial;
    this._hBlurMaterial.uniforms.tDiffuse.value = this._brightPassRT.texture;
    renderer.setRenderTarget(this._hBlurRT);
    renderer.clear();
    renderer.render(this._fsQuadScene, this._fsQuadCamera);

    // 5. Vertical blur: hBlurRT → vBlurRT
    this._fsQuadMesh.material = this._vBlurMaterial;
    this._vBlurMaterial.uniforms.tDiffuse.value = this._hBlurRT.texture;
    renderer.setRenderTarget(this._vBlurRT);
    renderer.clear();
    renderer.render(this._fsQuadScene, this._fsQuadCamera);

    // 6. Composite: faces + SCREEN(vertices) + ADD(blur * glowStrength) → screen
    this._fsQuadMesh.material = this._compositeMaterial;
    this._compositeMaterial.uniforms.facesTexture.value = this._facesRT.texture;
    this._compositeMaterial.uniforms.verticesTexture.value = this._verticesRT.texture;
    this._compositeMaterial.uniforms.blurTexture.value = this._vBlurRT.texture;
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(this._fsQuadScene, this._fsQuadCamera);
  }

  dispose() {
    this._facesRT.dispose();
    this._verticesRT.dispose();
    this._brightPassRT.dispose();
    this._hBlurRT.dispose();
    this._vBlurRT.dispose();
    this._brightPassMaterial.dispose();
    this._hBlurMaterial.dispose();
    this._vBlurMaterial.dispose();
    this._compositeMaterial.dispose();
    this._fsQuadGeo.dispose();
  }
}
