/**
 * 노을 하늘 유체 배경 (WebGL2 Stable Fluids).
 * 색을 직접 옮기지 않고 "각 픽셀이 원래 하늘의 어느 좌표에서 왔는가"(원본 UV 맵)를 유체로 옮긴다.
 * 화면 색 = sky(원본 UV). 포인터가 멈추면 원본 UV가 제자리로 미끄러져 돌아가
 * 흐트러진 무늬가 거꾸로 풀리듯 정리된다 (크로스페이드가 아님).
 */

const VS = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB;
uniform vec2 texel;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0); vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y); vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 outColor;
`;

// 노을 하늘: 세로 그라데이션 + 지평선 쪽으로 눌린 가로 구름 결 + 해 주변 광
const SKY = `
uniform float aspect; uniform float time;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float noise1(float x) { float i = floor(x), f = fract(x); return mix(hash(vec2(i, 0.0)), hash(vec2(i + 1.0, 0.0)), f * f * (3.0 - 2.0 * f)); }
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.3, 9.1); a *= 0.5; }
  return v;
}
const vec2 SUN = vec2(0.70, 0.16);
vec3 sky(vec2 uv) {
  float y = uv.y;
  vec3 c = mix(vec3(1.00, 0.80, 0.48), vec3(0.98, 0.55, 0.30), smoothstep(0.10, 0.24, y)); // 금빛 -> 주황
  c = mix(c, vec3(0.90, 0.40, 0.55), smoothstep(0.20, 0.42, y));                           // 분홍
  c = mix(c, vec3(0.52, 0.30, 0.66), smoothstep(0.38, 0.66, y));                           // 보라
  c = mix(c, vec3(0.17, 0.13, 0.36), smoothstep(0.60, 0.98, y));                           // 남보라
  vec2 p = vec2(uv.x * aspect, y);
  // 구름: 가로로 길게, 위로 갈수록 성기게, 천천히 흐른다
  float band = fbm(vec2(p.x * 1.6 - time * 0.012, p.y * 5.5 + fbm(p * 2.0 + time * 0.01) * 1.2));
  float wisp = fbm(vec2(p.x * 3.2 + time * 0.02, p.y * 9.0));
  float cloud = smoothstep(0.40, 0.70, band * 0.8 + wisp * 0.35) * smoothstep(1.02, 0.30, y);
  // 아래쪽 구름은 해에 밝게 물들고, 위쪽 구름은 어둡게 가라앉는다
  vec3 lit = mix(vec3(1.0, 0.72, 0.52), vec3(0.95, 0.52, 0.66), smoothstep(0.2, 0.55, y));
  vec3 shade = mix(vec3(0.46, 0.22, 0.42), vec3(0.20, 0.14, 0.34), smoothstep(0.35, 0.9, y));
  float under = smoothstep(0.9, 0.2, y);
  c = mix(c, mix(shade, lit, under * 0.85), cloud * 0.85);
  // 해 주변 광
  vec2 d = (uv - SUN) * vec2(aspect, 1.0);
  c += vec3(1.0, 0.72, 0.42) * exp(-dot(d, d) * 9.0) * 0.55;
  // 산 능선: 유체가 옮기는 색 안에 그려서 땅도 함께 휘저어진다
  float x = p.x;
  float far = 0.13 + 0.035 * noise1(x * 2.2 + 4.0) + 0.012 * noise1(x * 9.0);
  float near = 0.075 + 0.05 * noise1(x * 1.3 + 11.0) + 0.012 * noise1(x * 7.0 + 2.0) + 0.004 * noise1(x * 40.0);
  float edge = 0.0025;
  c = mix(c, mix(c, vec3(0.22, 0.12, 0.24), 0.72), smoothstep(far + edge, far - edge, y));
  c = mix(c, vec3(0.06, 0.04, 0.08), smoothstep(near + edge, near - edge, y));
  return c;
}
`;

const FS = {
  splat: HEAD + `
uniform sampler2D uTarget; uniform float ratio; uniform vec3 color; uniform vec2 point; uniform float radius;
void main() {
  vec2 p = vUv - point; p.x *= ratio;
  outColor = vec4(texture(uTarget, vUv).xyz + exp(-dot(p, p) / radius) * color, 1.0);
}`,
  advect: HEAD + `
uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 velTexel; uniform float dt; uniform float dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * velTexel;
  outColor = texture(uSource, coord) / (1.0 + dissipation * dt);
}`,
  advectDye: HEAD + `
uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 velTexel; uniform float dt; uniform float relax; uniform float restore;
void main() {
  // 복원 흐름: 각 픽셀의 내용물은 자기 원래 자리(from) 쪽으로 실제로 이동한다.
  // 그래서 소용돌이가 그 자리에서 옅어지지 않고 풀리면서 제자리로 돌아간다.
  vec2 home = texture(uSource, vUv).xy;
  vec2 back = (home - vUv) * restore;
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * velTexel - dt * back;
  // 화면 밖에서 들어오는 내용물은 원래 하늘 그대로 (가장자리 값이 번지지 않게)
  bool outside = any(lessThan(coord, vec2(0.0))) || any(greaterThan(coord, vec2(1.0)));
  vec2 from = outside ? coord : texture(uSource, coord).xy;
  // 마지막 미세 오차만 약하게 보정
  from = mix(from, vUv, clamp(relax * dt, 0.0, 1.0));
  outColor = vec4(clamp(from, 0.0, 1.0), 0.0, 1.0);
}`,
  initDye: HEAD + `
void main() { outColor = vec4(vUv, 0.0, 1.0); }`,
  divergence: HEAD + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x; float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y; float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
  outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
  curl: HEAD + `
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y; float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x; float B = texture(uVelocity, vB).x;
  outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
  vorticity: HEAD + `
uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
void main() {
  float L = texture(uCurl, vL).x; float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x; float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C; force.y *= -1.0;
  outColor = vec4(clamp(texture(uVelocity, vUv).xy + force * dt, -1000.0, 1000.0), 0.0, 1.0);
}`,
  clear: HEAD + `
uniform sampler2D uTexture; uniform float value;
void main() { outColor = value * texture(uTexture, vUv); }`,
  pressure: HEAD + `
uniform sampler2D uPressure; uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x; float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x; float B = texture(uPressure, vB).x;
  outColor = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`,
  gradient: HEAD + `
uniform sampler2D uPressure; uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x; float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x; float B = texture(uPressure, vB).x;
  outColor = vec4(texture(uVelocity, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`,
  display: HEAD + SKY + `
uniform sampler2D uDye; uniform vec2 res; uniform float clock;
void main() {
  vec3 c = sky(texture(uDye, vUv).xy);
  // 별: 어두운 윗하늘에만 희미하게 반짝인다
  vec2 g = floor(vUv * res / 3.0);
  float s = step(0.9965, hash(g)) * smoothstep(0.62, 0.95, vUv.y);
  float tw = 0.6 + 0.4 * sin(clock * (1.5 + hash(g + 3.0) * 3.0) + hash(g) * 6.28);
  c += vec3(1.0, 0.95, 0.9) * s * tw * max(0.0, 0.55 - dot(c, vec3(0.3, 0.5, 0.2)) * 1.4);
  // 비네팅 + 필름 그레인
  vec2 q = vUv - 0.5;
  c *= 1.0 - dot(q, q) * 0.45;
  c += (hash(vUv * res + fract(clock) * 100.0) - 0.5) * 0.018;
  outColor = vec4(max(c, 0.0), 1.0);
}`,
};

