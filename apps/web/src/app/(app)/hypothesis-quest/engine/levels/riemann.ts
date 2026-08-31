/**
 * Hypothesis Quest 3D — Level 3: Riemann Hypothesis
 * 
 * The Riemann hypothesis states that all non-trivial zeros
 * of the Riemann zeta function have real part 1/2.
 * 
 * Gameplay: Navigate a 3D complex plane landscape.
 * Place "zeros" on the critical line (Re = 0.5).
 * Chaos state shifts the landscape and creates obstacles.
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos, normalizeChaosState } from '../chaos';
import { WorldObject } from '../world';

export interface RiemannLevelState {
  placedZeros: Array<{ real: number; imag: number }>;
  isComplete: boolean;
  isValid: boolean;
  score: number;
  targetZeros: number;
  cursorPosition: { x: number; y: number };
}

// Known non-trivial zeros (first 10)
const KNOWN_ZEROS = [
  { real: 0.5, imag: 14.1347 },
  { real: 0.5, imag: 21.0220 },
  { real: 0.5, imag: 25.0109 },
  { real: 0.5, imag: 30.4249 },
  { real: 0.5, imag: 32.9351 },
  { real: 0.5, imag: 37.5862 },
  { real: 0.5, imag: 40.9187 },
  { real: 0.5, imag: 43.3271 },
  { real: 0.5, imag: 48.0052 },
  { real: 0.5, imag: 49.7738 },
];

export class RiemannLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private state: RiemannLevelState;
  private complexPlane: THREE.Mesh;
  private criticalLine: THREE.Mesh;
  private zeroMarkers: THREE.Mesh[] = [];
  private cursorMesh: THREE.Mesh;

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);
    this.state = {
      placedZeros: [],
      isComplete: false,
      isValid: true,
      score: 0,
      targetZeros: 5,
      cursorPosition: { x: 0.5, y: 15 },
    };

    // Create complex plane
    this.complexPlane = this.createComplexPlane();
    this.criticalLine = this.createCriticalLine();
    this.cursorMesh = this.createCursor();
  }

  /**
   * Create the complex plane landscape.
   */
  private createComplexPlane(): THREE.Mesh {
    const width = 2;
    const height = 60;
    const segments = 128;

    const geometry = new THREE.PlaneGeometry(width, height, segments, segments * 3);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position;
    const colors = new Float32Array(vertices.count * 3);

    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const z = vertices.getZ(i);
      
      // Height based on zeta function approximation
      const realPart = x + 1; // Map to [0, 2]
      const imagPart = z + 30; // Map to [0, 60]
      
      // Simplified |ζ(s)| visualization
      const height = this.approximateZetaMagnitude(realPart, imagPart);
      vertices.setY(i, height * 2);
      
      // Color: critical line glows purple
      const distToCritical = Math.abs(x);
      const intensity = Math.exp(-distToCritical * 10);
      
      colors[i * 3] = 0.05 + intensity * 0.5;     // R
      colors[i * 3 + 1] = 0.05 + intensity * 0.2;  // G
      colors[i * 3 + 2] = 0.07 + intensity * 0.8;  // B
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = 0;
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * Approximate |ζ(s)| for visualization.
   */
  private approximateZetaMagnitude(real: number, imag: number): number {
    // Very simplified approximation
    // Real behavior: oscillates with increasing frequency
    const oscillation = Math.sin(imag * 0.5) * Math.cos(imag * 0.3);
    const decay = Math.exp(-Math.abs(real - 0.5) * 2);
    return oscillation * decay + 0.5;
  }

  /**
   * Create the critical line (Re = 0.5).
   */
  private createCriticalLine(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(0.1, 60);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.6,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = 0; // x=0 maps to Re=0.5
    mesh.position.y = 0.5;
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * Create the player cursor.
   */
  private createCursor(): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(0.3, 0.8, 8);
    geometry.rotateX(Math.PI);

    const material = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xf1c40f,
      emissiveIntensity: 0.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 1, 15);
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * Generate the Riemann level layout.
   */
  generate(): WorldObject[] {
    const objects: WorldObject[] = [];
    
    // Add known zeros as markers
    KNOWN_ZEROS.slice(0, this.state.targetZeros).forEach((zero, i) => {
      const marker = this.createZeroMarker(zero.real, zero.imag, i);
      this.zeroMarkers.push(marker);
      objects.push({
        mesh: marker,
        type: 'collectible',
        id: `zero-${i}`,
        chaosIndex: i,
      });
    });
    
    return objects;
  }

  /**
   * Create a zero marker.
   */
  private createZeroMarker(real: number, imag: number, index: number): THREE.Mesh {
    const geometry = new THREE.OctahedronGeometry(0.3);
    const material = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      emissive: 0xe74c3c,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // Map complex coordinates to 3D
    const x = (real - 0.5) * 10; // Center at 0.5
    const z = imag - 30; // Center around 30
    mesh.position.set(x, 2, z);
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * Move cursor in the complex plane.
   */
  moveCursor(dx: number, dy: number): void {
    this.state.cursorPosition.x += dx * 0.01;
    this.state.cursorPosition.y += dy * 0.5;
    
    // Clamp
    this.state.cursorPosition.x = Math.max(0, Math.min(1, this.state.cursorPosition.x));
    this.state.cursorPosition.y = Math.max(10, Math.min(50, this.state.cursorPosition.y));
    
    // Update cursor mesh position
    const x = (this.state.cursorPosition.x - 0.5) * 10;
    const z = this.state.cursorPosition.y - 30;
    this.cursorMesh.position.set(x, 2, z);
  }

  /**
   * Try to place a zero at current cursor position.
   */
  placeZero(): boolean {
    const { real, imag } = {
      real: this.state.cursorPosition.x,
      imag: this.state.cursorPosition.y,
    };
    
    // Check if close to a known zero
    const tolerance = 0.1;
    const isOnCriticalLine = Math.abs(real - 0.5) < tolerance;
    
    if (!isOnCriticalLine) {
      this.state.isValid = false;
      return false;
    }
    
    // Check if close to any known zero
    for (const zero of KNOWN_ZEROS) {
      const dist = Math.sqrt(
        Math.pow(real - zero.real, 2) + 
        Math.pow(imag - zero.imag, 2)
      );
      
      if (dist < 2) { // Close enough to count
        this.state.placedZeros.push({ real, imag });
        this.state.score += 100;
        
        // Visual feedback
        this.highlightZero(zero.imag);
        
        if (this.state.placedZeros.length >= this.state.targetZeros) {
          this.state.isComplete = true;
        }
        
        return true;
      }
    }
    
    // Not close to any known zero
    this.state.score = Math.max(0, this.state.score - 25);
    return false;
  }

  /**
   * Highlight a placed zero.
   */
  private highlightZero(imag: number): void {
    const marker = this.zeroMarkers.find(m => {
      const z = m.position.z + 30;
      return Math.abs(z - imag) < 2;
    });
    
    if (marker) {
      (marker.material as THREE.MeshStandardMaterial).color.setHex(0xf1c40f);
      (marker.material as THREE.MeshStandardMaterial).emissive.setHex(0xf1c40f);
    }
  }

  /**
   * Get current level state.
   */
  getState(): RiemannLevelState {
    return { ...this.state };
  }

  /**
   * Animate level objects.
   */
  animate(time: number): void {
    // Pulse cursor
    const scale = 1 + Math.sin(time * 4) * 0.2;
    this.cursorMesh.scale.setScalar(scale);
    
    // Rotate zero markers
    this.zeroMarkers.forEach((marker, i) => {
      marker.rotation.y += 0.02;
      marker.position.y = 2 + Math.sin(time * 2 + i) * 0.3;
    });
    
    // Animate critical line
    (this.criticalLine.material as THREE.MeshStandardMaterial).emissiveIntensity = 
      0.5 + Math.sin(time * 3) * 0.3;
  }

  /**
   * Clean up level resources.
   */
  dispose(): void {
    this.scene.remove(this.complexPlane);
    this.complexPlane.geometry.dispose();
    (this.complexPlane.material as THREE.Material).dispose();
    
    this.scene.remove(this.criticalLine);
    this.criticalLine.geometry.dispose();
    (this.criticalLine.material as THREE.Material).dispose();
    
    this.scene.remove(this.cursorMesh);
    this.cursorMesh.geometry.dispose();
    (this.cursorMesh.material as THREE.Material).dispose();
    
    this.zeroMarkers.forEach(marker => {
      this.scene.remove(marker);
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
    });
  }
}
