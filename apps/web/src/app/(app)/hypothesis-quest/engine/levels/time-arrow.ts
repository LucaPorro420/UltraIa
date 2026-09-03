/**
 * Hypothesis Quest 3D — Level 8: Arrow of Time
 *
 * The arrow of time problem: why does time flow in one direction?
 * Microscopic physics is time-reversible, but macroscopic processes
 * are irreversible (entropy increases). This is the second law of
 * thermodynamics, but the fundamental reason remains mysterious.
 *
 * Gameplay: Player controls a character in a world where time
 * periodically reverses. Must collect entropy fragments that appear
 * in different time modes. Some objects only exist in normal time,
 * others only in reversed time.
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos, normalizeChaosState } from '../chaos';
import { WorldObject } from '../world';

export interface TimeFragment {
  position: THREE.Vector3;
  mode: 'normal' | 'reversed';
  collected: boolean;
  mesh?: THREE.Mesh;
}

export interface TimeArrowLevelState {
  playerPos: THREE.Vector3;
  timeReversed: boolean;
  reverseCooldown: number;
  reverseDuration: number;
  maxReverseDuration: number;
  fragments: TimeFragment[];
  collectedCount: number;
  targetFragments: number;
  isComplete: boolean;
  isValid: boolean;
  platforms: Array<{
    pos: THREE.Vector3;
    size: THREE.Vector3;
    movesInReverse: boolean;
    velocity: THREE.Vector3;
    mesh?: THREE.Mesh;
  }>;
}

export class TimeArrowLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private state: TimeArrowLevelState;
  private playerMesh: THREE.Mesh;
  private timeIndicator: THREE.Mesh;
  private platformMeshes: THREE.Mesh[] = [];
  private fragmentMeshes: THREE.Mesh[] = [];
  private reverseOverlay: THREE.Mesh;

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);

    const fragments = this.generateFragments();
    const platforms = this.generatePlatforms();

    this.state = {
      playerPos: new THREE.Vector3(-15, 2, 0),
      timeReversed: false,
      reverseCooldown: 0,
      reverseDuration: 0,
      maxReverseDuration: 120, // frames
      fragments,
      collectedCount: 0,
      targetFragments: 3,
      isComplete: false,
      isValid: true,
      platforms,
    };

    this.playerMesh = this.createPlayerMesh();
    this.timeIndicator = this.createTimeIndicator();
    this.reverseOverlay = this.createReverseOverlay();
  }

  private generateFragments(): TimeFragment[] {
    const fragments: TimeFragment[] = [];
    const modes: Array<'normal' | 'reversed'> = ['normal', 'reversed', 'normal'];
    for (let i = 0; i < 3; i++) {
      const state = stepChaos(this.chaosState, undefined, i * 89);
      const n = normalizeChaosState(state);
      fragments.push({
        position: new THREE.Vector3(
          n.normalized.nx * 20,
          2,
          n.normalized.ny * 15
        ),
        mode: modes[i],
        collected: false,
      });
    }
    return fragments;
  }

  private generatePlatforms(): TimeArrowLevelState['platforms'] {
    const platforms: TimeArrowLevelState['platforms'] = [];
    for (let i = 0; i < 8; i++) {
      const state = stepChaos(this.chaosState, undefined, i * 67 + 200);
      const n = normalizeChaosState(state);
      platforms.push({
        pos: new THREE.Vector3(n.normalized.nx * 25, 0.5, n.normalized.ny * 20),
        size: new THREE.Vector3(3 + Math.abs(n.normalized.nz) * 2, 0.5, 2),
        movesInReverse: i % 2 === 0,
        velocity: new THREE.Vector3(
          (Math.random() > 0.5 ? 1 : -1) * 0.02,
          0,
          0
        ),
      });
    }
    return platforms;
  }

  private createPlayerMesh(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xf1c40f,
      emissiveIntensity: 0.4,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.state.playerPos);
    this.scene.add(mesh);
    return mesh;
  }

  private createTimeIndicator(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(0.5, 0.8, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3498db,
      emissive: 0x3498db,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 8, 0);
    mesh.rotation.x = -Math.PI / 2;
    this.scene.add(mesh);
    return mesh;
  }

  private createReverseOverlay(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshBasicMaterial({
      color: 0xe74c3c,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 10;
    mesh.rotation.x = -Math.PI / 2;
    this.scene.add(mesh);
    return mesh;
  }

  generate(): WorldObject[] {
    const objects: WorldObject[] = [];

    // Platforms
    this.state.platforms.forEach((p, i) => {
      const geometry = new THREE.BoxGeometry(p.size.x, p.size.y, p.size.z);
      const material = new THREE.MeshStandardMaterial({
        color: p.movesInReverse ? 0xe74c3c : 0x3498db,
        roughness: 0.7,
        transparent: true,
        opacity: 0.7,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(p.pos);
      this.scene.add(mesh);
      p.mesh = mesh;
      this.platformMeshes.push(mesh);
      objects.push({
        mesh,
        type: 'obstacle',
        id: `platform-${i}`,
        chaosIndex: i,
      });
    });

    // Fragments
    this.state.fragments.forEach((f, i) => {
      const geometry = new THREE.OctahedronGeometry(0.5);
      const material = new THREE.MeshStandardMaterial({
        color: f.mode === 'normal' ? 0x3498db : 0xe74c3c,
        emissive: f.mode === 'normal' ? 0x3498db : 0xe74c3c,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(f.position);
      this.scene.add(mesh);
      f.mesh = mesh;
      this.fragmentMeshes.push(mesh);
      objects.push({
        mesh,
        type: 'collectible',
        id: `fragment-${i}`,
        chaosIndex: i,
      });
    });

    // Ground
    const groundGeom = new THREE.PlaneGeometry(60, 50);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    this.scene.add(ground);

    return objects;
  }

  /**
   * Toggle time reversal.
   */
  toggleReverse(): void {
    if (this.state.reverseCooldown > 0) return;
    if (this.state.reverseDuration >= this.state.maxReverseDuration) return;

    this.state.timeReversed = !this.state.timeReversed;
    if (this.state.timeReversed) {
      this.state.reverseDuration = this.state.maxReverseDuration;
    }
  }

  /**
   * Move player.
   */
  movePlayer(dx: number, dz: number): void {
    const speed = this.state.timeReversed ? -0.4 : 0.4;
    this.state.playerPos.x += dx * speed;
    this.state.playerPos.z += dz * speed;

    // Gravity
    this.state.playerPos.y = Math.max(1, this.state.playerPos.y);

    // Clamp
    this.state.playerPos.x = Math.max(-25, Math.min(25, this.state.playerPos.x));
    this.state.playerPos.z = Math.max(-20, Math.min(20, this.state.playerPos.z));

    this.playerMesh.position.copy(this.state.playerPos);

    // Check fragment collection
    this.state.fragments.forEach((f, i) => {
      if (!f.collected && this.state.playerPos.distanceTo(f.position) < 1.5) {
        if (f.mode === (this.state.timeReversed ? 'reversed' : 'normal')) {
          f.collected = true;
          this.state.collectedCount++;
          this.fragmentMeshes[i].visible = false;

          if (this.state.collectedCount >= this.state.targetFragments) {
            this.state.isComplete = true;
          }
        }
      }
    });
  }

  getState(): TimeArrowLevelState {
    return { ...this.state };
  }

  animate(time: number): void {
    // Update time reverse state
    if (this.state.timeReversed) {
      this.state.reverseDuration--;
      if (this.state.reverseDuration <= 0) {
        this.state.timeReversed = false;
        this.state.reverseCooldown = 60;
      }
    }
    if (this.state.reverseCooldown > 0) {
      this.state.reverseCooldown--;
    }

    // Reverse overlay
    const targetOpacity = this.state.timeReversed ? 0.15 : 0;
    const overlayMat = this.reverseOverlay.material as THREE.MeshBasicMaterial;
    overlayMat.opacity += (targetOpacity - overlayMat.opacity) * 0.1;

    // Time indicator rotation direction
    const rotSpeed = this.state.timeReversed ? -0.03 : 0.03;
    this.timeIndicator.rotation.z += rotSpeed;

    // Move platforms
    this.state.platforms.forEach((p, i) => {
      if (p.movesInReverse === this.state.timeReversed) {
        p.pos.x += p.velocity.x;
        if (Math.abs(p.pos.x) > 25) p.velocity.x *= -1;
      }
      if (p.mesh) {
        p.mesh.position.x = p.pos.x;
      }
    });

    // Pulse fragments
    this.fragmentMeshes.forEach((mesh, i) => {
      if (!this.state.fragments[i].collected) {
        mesh.rotation.y += 0.02;
        mesh.position.y = this.state.fragments[i].position.y + Math.sin(time * 2 + i) * 0.3;
      }
    });

    // Player pulse
    const playerScale = 1 + Math.sin(time * 3) * 0.05;
    this.playerMesh.scale.setScalar(playerScale);
  }

  dispose(): void {
    this.scene.remove(this.playerMesh);
    this.playerMesh.geometry.dispose();
    (this.playerMesh.material as THREE.Material).dispose();

    this.scene.remove(this.timeIndicator);
    this.timeIndicator.geometry.dispose();
    (this.timeIndicator.material as THREE.Material).dispose();

    this.scene.remove(this.reverseOverlay);
    this.reverseOverlay.geometry.dispose();
    (this.reverseOverlay.material as THREE.Material).dispose();

    this.platformMeshes.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });

    this.fragmentMeshes.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  }
}
