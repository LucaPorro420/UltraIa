/**
 * Hypothesis Quest 3D — Level 6: Consciousness (Hard Problem)
 *
 * The "hard problem" of consciousness: how does subjective experience
 * emerge from physical brain processes? Why is there "something it is
 * like" to be conscious?
 *
 * Gameplay: Connect brain region nodes to form an integrated conscious
 * network. Each region has a function (sensory, memory, emotion, etc.).
 * Player must activate regions in the correct order to create
 * integrated experience. A logic/connection puzzle in 3D space.
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos, normalizeChaosState } from '../chaos';
import { WorldObject } from '../world';

export type BrainRegionType = 'sensory' | 'memory' | 'emotion' | 'reasoning' | 'motor' | 'language';

export interface BrainRegion {
  type: BrainRegionType;
  position: THREE.Vector3;
  label: string;
  isActive: boolean;
  connections: number[];
}

export interface ConsciousnessLevelState {
  regions: BrainRegion[];
  activatedOrder: number[];
  isComplete: boolean;
  isValid: boolean;
  requiredSequence: number[];
  currentStep: number;
  integrationLevel: number; // 0-1
  score: number;
}

const REGION_CONFIGS: Array<{ type: BrainRegionType; label: string; emoji: string }> = [
  { type: 'sensory', label: 'Sensory Cortex', emoji: '👁' },
  { type: 'memory', label: 'Hippocampus', emoji: '🧠' },
  { type: 'emotion', label: 'Amygdala', emoji: '❤' },
  { type: 'reasoning', label: 'Prefrontal Cortex', emoji: '⚡' },
  { type: 'motor', label: 'Motor Cortex', emoji: '🏃' },
  { type: 'language', label: 'Broca\'s Area', emoji: '💬' },
];

export class ConsciousnessLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private state: ConsciousnessLevelState;
  private regionMeshes: THREE.Mesh[] = [];
  private connectionLines: THREE.Line[] = [];
  private glowLights: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);

    const regions = this.generateRegions();
    const requiredSequence = this.generateSequence(regions.length);

    this.state = {
      regions,
      activatedOrder: [],
      isComplete: false,
      isValid: true,
      requiredSequence,
      currentStep: 0,
      integrationLevel: 0,
      score: 0,
    };
  }

  private generateRegions(): BrainRegion[] {
    const regions: BrainRegion[] = [];
    const angleStep = (Math.PI * 2) / REGION_CONFIGS.length;

    REGION_CONFIGS.forEach((config, i) => {
      const state = stepChaos(this.chaosState, undefined, i * 55);
      const n = normalizeChaosState(state);
      const angle = angleStep * i;
      const radius = 8 + Math.abs(n.normalized.nz) * 3;

      regions.push({
        type: config.type,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          1 + Math.abs(n.normalized.nx) * 2,
          Math.sin(angle) * radius
        ),
        label: config.label,
        isActive: false,
        connections: [],
      });
    });

    // Generate connections (each region connects to 2-3 others)
    regions.forEach((region, i) => {
      const connCount = 2 + Math.floor(Math.abs(stepChaos(this.chaosState, undefined, i * 99).x) % 2);
      for (let c = 0; c < connCount; c++) {
        const target = (i + c + 1) % regions.length;
        if (!region.connections.includes(target)) {
          region.connections.push(target);
        }
      }
    });

    return regions;
  }

  private generateSequence(length: number): number[] {
    const seq: number[] = [];
    const available = Array.from({ length }, (_, i) => i);
    for (let i = length - 1; i > 0; i--) {
      const state = stepChaos(this.chaosState, undefined, i * 41);
      const idx = Math.floor(Math.abs(state.x) % (i + 1));
      seq.push(available[idx]);
      available.splice(idx, 1);
    }
    seq.push(available[0]);
    return seq;
  }

  generate(): WorldObject[] {
    const objects: WorldObject[] = [];

    // Create region meshes
    this.state.regions.forEach((region, i) => {
      const geometry = new THREE.IcosahedronGeometry(1.2, 1);
      const material = new THREE.MeshStandardMaterial({
        color: 0x26263a,
        emissive: 0x26263a,
        emissiveIntensity: 0.2,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(region.position);
      this.scene.add(mesh);
      this.regionMeshes.push(mesh);

      // Label
      const label = this.createRegionLabel(region.label, i);
      label.position.copy(region.position);
      label.position.y += 2;
      this.scene.add(label);

      // Glow light
      const light = new THREE.PointLight(0x8b5cf6, 0.2, 5);
      light.position.copy(region.position);
      this.scene.add(light);
      this.glowLights.push(light);

      objects.push({
        mesh,
        type: 'collectible',
        id: `region-${i}`,
        chaosIndex: i,
      });
    });

    // Create connection lines
    this.state.regions.forEach((region, i) => {
      region.connections.forEach(targetIdx => {
        if (targetIdx > i) {
          const target = this.state.regions[targetIdx];
          const points = [region.position.clone(), target.position.clone()];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: 0x1a1a2e,
            transparent: true,
            opacity: 0.3,
          });
          const line = new THREE.Line(geometry, material);
          this.scene.add(line);
          this.connectionLines.push(line);
        }
      });
    });

    return objects;
  }

  private createRegionLabel(text: string, index: number): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#111115';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();

    ctx.fillStyle = '#e7e7ee';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(2, 0.5);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Activate a brain region.
   * Must follow the required sequence for full consciousness integration.
   */
  activateRegion(index: number): boolean {
    if (index < 0 || index >= this.state.regions.length) return false;
    if (this.state.regions[index].isActive) return false;

    const expectedIndex = this.state.requiredSequence[this.state.currentStep];

    if (index === expectedIndex) {
      // Correct sequence
      this.state.regions[index].isActive = true;
      this.state.activatedOrder.push(index);
      this.state.currentStep++;
      this.state.integrationLevel = this.state.currentStep / this.state.regions.length;
      this.state.score += 100;

      // Visual feedback
      this.activateRegionVisual(index);

      if (this.state.currentStep >= this.state.regions.length) {
        this.state.isComplete = true;
      }

      return true;
    } else {
      // Wrong order — integration drops
      this.state.integrationLevel = Math.max(0, this.state.integrationLevel - 0.2);
      this.state.score = Math.max(0, this.state.score - 50);
      this.state.isValid = this.state.integrationLevel > 0;
      return false;
    }
  }

  private activateRegionVisual(index: number): void {
    const mesh = this.regionMeshes[index];
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(0x8b5cf6);
    mat.emissive.setHex(0x8b5cf6);
    mat.emissiveIntensity = 0.8;
    mat.wireframe = false;

    const light = this.glowLights[index];
    light.color.setHex(0x8b5cf6);
    light.intensity = 1;
  }

  getState(): ConsciousnessLevelState {
    return { ...this.state };
  }

  animate(time: number): void {
    // Pulse inactive regions
    this.regionMeshes.forEach((mesh, i) => {
      if (!this.state.regions[i].isActive) {
        const scale = 1 + Math.sin(time * 2 + i * 0.7) * 0.1;
        mesh.scale.setScalar(scale);
        mesh.rotation.y += 0.01;
      } else {
        // Active regions glow
        const scale = 1.2 + Math.sin(time * 3 + i) * 0.1;
        mesh.scale.setScalar(scale);
      }
    });

    // Pulse connection lines for active connections
    this.connectionLines.forEach((line, i) => {
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = 0.2 + Math.sin(time * 2 + i * 0.3) * 0.1;
    });
  }

  dispose(): void {
    this.regionMeshes.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.connectionLines.forEach(l => {
      this.scene.remove(l);
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    });
    this.glowLights.forEach(l => {
      this.scene.remove(l);
    });
  }
}
