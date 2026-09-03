/**
 * Hypothesis Quest 3D — Level 5: Navier-Stokes Equations
 *
 * The Navier-Stokes existence and smoothness problem:
 * Do smooth solutions always exist for the incompressible
 * Navier-Stokes equations in 3D? One of the Clay Millennium Problems.
 *
 * Gameplay: Navigate a particle through a turbulent fluid field.
 * Avoid high-vorticity zones (red vortices). The fluid becomes
 * more chaotic over time. Reach the exit portal.
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos, normalizeChaosState } from '../chaos';
import { WorldObject } from '../world';

export interface Vortex {
  position: THREE.Vector3;
  strength: number;
  radius: number;
  rotation: number;
}

export interface NavierStokesLevelState {
  playerPos: THREE.Vector3;
  vortices: Vortex[];
  isComplete: boolean;
  isValid: boolean;
  turbulence: number; // 0-1, increases over time
  timeElapsed: number;
  exitPosition: THREE.Vector3;
  collectibles: Array<{ pos: THREE.Vector3; collected: boolean }>;
  targetCollectibles: number;
}

export class NavierStokesLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private state: NavierStokesLevelState;
  private vortexMeshes: THREE.Mesh[] = [];
  private playerMesh: THREE.Mesh;
  private exitMesh: THREE.Mesh;
  private collectibleMeshes: THREE.Mesh[] = [];
  private flowLines: THREE.Line[] = [];

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);

    const exitPos = new THREE.Vector3(30, 1, -30);
    this.state = {
      playerPos: new THREE.Vector3(-30, 1, 30),
      vortices: this.generateVortices(8),
      isComplete: false,
      isValid: true,
      turbulence: 0.1,
      timeElapsed: 0,
      exitPosition: exitPos,
      collectibles: this.generateCollectibles(5),
      targetCollectibles: 5,
    };

    this.playerMesh = this.createPlayerMesh();
    this.exitMesh = this.createExitMesh(exitPos);
  }

  private generateVortices(count: number): Vortex[] {
    const vortices: Vortex[] = [];
    for (let i = 0; i < count; i++) {
      const state = stepChaos(this.chaosState, undefined, i * 77);
      const n = normalizeChaosState(state);
      vortices.push({
        position: new THREE.Vector3(
          n.normalized.nx * 25,
          0.5,
          n.normalized.ny * 25
        ),
        strength: 0.5 + Math.abs(n.normalized.nz) * 1.5,
        radius: 3 + Math.abs(n.normalized.nx) * 4,
        rotation: Math.random() * Math.PI * 2,
      });
    }
    return vortices;
  }

  private generateCollectibles(count: number): Array<{ pos: THREE.Vector3; collected: boolean }> {
    const items: Array<{ pos: THREE.Vector3; collected: boolean }> = [];
    for (let i = 0; i < count; i++) {
      const state = stepChaos(this.chaosState, undefined, i * 123 + 500);
      const n = normalizeChaosState(state);
      items.push({
        pos: new THREE.Vector3(n.normalized.nx * 20, 1, n.normalized.ny * 20),
        collected: false,
      });
    }
    return items;
  }

  private createPlayerMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xf1c40f,
      emissiveIntensity: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.state.playerPos);
    this.scene.add(mesh);
    return mesh;
  }

  private createExitMesh(pos: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.TorusGeometry(1.5, 0.3, 16, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2ecc71,
      emissive: 0x2ecc71,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);
    return mesh;
  }

  generate(): WorldObject[] {
    const objects: WorldObject[] = [];

    // Create vortex meshes
    this.state.vortices.forEach((v, i) => {
      const geometry = new THREE.TorusGeometry(v.radius, 0.2, 8, 32);
      const material = new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        emissive: 0xe74c3c,
        emissiveIntensity: 0.4 + v.strength * 0.3,
        transparent: true,
        opacity: 0.5,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(v.position);
      mesh.rotation.x = Math.PI / 2;
      this.scene.add(mesh);
      this.vortexMeshes.push(mesh);
      objects.push({
        mesh,
        type: 'obstacle',
        id: `vortex-${i}`,
        chaosIndex: i,
      });
    });

    // Create collectible pressure points
    this.state.collectibles.forEach((c, i) => {
      const geometry = new THREE.OctahedronGeometry(0.4);
      const material = new THREE.MeshStandardMaterial({
        color: 0x3498db,
        emissive: 0x3498db,
        emissiveIntensity: 0.5,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(c.pos);
      this.scene.add(mesh);
      this.collectibleMeshes.push(mesh);
      objects.push({
        mesh,
        type: 'collectible',
        id: `pressure-${i}`,
        chaosIndex: i,
      });
    });

    // Flow visualization lines
    for (let i = 0; i < 20; i++) {
      const points: THREE.Vector3[] = [];
      const startState = stepChaos(this.chaosState, undefined, i * 300);
      const sn = normalizeChaosState(startState);
      let x = sn.normalized.nx * 30;
      let z = sn.normalized.ny * 30;
      for (let j = 0; j < 30; j++) {
        points.push(new THREE.Vector3(x, 0.2, z));
        const vs = stepChaos(this.chaosState, undefined, i * 300 + j);
        const vn = normalizeChaosState(vs);
        x += vn.normalized.nx * 2;
        z += vn.normalized.ny * 2;
      }
      const curve = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.3,
      });
      const line = new THREE.Line(curve, lineMat);
      this.scene.add(line);
      this.flowLines.push(line);
    }

    return objects;
  }

  /**
   * Move player in the fluid field.
   */
  movePlayer(dx: number, dz: number): void {
    const { playerPos, vortices, turbulence } = this.state;

    // Apply fluid forces from vortices
    let fx = 0, fz = 0;
    for (const v of vortices) {
      const dxv = playerPos.x - v.position.x;
      const dzv = playerPos.z - v.position.z;
      const dist = Math.sqrt(dxv * dxv + dzv * dzv);
      if (dist < v.radius * 2 && dist > 0.1) {
        const force = v.strength * turbulence / (dist * 0.5);
        // Perpendicular to radius (swirl)
        fx += -dzv / dist * force;
        fz += dxv / dist * force;
      }
    }

    playerPos.x += dx * 0.5 + fx * 0.1;
    playerPos.z += dz * 0.5 + fz * 0.1;

    // Clamp to arena
    playerPos.x = Math.max(-35, Math.min(35, playerPos.x));
    playerPos.z = Math.max(-35, Math.min(35, playerPos.z));

    this.playerMesh.position.copy(playerPos);

    // Check vortex collision
    for (const v of vortices) {
      const dist = playerPos.distanceTo(v.position);
      if (dist < v.radius * 0.5) {
        this.state.isValid = false;
        return;
      }
    }

    // Check collectible pickup
    this.state.collectibles.forEach((c, i) => {
      if (!c.collected && playerPos.distanceTo(c.pos) < 1.5) {
        c.collected = true;
        this.collectibleMeshes[i].visible = false;
      }
    });

    // Check exit
    if (playerPos.distanceTo(this.state.exitPosition) < 2) {
      const collected = this.state.collectibles.filter(c => c.collected).length;
      if (collected >= this.state.targetCollectibles) {
        this.state.isComplete = true;
      }
    }
  }

  getState(): NavierStokesLevelState {
    return { ...this.state };
  }

  animate(time: number): void {
    this.state.timeElapsed = time;
    this.state.turbulence = Math.min(1, 0.1 + time * 0.005);

    // Rotate vortices
    this.vortexMeshes.forEach((mesh, i) => {
      mesh.rotation.z += this.state.vortices[i].strength * 0.02;
      const pulse = 1 + Math.sin(time * 2 + i) * 0.15;
      mesh.scale.setScalar(pulse);
    });

    // Pulse player
    const playerScale = 1 + Math.sin(time * 4) * 0.1;
    this.playerMesh.scale.setScalar(playerScale);

    // Rotate exit
    this.exitMesh.rotation.y += 0.02;

    // Animate flow lines opacity based on turbulence
    this.flowLines.forEach(line => {
      (line.material as THREE.LineBasicMaterial).opacity = 0.1 + this.state.turbulence * 0.4;
    });
  }

  dispose(): void {
    this.scene.remove(this.playerMesh);
    this.playerMesh.geometry.dispose();
    (this.playerMesh.material as THREE.Material).dispose();

    this.scene.remove(this.exitMesh);
    this.exitMesh.geometry.dispose();
    (this.exitMesh.material as THREE.Material).dispose();

    this.vortexMeshes.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });

    this.collectibleMeshes.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });

    this.flowLines.forEach(l => {
      this.scene.remove(l);
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    });
  }
}