type Program = { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type FBO = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
type DoubleFBO = { read: FBO; write: FBO; swap: () => void };

export class SkyFluid {
  private gl: WebGL2RenderingContext;
  private programs: Record<keyof typeof FS, Program>;
  private velocity!: DoubleFBO;
  private dye!: DoubleFBO;
  private pressure!: DoubleFBO;
  private divergenceFbo!: FBO;
  private curlFbo!: FBO;
  private raf = 0;
  private last = 0;
  private time = 0;
  private lastMove = -10;
  /** 현재 위치와 직전 프레임에서 붓질을 시작한 위치 (uv) */
  private pointer = { x: -1, y: -1, fromX: -1, fromY: -1, moved: false };
  private running = false;
  private disposed = false;
  private simRes: number;
  private dyeRes: number;

  static create(canvas: HTMLCanvasElement, opts: { mobile: boolean }) {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
    if (!gl || gl.isContextLost()) return null;
    if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) return null;
    try {
      return new SkyFluid(canvas, gl, opts);
    } catch {
      return null;
    }
  }

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, opts: { mobile: boolean }) {
    this.gl = gl;
    this.simRes = opts.mobile ? 96 : 128;
    this.dyeRes = opts.mobile ? 512 : 900;
    const vs = this.compile(gl.VERTEX_SHADER, VS);
    this.programs = Object.fromEntries(
      Object.entries(FS).map(([k, src]) => [k, this.link(vs, this.compile(gl.FRAGMENT_SHADER, src))]),
    ) as Record<keyof typeof FS, Program>;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    this.resize();
  }

  private compile(type: number, src: string) {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
    return sh;
  }

  private link(vs: WebGLShader, fs: WebGLShader): Program {
    const gl = this.gl;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    const u: Program["u"] = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(prog, i)!.name;
      u[name] = gl.getUniformLocation(prog, name);
    }
    return { prog, u };
  }

  private fbo(w: number, h: number, internal: number, format: number): FBO {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("fbo");
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h };
  }

  private double(w: number, h: number, internal: number, format: number): DoubleFBO {
    const d: DoubleFBO = {
      read: this.fbo(w, h, internal, format),
      write: this.fbo(w, h, internal, format),
      swap() {
        const t = d.read;
        d.read = d.write;
        d.write = t;
      },
    };
    return d;
  }

  private size(res: number) {
    const aspect = this.canvas.width / this.canvas.height;
    return aspect > 1 ? { w: Math.round(res * aspect), h: res } : { w: res, h: Math.round(res / aspect) };
  }

  private get aspect() {
    return this.canvas.width / this.canvas.height;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (w === this.canvas.width && h === this.canvas.height && this.velocity) return;
    this.canvas.width = w;
    this.canvas.height = h;
    const gl = this.gl;
    const sim = this.size(this.simRes);
    const dye = this.size(this.dyeRes);
    this.velocity = this.double(sim.w, sim.h, gl.RG16F, gl.RG);
    this.pressure = this.double(sim.w, sim.h, gl.R16F, gl.RED);
    this.divergenceFbo = this.fbo(sim.w, sim.h, gl.R16F, gl.RED);
    this.curlFbo = this.fbo(sim.w, sim.h, gl.R16F, gl.RED);
    this.dye = this.double(dye.w, dye.h, gl.RGBA16F, gl.RGBA);
    const u = this.use(this.programs.initDye);
    gl.uniform2f(u.texel, 1 / dye.w, 1 / dye.h);
    gl.uniform1f(u.aspect, this.aspect);
    gl.uniform1f(u.time, 0);
    this.blit(this.dye.read);
  }

  private use(p: Program) {
    this.gl.useProgram(p.prog);
    return p.u;
  }

  private bind(unit: number, tex: WebGLTexture) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    return unit;
  }

  private blit(target: FBO | null) {
    const gl = this.gl;
    if (target) {
      gl.viewport(0, 0, target.w, target.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** 속도만 주입한다. 색은 새로 칠하지 않고 있는 하늘을 휘젓는다. */
  private push(x: number, y: number, dx: number, dy: number, radius: number) {
    const gl = this.gl;
    const u = this.use(this.programs.splat);
    gl.uniform2f(u.texel, 1 / this.velocity.read.w, 1 / this.velocity.read.h);
    gl.uniform1i(u.uTarget, this.bind(0, this.velocity.read.tex));
    gl.uniform1f(u.ratio, this.aspect);
    gl.uniform2f(u.point, x, y);
    gl.uniform3f(u.color, dx, dy, 0);
    gl.uniform1f(u.radius, radius / 100);
    this.blit(this.velocity.write);
    this.velocity.swap();
  }

  /**
   * 붓질: 직전 위치에서 현재 위치까지 경로를 따라 작은 속도 점을 찍는다.
   * 속도는 커서 속도의 일부라서, 색이 커서를 살짝 늦게 따라오며 문질러진다.
   */
  private brush(dt: number) {
    const p = this.pointer;
    p.moved = false;
    const ddx = p.x - p.fromX;
    const ddy = p.y - p.fromY;
    const dist = Math.hypot(ddx * this.aspect, ddy);
    if (dist < 1e-4) return;
    const w = this.velocity.read.w;
    const h = this.velocity.read.h;
    // uv/s -> 시뮬레이션 텍셀/s, 커서 속도의 45%
    let vx = (ddx / Math.max(dt, 1 / 120)) * w * 0.45;
    let vy = (ddy / Math.max(dt, 1 / 120)) * h * 0.45;
    const speed = Math.hypot(vx, vy);
    const MAX = 110;
    if (speed > MAX) {
      vx *= MAX / speed;
      vy *= MAX / speed;
    }
    const steps = Math.min(12, Math.max(1, Math.ceil(dist / 0.012)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.push(p.fromX + ddx * t, p.fromY + ddy * t, vx / steps * 2, vy / steps * 2, 0.045);
    }
  }

  pointerMove(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;
    const p = this.pointer;
    if (p.x < 0) {
      p.fromX = x;
      p.fromY = y;
    } else if (!p.moved) {
      p.fromX = p.x;
      p.fromY = p.y;
    }
    p.x = x;
    p.y = y;
    p.moved = true;
    this.lastMove = this.time;
  }

  /** 마우스가 멈춘 뒤 0.5초부터 2.5초까지 0 -> 1 */
  private get idle() {
    const t = Math.min(Math.max((this.time - this.lastMove - 0.5) / 2.0, 0), 1);
    return t * t * (3 - 2 * t);
  }

  private step(dt: number) {
    const gl = this.gl;
    const vt = [1 / this.velocity.read.w, 1 / this.velocity.read.h] as const;

    let u = this.use(this.programs.curl);
    gl.uniform2f(u.texel, ...vt);
    gl.uniform1i(u.uVelocity, this.bind(0, this.velocity.read.tex));
    this.blit(this.curlFbo);

    u = this.use(this.programs.vorticity);
    gl.uniform2f(u.texel, ...vt);
    gl.uniform1i(u.uVelocity, this.bind(0, this.velocity.read.tex));
    gl.uniform1i(u.uCurl, this.bind(1, this.curlFbo.tex));
    gl.uniform1f(u.curl, 3);
    gl.uniform1f(u.dt, dt);
    this.blit(this.velocity.write);
    this.velocity.swap();

    u = this.use(this.programs.divergence);
    gl.uniform2f(u.texel, ...vt);
    gl.uniform1i(u.uVelocity, this.bind(0, this.velocity.read.tex));
    this.blit(this.divergenceFbo);

    u = this.use(this.programs.clear);
    gl.uniform2f(u.texel, ...vt);
    gl.uniform1i(u.uTexture, this.bind(0, this.pressure.read.tex));
    gl.uniform1f(u.value, 0.8);
    this.blit(this.pressure.write);
    this.pressure.swap();

    u = this.use(this.programs.pressure);
    gl.uniform2f(u.texel, ...vt);
    gl.uniform1i(u.uDivergence, this.bind(0, this.divergenceFbo.tex));
    for (let i = 0; i < 20; i++) {
      gl.uniform1i(u.uPressure, this.bind(1, this.pressure.read.tex));
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    u = this.use(this.programs.gradient);
    gl.uniform2f(u.texel, ...vt);
    gl.uniform1i(u.uPressure, this.bind(0, this.pressure.read.tex));
    gl.uniform1i(u.uVelocity, this.bind(1, this.velocity.read.tex));
    this.blit(this.velocity.write);
    this.velocity.swap();

    u = this.use(this.programs.advect);
    gl.uniform2f(u.texel, ...vt);
    gl.uniform2f(u.velTexel, ...vt);
    gl.uniform1i(u.uVelocity, this.bind(0, this.velocity.read.tex));
    gl.uniform1i(u.uSource, this.bind(0, this.velocity.read.tex));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, 1.6 + this.idle * 3.0);
    this.blit(this.velocity.write);
    this.velocity.swap();

    u = this.use(this.programs.advectDye);
    gl.uniform2f(u.texel, 1 / this.dye.read.w, 1 / this.dye.read.h);
    gl.uniform2f(u.velTexel, ...vt);
    gl.uniform1i(u.uVelocity, this.bind(0, this.velocity.read.tex));
    gl.uniform1i(u.uSource, this.bind(1, this.dye.read.tex));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.relax, 0.02 + this.idle * 0.5);
    gl.uniform1f(u.restore, this.idle * 2.2);
    gl.uniform1f(u.aspect, this.aspect);
    gl.uniform1f(u.time, 0); // 기준 하늘은 고정: 멈추면 항상 처음 화면으로 돌아온다
    this.blit(this.dye.write);
    this.dye.swap();
  }

  private render() {
    const gl = this.gl;
    const u = this.use(this.programs.display);
    gl.uniform2f(u.texel, 1 / this.dye.read.w, 1 / this.dye.read.h);
    gl.uniform1i(u.uDye, this.bind(0, this.dye.read.tex));
    gl.uniform1f(u.aspect, this.aspect);
    gl.uniform1f(u.time, 0);
    gl.uniform1f(u.clock, this.time);
    gl.uniform2f(u.res, this.canvas.width, this.canvas.height);
    this.blit(null);
  }

  private frame = (now: number) => {
    if (!this.running || this.disposed) return;
    const dt = Math.min((now - (this.last || now)) / 1000, 1 / 30);
    this.last = now;
    this.time += dt;
    this.resize();

    if (this.pointer.moved) this.brush(dt);

    this.step(dt);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  /** 움직임 줄이기: 기준 하늘을 한 번만 그린다. */
  renderStatic() {
    this.render();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    this.disposed = true;
  }
}
