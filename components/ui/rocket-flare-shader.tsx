"use client";

import React, { useEffect, useRef } from "react";

/* ==========================================================================
   YEARBOUND ROCKET FLARE WEBGL ENGINE (Pure Plasma Edition)
   - Uses pure-flare-no-hull.jpg (100% pure plasma flame rays, ZERO hull)
   - Normal rectangular edge cutting (zero weird pinching or edge warping)
   - Bottom-anchored soft flare fanning upward
   - 60 FPS GPU WebGL with Simplex plasma turbulence
   - Fully controllable opacity / intensity
   ========================================================================== */

export type FlareState = "magma" | "violation" | "celebration" | "void";

export interface RocketFlareProps {
  intensity?: number;      // 0.2 to 2.5
  speed?: number;          // 0.2 to 3.0
  spread?: number;         // 0.5 to 1.8
  coreHeat?: number;       // 0.5 to 2.5
  turbulence?: number;     // 0.0 to 2.0
  state?: FlareState;      // "magma" | "violation" | "celebration" | "void"
  mouseParallax?: boolean; // Default true
  className?: string;
  style?: React.CSSProperties;
}

const VERTEX_SHADER_SOURCE = `
attribute vec2 position;
varying vec2 v_uv;

void main() {
  v_uv = (position + 1.0) * 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_speed;
uniform float u_spread;
uniform float u_core_heat;
uniform float u_turbulence;
uniform float u_state;      // 0: Magma, 1: Violation, 2: Celebration, 3: Void
uniform vec2 u_mouse;
uniform sampler2D u_texture;
uniform float u_has_texture;

// 2D Simplex Noise for organic plasma turbulence
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Color remap based on flare state
vec3 applyStatePalette(vec3 baseColor, float state) {
  if (state > 2.5) {
    // 3.0: COSMIC VOID (Soft atmospheric amber-gold flare)
    float luma = dot(baseColor, vec3(0.299, 0.587, 0.114));
    vec3 voidDeep = vec3(0.0, 0.0, 0.0);
    vec3 voidMid  = vec3(0.92, 0.42, 0.07); // Warm cosmic amber
    vec3 voidCore = vec3(1.0, 0.88, 0.65); // Warm champagne gold
    vec3 result = mix(voidDeep, voidMid, smoothstep(0.03, 0.35, luma));
    result = mix(result, voidCore, smoothstep(0.35, 0.82, luma));
    return result;
  } else if (state > 1.5) {
    // 2.0: CHRISTMAS GOLD / CELEBRATION
    float luma = dot(baseColor, vec3(0.299, 0.587, 0.114));
    vec3 goldCore = vec3(1.0, 0.94, 0.75);
    vec3 goldMid  = vec3(1.0, 0.72, 0.22);
    vec3 goldDeep = vec3(0.35, 0.16, 0.02);
    vec3 goldResult = mix(goldDeep, goldMid, smoothstep(0.12, 0.55, luma));
    goldResult = mix(goldResult, goldCore, smoothstep(0.55, 0.95, luma));
    return mix(baseColor, goldResult, 0.85);
  } else if (state > 0.5) {
    // 1.0: PENALTY SURGE / VIOLATION
    float luma = dot(baseColor, vec3(0.299, 0.587, 0.114));
    vec3 crimsonCore = vec3(1.0, 0.88, 0.70);
    vec3 crimsonMid  = vec3(0.95, 0.15, 0.02);
    vec3 crimsonDeep = vec3(0.30, 0.02, 0.01);
    vec3 crimsonResult = mix(crimsonDeep, crimsonMid, smoothstep(0.12, 0.55, luma));
    crimsonResult = mix(crimsonResult, crimsonCore, smoothstep(0.55, 0.92, luma));
    return mix(baseColor, crimsonResult, 0.85);
  }
  // 0.0: MAGMA FLAME
  return baseColor;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;

  // Time with speed multiplier
  float t = u_time * u_speed;

  // Subtle interactive camera tilt
  vec2 mouseTilt = u_mouse * vec2(0.02, 0.01);
  vec2 coord = uv + mouseTilt;

  // Standard clean UV mapping: Cut normal at edges, no aspect-ratio warping
  vec2 texCoord = coord;

  // 1. UPWARD TURBULENT PLASMA DISPLACEMENT
  float upwardFlow1 = snoise(vec2(texCoord.x * 6.0, texCoord.y * 3.5 - t * 1.6));
  float upwardFlow2 = snoise(vec2(texCoord.x * 12.0, texCoord.y * 7.0 - t * 2.5));
  vec2 flowOffset = vec2(
    (upwardFlow1 * 0.008 + upwardFlow2 * 0.004) * u_turbulence,
    -(upwardFlow1 * 0.012 + upwardFlow2 * 0.006) * u_turbulence
  );

  vec2 displacedUv = texCoord + flowOffset;

  vec3 sceneColor = vec3(0.0, 0.0, 0.0);

  if (u_has_texture > 0.5 && displacedUv.x >= 0.0 && displacedUv.x <= 1.0 && displacedUv.y >= 0.0 && displacedUv.y <= 1.0) {
    // Sample pure plasma texture (zero hull)
    vec4 texSample = texture2D(u_texture, displacedUv);
    vec3 sampledColor = texSample.rgb;

    // 2. COLLIMATED RAY SHAFTS (radiating upwards from bottom center)
    vec2 rayOrigin = vec2(0.5, 0.0);
    vec2 rayVec = displacedUv - rayOrigin;
    rayVec.x *= u_spread;
    float rayDist = length(rayVec);
    float rayAngle = atan(rayVec.x, max(rayVec.y, 0.001));

    float shaft1 = cos(rayAngle * 10.0);
    float shaft2 = cos(rayAngle * 18.0 + 0.3);
    float shaftComb = pow(max(shaft1 * 0.6 + shaft2 * 0.4, 0.0), 2.8);

    float rayBreathing = 0.88 + 0.22 * sin(t * 1.3 + rayAngle * 3.0);
    float rayIntensity = shaftComb * rayBreathing * smoothstep(0.02, 0.35, rayDist) * smoothstep(1.2, 0.3, rayDist);

    vec3 rayColor = vec3(1.0, 0.58, 0.16) * rayIntensity * 0.35 * u_intensity;
    sampledColor += rayColor;

    // 3. SOFT BOTTOM IGNITION CORE
    float coreDist = length((displacedUv - rayOrigin) * vec2(1.5, 3.8));
    float coreMicroFlicker = 1.0 + 0.06 * sin(t * 12.0) * snoise(vec2(t * 6.0, 0.0));
    float coreGlow = exp(-coreDist * 6.5) * u_core_heat * coreMicroFlicker * u_intensity;
    vec3 whiteHot = vec3(1.0, 0.95, 0.85);
    sampledColor = mix(sampledColor, whiteHot, clamp(coreGlow * 0.55, 0.0, 1.0));
    sampledColor += whiteHot * coreGlow * 0.35;

    // Apply intensity
    sampledColor *= u_intensity;

    // Apply color palette
    sampledColor = applyStatePalette(sampledColor, u_state);

    sceneColor = sampledColor;
  } else {
    // Procedural Fallback
    vec2 p = uv - vec2(0.5, 0.05);
    p.x *= aspect;
    float rays = exp(-abs(p.x) * 7.0) + exp(-abs(p.x - p.y * 0.25) * 9.0) + exp(-abs(p.x + p.y * 0.25) * 9.0);
    float verticalReach = smoothstep(1.2, 0.05, p.y);
    float plasma = rays * verticalReach * u_intensity;
    vec3 magma = vec3(0.95, 0.42, 0.07) * plasma;
    magma = applyStatePalette(magma, u_state);
    sceneColor = magma;
  }

  // Soft top falloff into black
  float topFade = smoothstep(1.0, 0.65, coord.y);
  sceneColor *= topFade;

  // Subtle dither to eliminate banding on OLED displays
  float dither = fract(sin(dot(uv + fract(u_time * 0.01), vec2(12.9898, 78.233))) * 43758.5453);
  sceneColor += (dither - 0.5) * 0.006;

  gl_FragColor = vec4(clamp(sceneColor, 0.0, 1.0), 1.0);
}
`;

