/**
 * Hypothesis Quest 3D — Level 9: Protein Folding
 *
 * The protein folding problem: how does a linear chain of amino acids
 * fold into its functional 3D structure? AlphaFold can predict structures,
 * but the physical folding process itself is not fully understood.
 *
 * Gameplay: Player controls a chain of amino acid segments (Snake-like).
 * Must rotate segments to match a target shape. Each rotation consumes
 * energy. If energy runs out, folding fails.
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos, normalizeChaosState } from '../chaos';
import { WorldObject } from '../world';

export interface AminoSegment {
  position: THREE.Vector3;
  rotation: number; // 0, 90, 180, 270
  targetRotation: number;
  color: number;
  mesh?: THREE.Mesh;
}

export interface ProteinFoldingLevelState {
  segments: AminoSegment[];
  selectedSegment: number;
  energy: number;
  maxEnergy: number;
  isComplete: boolean;
  isValid: boolean;
  alignedCount: number;
  targetAligned: number;
  score: number;
}

const SEGMENT_COLORS = [0x8b5cf6, 0x3498db, 0x2ecc71, 0xe74c3c, 0xf39c12];

export class ProteinFoldingLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private state: ProteinFoldingLevelState;
  private segmentMeshes: THREE.Mesh[] = [];
  private targetMeshes: THREE.Mesh[] = [];
  private selectionRing: THREE.Mesh;

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);

    const segments = this.generateSegments();
    this.state = {
      segments,
      selectedSegment: 0,
      energy: 100,
      maxEnergy: 100,
      isComplete: false,
      isValid: true,
      alignedCount: 0,
      targetAligned: segments.length,
      score: 0,
    };

    this.selectionRing = this.createSelectionRing();
  }

  private generateSegments(): AminoSegment[] {
    const count = 5;
    const segments: AminoSegment[] = [];

    for (let i = 0; i < count; i++) {
      const state = stepChaos(this.chaosState, undefined, i * 43);
      const n = normalizeChaosState(state);
      const targetRot = Math.floor(Math.abs(n.normalized.nz) * 4) * 90;

      segments.push({
        position: new THREE.Vector3(i * 2.5 - (count * 2.5) / 2, 2, 0),
        rotation: 0,
        targetRotation: targetRot,
        color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      });
    }
    return segments;
  }

  private createSelectionRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(1.2, 1.5, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xf1c40f,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 4;
    this.scene.add(mesh);
    return mesh;
  }

  generate(): WorldObject[] {
    const objects: WorldObject[] = [];

    // Create segment meshes
    this.state.segments.forEach((seg, i) => {
      const mesh = this.createSegmentMesh(seg, i);
      this.segmentMeshes.push(mesh);
      seg.mesh = mesh;
      objects.push({
        mesh,
        type: 'collectible',
        id: `segment-${i}`,
        chaosIndex: i,
      });
    });

    // Create target (ghost) shapes
    this.state.segments.forEach((seg, i) => {
      const mesh = this.createTargetMesh(seg, i);
      this.targetMeshes.push(mesh);
    });

    // Ground grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x1a1a2e, 0x111115);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);

    return objects;
  }

  private createSegmentMesh(seg: AminoSegment, index: number): THREE.Mesh {
    const group = new THREE.Group();

    // Main segment
    const bodyGeom = new THREE.CapsuleGeometry(0.5, 1.5, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: seg.color,
      emissive: seg.color,
      emissiveIntensity: 0.3,
      roughness: 0.5,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(body);

    // Bond connector
    if (index > 0) {
      const bondGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
      const bondMat = new THREE.MeshStandardMaterial({
        color: 0x26263a,
        emissive: 0x26263a,
        emissiveIntensity: 0.1,
      });
      const bond = new THREE.Mesh(bondGeom, bondMat);
      bond.rotation.z = Math.PI / 2;
      bond.position.x = -1.5;
      group.add(bond);
    }

    group.position.copy(seg.position);
    group.rotation.z = THREE.MathUtils.degToRad(seg.rotation);
    this.scene.add(group);
    return group as unknown as THREE.Mesh;
  }

  private createTargetMesh(seg: AminoSegment, index: number): THREE.Mesh {
    const geometry = new THREE.CapsuleGeometry(0.5, 1.5, 8, 16);
    const material = new THREE.MeshStandardMaterial({
      color: seg.color,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(seg.position);
    mesh.position.z += 5; // Offset target behind
    mesh.rotation.z = THREE.MathUtils.degToRad(seg.targetRotation);
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * Select a segment (cycle through with arrow keys).
   */
  selectSegment(direction: 'left' | 'right'): void {
    const len = this.state.segments.length;
    if (direction === 'right') {
      this.state.selectedSegment = (this.state.selectedSegment + 1) % len;
    } else {
      this.state.selectedSegment = (this.state.selectedSegment - 1 + len) % len;
    }
    this.updateSelectionRing();
  }

  /**
   * Rotate the selected segment 90 degrees.
   */
  rotateSegment(clockwise: boolean): boolean {
    if (this.state.energy <= 0) return false;

    const seg = this.state.segments[this.state.selectedSegment];
    seg.rotation = (seg.rotation + (clockwise ? 90 : -90) + 360) % 360;
    this.state.energy -= 10;
    this.state.score += 5;

    // Update mesh
    if (seg.mesh) {
      (seg.mesh as unknown as THREE.Group).rotation.z = THREE.MathUtils.degToRad(seg.rotation);
    }

    // Check alignment
    this.checkAlignment();
    return true;
  }

  private checkAlignment(): void {
    let aligned = 0;
    this.state.segments.forEach(seg => {
      if (seg.rotation === seg.targetRotation) aligned++;
    });
    this.state.alignedCount = aligned;

    if (aligned >= this.state.targetAligned) {
      this.state.isComplete = true;
    }
  }

  private updateSelectionRing(): void {
    const seg = this.state.segments[this.state.selectedSegment];
    this.selectionRing.position.x = seg.position.x;
  }

  getState(): ProteinFoldingLevelState {
    return { ...this.state };
  }

  animate(time: number): void {
    // Pulse selection ring
    const ringScale = 1 + Math.sin(time * 4) * 0.1;
    this.selectionRing.scale.setScalar(ringScale);
    this.selectionRing.rotation.z += 0.02;

    // Pulse aligned segments
    this.segmentMeshes.forEach((mesh, i) => {
      const seg = this.state.segments[i];
      if (seg.rotation === seg.targetRotation) {
        const s = 1.1 + Math.sin(time * 3 + i) * 0.1;
        mesh.scale.setScalar(s);
      } else {
        mesh.scale.setScalar(1);
      }
    });

    // Pulse target shapes
    this.targetMeshes.forEach((mesh, i) => {
      mesh.rotation.y += 0.01;
      const opacity = 0.1 + Math.sin(time * 2 + i) * 0.05;
      (mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
    });
  }

  dispose(): void {
    this.scene.remove(this.selectionRing);
    this.selectionRing.geometry.dispose();
    (this.selectionRing.material as THREE.Material).dispose();

    this.segmentMeshes.forEach(m => {
      this.scene.remove(m);
      if (m instanceof THREE.Group) {
        m.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      }
    });

    this.targetMeshes.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  }
}
