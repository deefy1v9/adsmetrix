'use client';

import React, { useEffect, useRef } from 'react';

/**
 * ProceduralGroundBackground
 * WebGL topographic neon lines — green brand palette (#b4f13d / #030b14)
 */
const ProceduralGroundBackground: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);

        // Ground Perspective Simulation
        float depth = 1.0 / (uv.y + 1.15);
        vec2 gridUv = vec2(uv.x * depth, depth + u_time * 0.12);

        // Layered Procedural Noise for Terrain
        float n = noise(gridUv * 3.5);
        float ripples = sin(gridUv.y * 18.0 + n * 8.0 + u_time * 0.5);

        // Topographic Lines
        float topoLine = smoothstep(0.03, 0.0, abs(ripples));

        // Green Brand Palette: #030b14 base, #b4f13d neon, #3b5c08 mid
        vec3 baseColor  = vec3(0.012, 0.043, 0.078);  // #030b14
        vec3 midColor   = vec3(0.08,  0.22,  0.03);   // dark green mid
        vec3 neonColor  = vec3(0.706, 0.945, 0.239);  // #b4f13d

        // Composite
        vec3 finalColor = mix(baseColor, midColor, n * 0.7);
        finalColor += topoLine * neonColor * depth * 0.9;

        // Horizon Fog / Vignette (less aggressive)
        float fade = smoothstep(0.1, -1.0, uv.y);
        finalColor *= (1.0 - length(uv) * 0.25) * (1.0 - fade);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]), gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc  = gl.getUniformLocation(program, 'u_resolution');

    let animId: number;
    const render = (time: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform1f(timeLoc, time * 0.001);
      gl.uniform2f(resLoc, w, h);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className={`fixed inset-0 w-full h-full -z-10 ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ filter: 'contrast(1.1) brightness(1.35)' }}
      />
    </div>
  );
};

export default ProceduralGroundBackground;
