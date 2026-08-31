/**
 * Hypothesis Quest 3D — Level 1: Collatz Conjecture (3n+1)
 * 
 * The Collatz conjecture: for any positive integer n,
 * if n is even, divide by 2; if odd, multiply by 3 and add 1.
 * The conjecture states you always reach 1.
 * 
 * Gameplay: Jump between floating number platforms.
 * Each platform shows a number. Player must choose the correct
 * next platform (even→n/2, odd→3n+1) to reach platform "1".
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos } from '../chaos';
import { WorldObject, generatePlatforms } from '../world';

export interface CollatzLevelState {
  currentNumber: number;
  history: number[];
  isComplete: boolean;
  isValid: boolean;
  stepCount: number;
  maxSteps: number;
  targetNumber: number;
}

export class CollatzLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private platforms: WorldObject[] = [];
  private numberPlates: THREE.Mesh[] = [];
  private state: CollatzLevelState;
  private startNumber: number = 27; // Classic Collatz starting number

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);
    this.state = {
      currentNumber: this.startNumber,
      history: [this.startNumber],
      isComplete: false,
      isValid: true,
      stepCount: 0,
      maxSteps: 500,
      targetNumber: 1,
    };
  }

  /**
   * Generate the Collatz level layout.
   */
  generate(): WorldObject[] {
    // Generate platforms using chaos trajectory
    this.platforms = generatePlatforms(this.scene, this.seed, {
      terrainSize: 80,
      terrainSegments: 32,
      platformHeight: 0.5,
      platformWidth: 4,
      numPlatforms: 15,
      objectScale: 1,
    });

    // Add number plates to platforms
    this.platforms.forEach((platform, i) => {
      const number = this.generateCollatzNumber(i);
      const plate = this.createNumberPlate(number, platform.mesh.position);
      this.numberPlates.push(plate);
    });

    return this.platforms;
  }

  /**
   * Generate a number for the Collatz sequence.
   */
  private generateCollatzNumber(index: number): number {
    const state = stepChaos(this.chaosState, undefined, index * 50);
    const normalized = Math.abs(state.x) % 100;
    return Math.max(1, Math.floor(normalized) * 2 + 1); // Ensure odd numbers
  }

  /**
   * Create a floating number plate.
   */
  private createNumberPlate(number: number, position: THREE.Vector3): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Background
    ctx.fillStyle = '#111115';
    ctx.roundRect(0, 0, 256, 128, 16);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 4;
    ctx.roundRect(0, 0, 256, 128, 16);
    ctx.stroke();
    
    // Number
    ctx.fillStyle = '#e7e7ee';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(2, 1);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y += 1.5;
    mesh.lookAt(0, 1.5, 0);
    this.scene.add(mesh);
    
    return mesh;
  }

  /**
   * Handle player choosing a next number.
   * Returns true if choice is correct (follows Collatz rules).
   */
  chooseNext(chosenNumber: number): boolean {
    const { currentNumber } = this.state;
    let expectedNext: number;

    if (currentNumber % 2 === 0) {
      // Even: divide by 2
      expectedNext = currentNumber / 2;
    } else {
      // Odd: 3n + 1
      expectedNext = 3 * currentNumber + 1;
    }

    if (chosenNumber === expectedNext) {
      this.state.currentNumber = chosenNumber;
      this.state.history.push(chosenNumber);
      this.state.stepCount++;
      
      if (chosenNumber === 1) {
        this.state.isComplete = true;
      }
      
      return true;
    } else {
      this.state.isValid = false;
      return false;
    }
  }

  /**
   * Get available next numbers for the player.
   */
  getAvailableChoices(): number[] {
    const { currentNumber } = this.state;
    const choices: number[] = [];
    
    if (currentNumber % 2 === 0) {
      choices.push(currentNumber / 2);
    } else {
      choices.push(3 * currentNumber + 1);
      // Add a distractor
      choices.push(currentNumber + 1);
    }
    
    return choices;
  }

  /**
   * Get current level state.
   */
  getState(): CollatzLevelState {
    return { ...this.state };
  }

  /**
   * Get the Collatz sequence history.
   */
  getHistory(): number[] {
    return [...this.state.history];
  }

  /**
   * Animate level objects.
   */
  animate(time: number): void {
    this.platforms.forEach((platform, i) => {
      const offset = i * 0.5;
      platform.mesh.position.y += Math.sin(time * 0.5 + offset) * 0.01;
      platform.mesh.rotation.y = Math.sin(time * 0.3 + offset) * 0.1;
    });

    this.numberPlates.forEach((plate, i) => {
      plate.lookAt(0, plate.position.y, 0);
    });
  }

  /**
   * Clean up level resources.
   */
  dispose(): void {
    this.platforms.forEach(obj => {
      this.scene.remove(obj.mesh);
      if (obj.mesh instanceof THREE.Mesh) {
        obj.mesh.geometry.dispose();
        (obj.mesh.material as THREE.Material).dispose();
      }
    });
    this.numberPlates.forEach(plate => {
      this.scene.remove(plate);
      plate.geometry.dispose();
      (plate.material as THREE.Material).dispose();
    });
  }
}
