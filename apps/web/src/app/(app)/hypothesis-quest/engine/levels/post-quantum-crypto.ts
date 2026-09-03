/**
 * Hypothesis Quest 3D — Level 10: Post-Quantum Cryptography
 *
 * Post-quantum cryptography: designing cryptosystems that are secure
 * against attacks by quantum computers. Based on problems like the
 * closest vector problem (CVP) in lattices, which are believed to be
 * hard even for quantum computers.
 *
 * Gameplay: Player must solve a simplified CVP: given two basis vectors,
 * find the integer combination closest to a target point. Player adjusts
 * two coefficients (integers) to minimize distance. If distance < threshold,
 * the level is solved.
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos, normalizeChaosState } from '../chaos';
import { WorldObject } from '../world';

export interface LatticeLevelState {
  basisV1: THREE.Vector2;
  basisV2: THREE.Vector2;
  target: THREE.Vector2;
  coeffA: number;
  coeffB: number;
  closestDistance: number;
  threshold: number;
  isComplete: boolean;
  isValid: boolean;
  round: number;
  maxRounds: number;
  score: number;
}

export class PostQuantumCryptoLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private state: LatticeLevelState;
  private latticeGroup: THREE.Group;
  private targetMesh: THREE.Mesh;
  private resultMesh: THREE.Mesh;
  private latticePoints: THREE.Mesh[] = [];
  private gridLines: THREE.Line[] = [];

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);

    const { v1, v2, target } = this.generateLatticeParams(1);

    this.state = {
      basisV1: v1,
      basisV2: v2,
      target,
      coeffA: 0,
      coeffB: 0,
      closestDistance: Infinity,
      threshold: 0.5,
      isComplete: false,
      isValid: true,
      round: 1,
      maxRounds: 3,
      score: 0,
    };

    this.latticeGroup = new THREE.Group();
    this.scene.add(this.latticeGroup);
    this.targetMesh = this.createTargetMesh();
    this.resultMesh = this.createResultMesh();
  }

  private generateLatticeParams(round: number): {
    v1: THREE.Vector2;
    v2: THREE.Vector2;
    target: THREE.Vector2;
  } {
    const scale = 1 + round * 0.5;
    const state1 = stepChaos(this.chaosState, undefined, round * 200);
    const state2 = stepChaos(this.chaosState, undefined, round * 200 + 1);
    const state3 = stepChaos(this.chaosState, undefined, round * 200 + 2);
    const n1 = normalizeChaosState(state1);
    const n2 = normalizeChaosState(state2);
    const n3 = normalizeChaosState(state3);

    return {
      v1: new THREE.Vector2(
        (n1.normalized.nx * 2 + 1) * scale,
        (n1.normalized.ny * 2) * scale
      ),
      v2: new THREE.Vector2(
        (n2.normalized.nx * 2) * scale,
        (n2.normalized.ny * 2 + 1) * scale
      ),
      target: new THREE.Vector2(
        n3.normalized.nx * 5 * scale,
        n3.normalized.ny * 5 * scale
      ),
    };
  }

  private createTargetMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.4, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      emissive: 0xe74c3c,
      emissiveIntensity: 0.6,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    return mesh;
  }

  private createResultMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2ecc71,
      emissive: 0x2ecc71,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    return mesh;
  }

  generate(): WorldObject[] {
    const objects: WorldObject[] = [];

    this.rebuildLatticeVisual();

    // Target position
    const tx = this.state.target.x;
    const tz = this.state.target.y;
    this.targetMesh.position.set(tx, 1, tz);

    // Ground grid
    const gridHelper = new THREE.GridHelper(30, 30, 0x1a1a2e, 0x111115);
    this.scene.add(gridHelper);

    // Origin marker
    const originGeom = new THREE.OctahedronGeometry(0.3);
    const originMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xf1c40f,
      emissiveIntensity: 0.5,
    });
    const originMesh = new THREE.Mesh(originGeom, originMat);
    originMesh.position.set(0, 1, 0);
    this.scene.add(originMesh);
    objects.push({
      mesh: originMesh,
      type: 'collectible',
      id: 'origin',
      chaosIndex: 0,
    });

    return objects;
  }

  private rebuildLatticeVisual(): void {
    // Clear old
    this.latticePoints.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.gridLines.forEach(l => {
      this.scene.remove(l);
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    });
    this.latticePoints = [];
    this.gridLines = [];

    const { basisV1, basisV2 } = this.state;
    const range = 4;

    // Draw lattice points
    for (let i = -range; i <= range; i++) {
      for (let j = -range; j <= range; j++) {
        const x = basisV1.x * i + basisV2.x * j;
        const z = basisV1.y * i + basisV2.y * j;

        const isOrigin = i === 0 && j === 0;
        const geometry = new THREE.SphereGeometry(isOrigin ? 0.2 : 0.1, 8, 8);
        const material = new THREE.MeshStandardMaterial({
          color: isOrigin ? 0xf1c40f : 0x8b5cf6,
          emissive: isOrigin ? 0xf1c40f : 0x8b5cf6,
          emissiveIntensity: 0.3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, 0.5, z);
        this.scene.add(mesh);
        this.latticePoints.push(mesh);
      }
    }

    // Draw basis vectors
    const drawBasisArrow = (v: THREE.Vector2, color: number) => {
      const points = [
        new THREE.Vector3(0, 0.6, 0),
        new THREE.Vector3(v.x, 0.6, v.y),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
      });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      this.gridLines.push(line);
    };

    drawBasisArrow(basisV1, 0x3498db);
    drawBasisArrow(basisV2, 0xe74c3c);
  }

  /**
   * Adjust coefficient A.
   */
  adjustA(delta: number): void {
    this.state.coeffA = Math.max(-5, Math.min(5, this.state.coeffA + delta));
    this.updateResultPosition();
  }

  /**
   * Adjust coefficient B.
   */
  adjustB(delta: number): void {
    this.state.coeffB = Math.max(-5, Math.min(5, this.state.coeffB + delta));
    this.updateResultPosition();
  }

  private updateResultPosition(): void {
    const { basisV1, basisV2, coeffA, coeffB, target } = this.state;
    const rx = basisV1.x * coeffA + basisV2.x * coeffB;
    const rz = basisV1.y * coeffA + basisV2.y * coeffB;

    this.resultMesh.position.set(rx, 1, rz);

    // Calculate distance
    const dx = rx - target.x;
    const dz = rz - target.y;
    this.state.closestDistance = Math.sqrt(dx * dx + dz * dz);

    // Check win
    if (this.state.closestDistance < this.state.threshold) {
      this.state.score += 200;
      this.state.round++;

      if (this.state.round > this.state.maxRounds) {
        this.state.isComplete = true;
      } else {
        // Next round with harder params
        const params = this.generateLatticeParams(this.state.round);
        this.state.basisV1 = params.v1;
        this.state.basisV2 = params.v2;
        this.state.target = params.target;
        this.state.coeffA = 0;
        this.state.coeffB = 0;
        this.state.threshold = Math.max(0.3, this.state.threshold - 0.05);

        this.rebuildLatticeVisual();
        this.targetMesh.position.set(params.target.x, 1, params.target.y);
      }
    }
  }

  getState(): LatticeLevelState {
    return { ...this.state };
  }

  animate(time: number): void {
    // Pulse target
    const targetScale = 1 + Math.sin(time * 3) * 0.2;
    this.targetMesh.scale.setScalar(targetScale);

    // Pulse result
    const resultScale = 1 + Math.sin(time * 4) * 0.15;
    this.resultMesh.scale.setScalar(resultScale);

    // Color result based on distance
    const resultMat = this.resultMesh.material as THREE.MeshStandardMaterial;
    if (this.state.closestDistance < this.state.threshold) {
      resultMat.color.setHex(0x2ecc71);
      resultMat.emissive.setHex(0x2ecc71);
    } else if (this.state.closestDistance < this.state.threshold * 3) {
      resultMat.color.setHex(0xf39c12);
      resultMat.emissive.setHex(0xf39c12);
    } else {
      resultMat.color.setHex(0xe74c3c);
      resultMat.emissive.setHex(0xe74c3c);
    }

    // Pulse lattice points
    this.latticePoints.forEach((point, i) => {
      point.position.y = 0.5 + Math.sin(time * 1.5 + i * 0.2) * 0.1;
    });
  }

  dispose(): void {
    this.scene.remove(this.targetMesh);
    this.targetMesh.geometry.dispose();
    (this.targetMesh.material as THREE.Material).dispose();

    this.scene.remove(this.resultMesh);
    this.resultMesh.geometry.dispose();
    (this.resultMesh.material as THREE.Material).dispose();

    this.latticePoints.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });

    this.gridLines.forEach(l => {
      this.scene.remove(l);
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    });

    this.scene.remove(this.latticeGroup);
  }
}
