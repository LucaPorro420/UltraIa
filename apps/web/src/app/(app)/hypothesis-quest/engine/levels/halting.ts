/**
 * Hypothesis Quest 3D — Level 7: Halting Problem
 *
 * The halting problem (Alan Turing, 1936): there is no general algorithm
 * that can determine, for an arbitrary program and input, whether the
 * program will finish running or continue forever. It is undecidable.
 *
 * Gameplay: Player navigates a path of program instruction blocks.
 * Must determine if the program halts (reaches END) or loops forever.
 * If it loops, player must find the loop and break it.
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos, normalizeChaosState } from '../chaos';
import { WorldObject } from '../world';

export type InstructionType = 'INC' | 'DEC' | 'JMP' | 'JZ' | 'END';

export interface Instruction {
  type: InstructionType;
  value: number;
  target: number; // For JMP/JZ
  position: THREE.Vector3;
  mesh?: THREE.Mesh;
}

export interface HaltingLevelState {
  instructions: Instruction[];
  programCounter: number;
  register: number;
  isComplete: boolean;
  isValid: boolean;
  isInfiniteLoop: boolean;
  maxSteps: number;
  currentStep: number;
  decision: 'halts' | 'loops' | 'undecided';
  history: number[];
}

export class HaltingLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private state: HaltingLevelState;
  private instructionMeshes: THREE.Mesh[] = [];
  private pcMarker: THREE.Mesh;
  private pathLine: THREE.Line = null as unknown as THREE.Line;

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);

    const instructions = this.generateProgram();
    this.state = {
      instructions,
      programCounter: 0,
      register: 0,
      isComplete: false,
      isValid: true,
      isInfiniteLoop: false,
      maxSteps: 50,
      currentStep: 0,
      decision: 'undecided',
      history: [],
    };

    this.pcMarker = this.createPCMarker();
  }

  private generateProgram(): Instruction[] {
    const count = 8 + Math.floor(Math.abs(stepChaos(this.chaosState, undefined, 1).x) % 5);
    const instructions: Instruction[] = [];
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const state = stepChaos(this.chaosState, undefined, i * 37);
      const n = normalizeChaosState(state);
      const angle = angleStep * i;
      const radius = 10;

      const typeRoll = Math.abs(n.normalized.nz);
      let type: InstructionType;
      if (typeRoll < 0.2) type = 'INC';
      else if (typeRoll < 0.4) type = 'DEC';
      else if (typeRoll < 0.6) type = 'JMP';
      else if (typeRoll < 0.8) type = 'JZ';
      else type = 'END';

      const target = type === 'JMP' || type === 'JZ'
        ? Math.floor(Math.abs(n.normalized.nx) * count) % count
        : 0;

      instructions.push({
        type,
        value: Math.floor(Math.abs(n.normalized.ny) * 5) + 1,
        target,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          1,
          Math.sin(angle) * radius
        ),
      });
    }

    // Ensure at least one END or create a loop scenario
    if (!instructions.some(i => i.type === 'END')) {
      instructions[instructions.length - 1].type = 'END';
    }

    return instructions;
  }

  private createPCMarker(): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(0.5, 1, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xf1c40f,
      emissiveIntensity: 0.6,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.state.instructions[0].position);
    mesh.position.y += 2;
    this.scene.add(mesh);
    return mesh;
  }

  generate(): WorldObject[] {
    const objects: WorldObject[] = [];

    // Create instruction blocks
    this.state.instructions.forEach((instr, i) => {
      const mesh = this.createInstructionBlock(instr, i);
      this.instructionMeshes.push(mesh);
      instr.mesh = mesh;
      objects.push({
        mesh,
        type: instr.type === 'END' ? 'collectible' : 'obstacle',
        id: `instr-${i}`,
        chaosIndex: i,
      });
    });

    // Create path line connecting instructions
    const points = this.state.instructions.map(i => i.position.clone());
    points.push(points[0].clone()); // Loop back
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x26263a,
      transparent: true,
      opacity: 0.4,
    });
    this.pathLine = new THREE.Line(geometry, material);
    this.scene.add(this.pathLine);

    return objects;
  }

  private createInstructionBlock(instr: Instruction, index: number): THREE.Mesh {
    const group = new THREE.Group();

    // Block body
    const bodyGeom = new THREE.BoxGeometry(2, 1.5, 1);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: instr.type === 'END' ? 0x2ecc71 : 0x1f1f2a,
      roughness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    group.add(body);

    // Instruction label
    const label = this.createInstrLabel(`${instr.type}${instr.type === 'JMP' || instr.type === 'JZ' ? ` ${instr.target}` : ''}`);
    label.position.y = 1.5;
    group.add(label);

    // Value badge
    const badge = this.createInstrLabel(`${instr.value}`, 64, 32);
    badge.position.set(1.2, 0, 0);
    badge.scale.setScalar(0.5);
    group.add(badge);

    group.position.copy(instr.position);
    this.scene.add(group);
    return group as unknown as THREE.Mesh;
  }

  private createInstrLabel(text: string, w = 128, h = 48): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#111115';
    ctx.roundRect(0, 0, w, h, 6);
    ctx.fill();

    ctx.fillStyle = '#e7e7ee';
    ctx.font = `bold ${Math.floor(h * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(w / 64, h / 64);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Execute one step of the program.
   * Returns true if the step was valid.
   */
  executeStep(): boolean {
    if (this.state.isComplete || !this.state.isValid) return false;
    if (this.state.programCounter >= this.state.instructions.length) return false;

    const pc = this.state.programCounter;
    const instr = this.state.instructions[pc];
    this.state.history.push(pc);
    this.state.currentStep++;

    switch (instr.type) {
      case 'INC':
        this.state.register += instr.value;
        this.state.programCounter++;
        break;
      case 'DEC':
        this.state.register = Math.max(0, this.state.register - instr.value);
        this.state.programCounter++;
        break;
      case 'JMP':
        this.state.programCounter = instr.target;
        break;
      case 'JZ':
        if (this.state.register === 0) {
          this.state.programCounter = instr.target;
        } else {
          this.state.programCounter++;
        }
        break;
      case 'END':
        this.state.isComplete = true;
        this.state.decision = 'halts';
        break;
    }

    // Detect infinite loop (visited same PC 3+ times)
    const visits = this.state.history.filter(h => h === pc).length;
    if (visits >= 3) {
      this.state.isInfiniteLoop = true;
      this.state.decision = 'loops';
      this.state.isComplete = true;
    }

    // Step limit
    if (this.state.currentStep >= this.state.maxSteps) {
      this.state.decision = 'loops';
      this.state.isComplete = true;
    }

    // Update marker position
    if (this.state.programCounter < this.state.instructions.length) {
      this.pcMarker.position.copy(this.state.instructions[this.state.programCounter].position);
      this.pcMarker.position.y += 2;
    }

    return true;
  }

  /**
   * Player declares whether the program halts or loops.
   */
  makeDecision(choice: 'halts' | 'loops'): boolean {
    this.state.decision = choice;
    this.state.isComplete = true;
    return choice === (this.state.isInfiniteLoop ? 'loops' : 'halts');
  }

  getState(): HaltingLevelState {
    return { ...this.state };
  }

  animate(time: number): void {
    // Pulse PC marker
    const scale = 1 + Math.sin(time * 4) * 0.2;
    this.pcMarker.scale.setScalar(scale);
    this.pcMarker.rotation.y += 0.03;

    // Highlight current instruction
    this.instructionMeshes.forEach((mesh, i) => {
      if (i === this.state.programCounter) {
        (mesh as unknown as THREE.Group).children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.emissive) mat.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;
          }
        });
      }
    });

    // Animate path
    (this.pathLine.material as THREE.LineBasicMaterial).opacity =
      0.2 + Math.sin(time) * 0.15;
  }

  dispose(): void {
    this.scene.remove(this.pcMarker);
    this.pcMarker.geometry.dispose();
    (this.pcMarker.material as THREE.Material).dispose();

    this.scene.remove(this.pathLine);
    this.pathLine.geometry.dispose();
    (this.pathLine.material as THREE.Material).dispose();

    this.instructionMeshes.forEach(m => {
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
  }
}