export function RocketFlareShader({
  intensity = 0.85,
  speed = 0.8,
  spread = 1.0,
  coreHeat = 1.1,
  turbulence = 0.8,
  state = "void",
  mouseParallax = true,
  className = "",
  style,
}: RocketFlareProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const uniformsRef = useRef({
    intensity,
    speed,
    spread,
    coreHeat,
    turbulence,
    state: 3.0,
  });

  useEffect(() => {
    let stateNum = 0.0;
    if (state === "violation") stateNum = 1.0;
    else if (state === "celebration") stateNum = 2.0;
    else if (state === "void") stateNum = 3.0;

    uniformsRef.current = {
      intensity,
      speed,
      spread,
      coreHeat,
      turbulence,
      state: stateNum,
    };
  }, [intensity, speed, spread, coreHeat, turbulence, state]);

  useEffect(() => {
    if (!mouseParallax) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      mouseRef.current = { x, y };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseParallax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn("WebGL not supported on this browser.");
      return;
    }

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");
    const uSpeed = gl.getUniformLocation(program, "u_speed");
    const uSpread = gl.getUniformLocation(program, "u_spread");
    const uCoreHeat = gl.getUniformLocation(program, "u_core_heat");
    const uTurbulence = gl.getUniformLocation(program, "u_turbulence");
    const uState = gl.getUniformLocation(program, "u_state");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uTexture = gl.getUniformLocation(program, "u_texture");
    const uHasTexture = gl.getUniformLocation(program, "u_has_texture");

    const texture = gl.createTexture();
    textureRef.current = texture;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );

    let isCancelled = false;
    let hasUploadedTexture = false;

    // Load pure plasma texture with 100% zero hull
    const image = new Image();
    image.src = "/assets/flare/pure-flare-no-hull.jpg";

    const uploadTexture = () => {
      if (isCancelled || !gl) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      hasUploadedTexture = true;
    };

    if (image.complete) {
      uploadTexture();
    } else {
      image.onload = uploadTexture;
    }

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    let smoothMouseX = 0;
    let smoothMouseY = 0;
    let animationFrameId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      const u = uniformsRef.current;

      smoothMouseX += (mouseRef.current.x - smoothMouseX) * 0.05;
      smoothMouseY += (mouseRef.current.y - smoothMouseY) * 0.05;

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsedSec);
      gl.uniform1f(uIntensity, u.intensity);
      gl.uniform1f(uSpeed, u.speed);
      gl.uniform1f(uSpread, u.spread);
      gl.uniform1f(uCoreHeat, u.coreHeat);
      gl.uniform1f(uTurbulence, u.turbulence);
      gl.uniform1f(uState, u.state);
      gl.uniform2f(uMouse, smoothMouseX, smoothMouseY);
      gl.uniform1i(uTexture, 0);
      gl.uniform1f(uHasTexture, hasUploadedTexture ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (texture) gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{
        display: "block",
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        ...style,
      }}
    />
  );
}
