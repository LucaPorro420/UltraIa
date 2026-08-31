/**
 * Hypothesis Quest 3D — Level 2: Goldbach Conjecture
 * 
 * Goldbach's conjecture: every even integer greater than 2
 * can be expressed as the sum of two primes.
 * 
 * Gameplay: Player navigates a field of glowing prime orbs.
 * Must touch two primes that sum to a target even number.
 * Chaos state determines which primes are visible.
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos, normalizeChaosState } from '../chaos';
import { WorldObject } from '../world';

export interface GoldbachLevelState {
  targetNumber: number;
  selectedPrimes: number[];
  isComplete: boolean;
  isValid: boolean;
  attempts: number;
  maxAttempts: number;
  foundPairs: Array<[number, number]>;
}

export class GoldbachLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private primeOrbs: Map<number, THREE.Mesh> = new Map();
  private primeLights: Map<number, THREE.PointLight> = new Map();
  private state: GoldbachLevelState;
  private allPrimes: number[] = [];
  private visiblePrimes: number[] = [];

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);
    this.state = {
      targetNumber: this.generateTarget(),
      selectedPrimes: [],
      isComplete: false,
      isValid: true,
      attempts: 0,
      maxAttempts: 10,
      foundPairs: [],
    };
    this.allPrimes = this.sievePrimes(100);
  }

  /**
   * Sieve of Eratosthenes to generate primes.
   */
  private sievePrimes(limit: number): number[] {
    const sieve = new Array(limit + 1).fill(true);
    sieve[0] = sieve[1] = false;
    
    for (let i = 2; i * i <= limit; i++) {
      if (sieve[i]) {
        for (let j = i * i; j <= limit; j += i) {
          sieve[j] = false;
        }
      }
    }
    
    return sieve.map((isPrime, i) => isPrime ? i : -1).filter(i => i > 0);
  }

  /**
   * Generate target even number using chaos.
   */
  private generateTarget(): number {
    const state = stepChaos(this.chaosState, undefined, 100);
    const normalized = Math.abs(state.x) % 50;
    return Math.floor(normalized) * 2 + 4; // Ensure even and >= 4
  }

  /**
   * Generate the Goldbach level layout.
   */
  generate(): WorldObject[] {
    const objects: WorldObject[] = [];
    
    // Determine which primes are visible based on chaos
    this.visiblePrimes = this.allPrimes.filter(prime => {
      const state = stepChaos(this.chaosState, undefined, prime * 10);
      const normalized = normalizeChaosState(state);
      return Math.abs(normalized.normalized.nz) > 0.3; // ~70% visible
    });
    
    // Create orbs for visible primes
    this.visiblePrimes.forEach((prime, i) => {
      const orb = this.createPrimeOrb(prime, i);
      this.primeOrbs.set(prime, orb.mesh);
      this.primeLights.set(prime, orb.light);
      objects.push(orb.worldObject);
    });
    
    return objects;
  }

  /**
   * Create a glowing prime orb.
   */
  private createPrimeOrb(
    prime: number, 
    index: number
  ): { mesh: THREE.Mesh; light: THREE.PointLight; worldObject: WorldObject } {
    // Position in a spiral
    const angle = index * 0.5;
    const radius = 5 + index * 0.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 2 + Math.sin(index * 0.3) * 2;

    // Orb mesh
    const geometry = new THREE.SphereGeometry(0.6, 16, 16);
    const color = new THREE.Color().setHSL(0.75, 0.8, 0.5); // Purple
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    // Number label
    const label = this.createNumberLabel(prime);
    label.position.copy(mesh.position);
    label.position.y += 1.2;
    this.scene.add(label);

    // Glow light
    const light = new THREE.PointLight(0x8b5cf6, 0.4, 5);
    light.position.copy(mesh.position);
    this.scene.add(light);

    const worldObject: WorldObject = {
      mesh,
      type: 'collectible',
      id: `prime-${prime}`,
      chaosIndex: index,
    };

    return { mesh, light, worldObject };
  }

  /**
   * Create a floating number label.
   */
  private createNumberLabel(number: number): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#111115';
    ctx.roundRect(0, 0, 128, 64, 8);
    ctx.fill();
    
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(1, 0.5);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Handle player selecting a prime.
   */
  selectPrime(prime: number): boolean {
    if (!this.visiblePrimes.includes(prime)) {
      return false;
    }

    this.state.selectedPrimes.push(prime);
    this.state.attempts++;

    if (this.state.selectedPrimes.length === 2) {
      const sum = this.state.selectedPrimes[0] + this.state.selectedPrimes[1];
      
      if (sum === this.state.targetNumber) {
        this.state.foundPairs.push([
          this.state.selectedPrimes[0],
          this.state.selectedPrimes[1]
        ]);
        this.state.isComplete = true;
        this.state.isValid = true;
        
        // Highlight successful orbs
        this.highlightOrbs(this.state.selectedPrimes, 0xf1c40f);
        return true;
      } else {
        this.state.isValid = false;
        this.state.selectedPrimes = [];
        
        if (this.state.attempts >= this.state.maxAttempts) {
          // Game over
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Highlight selected orbs.
   */
  private highlightOrbs(primes: number[], color: number): void {
    primes.forEach(prime => {
      const orb = this.primeOrbs.get(prime);
      if (orb) {
        (orb.material as THREE.MeshStandardMaterial).color.setHex(color);
        (orb.material as THREE.MeshStandardMaterial).emissive.setHex(color);
      }
      const light = this.primeLights.get(prime);
      if (light) {
        light.color.setHex(color);
      }
    });
  }

  /**
   * Get available primes for selection.
   */
  getAvailablePrimes(): number[] {
    return [...this.visiblePrimes];
  }

  /**
   * Get current level state.
   */
  getState(): GoldbachLevelState {
    return { ...this.state };
  }

  /**
   * Get the target number.
   */
  getTarget(): number {
    return this.state.targetNumber;
  }

  /**
   * Animate level objects.
   */
  animate(time: number): void {
    this.primeOrbs.forEach((orb, prime) => {
      // Floating animation
      orb.position.y += Math.sin(time * 2 + prime) * 0.005;
      orb.rotation.y += 0.01;
    });
  }

  /**
   * Clean up level resources.
   */
  dispose(): void {
    this.primeOrbs.forEach((mesh, prime) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.primeLights.forEach((light) => {
      this.scene.remove(light);
    });
  }
}
