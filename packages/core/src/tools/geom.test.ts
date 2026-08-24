import { describe, it, expect } from 'vitest';
import {
  // escalares
  clamp, lerp, easeInOutCubic, easeOutBack,
  // vec2
  v2add, v2sub, v2dot, v2cross, v2len, v2norm, v2rot, v2lerp, v2fromAngle, v2angle,
  // vec3
  v3add, v3sub, v3dot, v3cross, v3len, v3norm, v3dist, v3lerp,
  // mat3
  mat3Identity, mat3Multiply, mat3Translation, mat3Rotation, applyMat3,
  // mat4
  mat4Identity, mat4Multiply, mat4RotationY, mat4LookAt, transformPoint,
  // quat
  quatFromAxisAngle, quatRotateVec3, quatMultiply, quatToMat4, quatSlerp,
  // 2D
  polygon2D, star2D, spiral2D, lissajous2D, superellipse2D, grid2D, bezier2D, bezierPath2D, boundingBox2D, render2DSvg, pointsToSvgPath,
  // 3D
  sphere3D, torus3D, box3D, cylinder3D, helix3D, parametricSurface3D, computeNormals, meshToOBJ, meshToSTL, projectMeshSvg,
  // timeline + video
  sampleTimeline, renderGeomHtml,
  type Timeline,
  // bridge
  implicitPointCloud,
  type Vec2,
  type GeomVec3,
} from './geom';

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe('geom: escalares y easing', () => {
  it('clamp', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
  it('lerp', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
  it('easeInOutCubic(0.5) = 0.5', () => {
    expect(close(easeInOutCubic(0.5), 0.5)).toBe(true);
  });
  it('easeOutBack extremos', () => {
    expect(close(easeOutBack(0), 0)).toBe(true);
    expect(close(easeOutBack(1), 1)).toBe(true);
  });
});

describe('geom: vec2', () => {
  it('v2add / v2sub', () => {
    expect(v2add([1, 2], [3, 4])).toEqual([4, 6]);
    expect(v2sub([3, 4], [1, 2])).toEqual([2, 2]);
  });
  it('v2dot / v2cross', () => {
    expect(v2dot([1, 0], [0, 1])).toBe(0);
    expect(v2cross([1, 0], [0, 1])).toBe(1);
  });
  it('v2len / v2norm', () => {
    expect(v2len([3, 4])).toBe(5);
    expect(v2norm([3, 4])).toEqual([0.6, 0.8]);
  });
  it('v2rot 90°', () => {
    const r = v2rot([1, 0], Math.PI / 2);
    expect(close(r[0], 0)).toBe(true);
    expect(close(r[1], 1)).toBe(true);
  });
  it('v2lerp', () => {
    expect(v2lerp([0, 0], [2, 4], 0.5)).toEqual([1, 2]);
  });
  it('v2fromAngle / v2angle', () => {
    expect(close(v2angle(v2fromAngle(0, 1)), 0)).toBe(true);
    expect(close(v2angle(v2fromAngle(Math.PI / 2, 1)), Math.PI / 2)).toBe(true);
  });
});

describe('geom: vec3', () => {
  it('v3add / v3sub', () => {
    expect(v3add([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
    expect(v3sub([4, 5, 6], [1, 2, 3])).toEqual([3, 3, 3]);
  });
  it('v3dot', () => {
    expect(v3dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });
  it('v3cross', () => {
    expect(v3cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });
  it('v3len / v3norm / v3dist', () => {
    expect(v3len([0, 3, 4])).toBe(5);
    expect(v3norm([0, 0, 5])).toEqual([0, 0, 1]);
    expect(v3dist([0, 0, 0], [3, 4, 0])).toBe(5);
  });
  it('v3lerp', () => {
    expect(v3lerp([0, 0, 0], [2, 2, 2], 0.5)).toEqual([1, 1, 1]);
  });
});

describe('geom: mat3', () => {
  it('mat3Identity', () => {
    expect(mat3Identity()).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
  it('mat3Multiply asociativo con identidad', () => {
    const r = mat3Rotation(Math.PI / 4);
    expect(mat3Multiply(mat3Identity(), r).map((v) => Math.round(v * 1e6) / 1e6)).toEqual(r.map((v) => Math.round(v * 1e6) / 1e6));
  });
  it('mat3Translation + applyMat3', () => {
    const m = mat3Translation(5, 7);
    expect(applyMat3(m, [2, 3])).toEqual([7, 10]);
  });
});

describe('geom: mat4', () => {
  it('mat4Identity', () => {
    expect(mat4Identity()).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  });
  it('mat4RotationY(90°) mapea x→-z', () => {
    const m = mat4RotationY(Math.PI / 2);
    const p = transformPoint(m, [1, 0, 0]);
    expect(close(p[0], 0, 1e-6)).toBe(true);
    expect(close(p[2], -1, 1e-6)).toBe(true);
  });
  it('transformPoint con traslación', () => {
    const m = [1, 0, 0, 5, 0, 1, 0, 7, 0, 0, 1, 0, 0, 0, 0, 1] as any;
    expect(transformPoint(m, [2, 3, 0])).toEqual([7, 10, 0]);
  });
  it('mat4Multiply compone rot + lookAt', () => {
    const view = mat4LookAt([0, 0, 4], [0, 0, 0], [0, 1, 0]);
    const rot = mat4RotationY(0.4);
    const m = mat4Multiply(view, rot);
    const p = transformPoint(m, [1, 0, 0]);
    expect(Number.isFinite(p[0])).toBe(true);
  });
});

describe('geom: quaternion', () => {
  it('quatFromAxisAngle eje Y 90° rota x→-z', () => {
    const q = quatFromAxisAngle([0, 1, 0], Math.PI / 2);
    const r = quatRotateVec3(q, [1, 0, 0]);
    expect(close(r[0], 0, 1e-6)).toBe(true);
    expect(close(r[2], -1, 1e-6)).toBe(true);
  });
  it('quatMultiply identidad', () => {
    const q = quatFromAxisAngle([0, 1, 0], 0.5);
    const id = [0, 0, 0, 1] as any;
    const r = quatRotateVec3(quatMultiply(id, q), [1, 0, 0]);
    const e = quatRotateVec3(q, [1, 0, 0]);
    expect(close(r[0], e[0], 1e-6)).toBe(true);
  });
  it('quatSlerp extremos', () => {
    const a = quatFromAxisAngle([0, 1, 0], 0);
    const b = quatFromAxisAngle([0, 1, 0], Math.PI);
    const s0 = quatSlerp(a, b, 0);
    const s1 = quatSlerp(a, b, 1);
    expect(close(s0[3], a[3], 1e-6)).toBe(true);
    expect(close(s1[3], b[3], 1e-6)).toBe(true);
  });
});

describe('geom: 2D', () => {
  it('polygon2D n y radio', () => {
    const pts = polygon2D(5, 2);
    expect(pts.length).toBe(5);
    expect(close(v2len(pts[0]), 2)).toBe(true);
  });
  it('star2D 2n puntos', () => {
    expect(star2D(5).length).toBe(10);
  });
  it('spiral2D muestras', () => {
    expect(spiral2D(3, 0.1, 1, 100).length).toBe(100);
  });
  it('lissajous2D', () => {
    const pts = lissajous2D(1, 1, 3, 2, Math.PI / 2, 50);
    expect(pts.length).toBe(50);
    expect(close(pts[0][1], 0, 1e-6)).toBe(true); // y(0) = sin(0) = 0
    expect(close(pts[0][0], Math.sin(Math.PI / 2), 1e-6)).toBe(true); // x(0) = sin(delta)
  });
  it('superellipse2D', () => {
    expect(superellipse2D(4, 4, 100).length).toBe(100);
  });
  it('grid2D', () => {
    expect(grid2D(3, 2).length).toBe(6);
  });
  it('bezier2D extremos', () => {
    const c = [[0, 0], [1, 2], [2, 0]] as Vec2[];
    expect(bezier2D(c, 0)).toEqual([0, 0]);
    expect(bezier2D(c, 1)).toEqual([2, 0]);
  });
  it('bezierPath2D longitud', () => {
    expect(bezierPath2D([[0, 0], [1, 1]], 10).length).toBe(10);
  });
  it('boundingBox2D', () => {
    const b = boundingBox2D([[0, 0], [2, 3], [-1, 1]] as Vec2[]);
    expect(b.min).toEqual([-1, 0]);
    expect(b.max).toEqual([2, 3]);
    expect(b.width).toBe(3);
  });
});

describe('geom: SVG', () => {
  it('render2DSvg contiene svg y rol', () => {
    const svg = render2DSvg([{ kind: 'polygon', points: polygon2D(5), fill: '#8b5cf6' }]);
    expect(svg).toContain('<svg');
    expect(svg).toContain('role="img"');
  });
  it('pointsToSvgPath cierra', () => {
    expect(pointsToSvgPath([[0, 0], [1, 0], [1, 1]], { close: true })).toContain('Z');
  });
});

describe('geom: 3D mallas', () => {
  it('sphere3D vértices/caras', () => {
    const m = sphere3D(1, 12, 16);
    expect(m.positions.length).toBe(13 * 16);
    expect(m.faces.length).toBe(12 * 16 * 2);
  });
  it('torus3D', () => {
    const m = torus3D(1, 0.4, 12, 16);
    expect(m.faces.length).toBe(12 * 16 * 2);
  });
  it('box3D 8 vértices / 12 caras', () => {
    const m = box3D(1, 1, 1);
    expect(m.positions.length).toBe(8);
    expect(m.faces.length).toBe(12);
  });
  it('cylinder3D', () => {
    const m = cylinder3D(1, 2, 8);
    expect(m.faces.length).toBe(8 * 4);
  });
  it('helix3D muestras', () => {
    expect(helix3D(3, 1, 4, 50).length).toBe(50);
  });
  it('parametricSurface3D mobius', () => {
    const m = parametricSurface3D((u, v) => {
      const t = u * 2 * Math.PI;
      const w = v * 2 - 1;
      const R = 1.5;
      const x = (R + (w / 2) * Math.cos(t / 2)) * Math.cos(t);
      const y = (R + (w / 2) * Math.cos(t / 2)) * Math.sin(t);
      const z = (w / 2) * Math.sin(t / 2);
      return [x, y, z] as GeomVec3;
    }, 24, 8);
    expect(m.faces.length).toBe(24 * 8 * 2);
  });
  it('computeNormals añade normales', () => {
    const m = computeNormals(sphere3D(1, 8, 8));
    expect(m.normals?.length).toBe(m.positions.length);
  });
  it('meshToOBJ / meshToSTL', () => {
    const m = sphere3D(1, 4, 6);
    expect(meshToOBJ(m)).toContain('v ');
    expect(meshToSTL(m)).toContain('facet normal');
  });
  it('projectMeshSvg contiene svg', () => {
    const m = sphere3D(1, 12, 16);
    const mat = mat4Multiply(mat4LookAt([0, 0, 4], [0, 0, 0], [0, 1, 0]), mat4RotationY(0.4));
    const svg = projectMeshSvg(m, mat);
    expect(svg).toContain('<svg');
    expect(svg).toContain('role="img"');
  });
});

describe('geom: timeline', () => {
  it('sampleTimeline extremos y medio', () => {
    const tl = { x: [{ t: 0, value: 0 }, { t: 1, value: 10 }] };
    expect(sampleTimeline(tl, 0).x).toBe(0);
    expect(sampleTimeline(tl, 1).x).toBe(10);
    expect(close(sampleTimeline(tl, 0.5).x, 5)).toBe(true);
  });
  it('sampleTimeline con easing', () => {
    const tl: Timeline = { y: [{ t: 0, value: 0, ease: 'easeOutBack' }, { t: 1, value: 1 }] };
    expect(sampleTimeline(tl, 0).y).toBe(0);
    expect(sampleTimeline(tl, 1).y).toBe(1);
  });
});

describe('geom: video / animación', () => {
  it('renderGeomHtml 2d lissajous', () => {
    const html = renderGeomHtml({ mode: '2d', preset: 'lissajous', params: {} });
    expect(html).toContain('<canvas');
    expect(html).toContain('role="img"');
    expect(html).toContain('lissajous');
  });
  it('renderGeomHtml 3d spinning-cube', () => {
    const html = renderGeomHtml({ mode: '3d', preset: 'spinning-cube', params: {} });
    expect(html).toContain('<canvas');
    expect(html).toContain('spinning-cube');
  });
});

describe('geom: bridge SDF', () => {
  it('implicitPointCloud esfera', () => {
    const field = ([x, y, z]: GeomVec3) => Math.hypot(x, y, z) - 1;
    const cloud = implicitPointCloud(field, { bounds: [[-1.5, -1.5, -1.5], [1.5, 1.5, 1.5]] as [GeomVec3, GeomVec3], step: 0.1, eps: 0.09 });
    expect(cloud.length).toBeGreaterThan(50);
  });
});
