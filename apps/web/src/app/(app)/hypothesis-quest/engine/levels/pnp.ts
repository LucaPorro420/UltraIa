/**
 * Hypothesis Quest 3D — Level 4: P vs NP (SAT Problem)
 * 
 * The P vs NP problem asks whether every problem whose solution
 * can be quickly verified can also be quickly solved.
 * 
 * Gameplay: Navigate a maze of boolean gates and switches.
 * Toggle switches to satisfy all clause gates (3-SAT problem).
 * Chaos state changes gate configurations based on toggle order.
 */

import * as THREE from 'three';
import { ChaosState, createChaosState, stepChaos, normalizeChaosState } from '../chaos';
import { WorldObject } from '../world';

export interface Clause {
  literals: Array<{ variable: number; negated: boolean }>;
  isSatisfied: boolean;
}

export interface PvsNPLevelState {
  variables: boolean[];
  clauses: Clause[];
  isComplete: boolean;
  isValid: boolean;
  moveCount: number;
  maxMoves: number;
  targetClauses: number;
}

export class PvsNPLevel {
  private scene: THREE.Scene;
  private seed: number;
  private chaosState: ChaosState;
  private state: PvsNPLevelState;
  private switchMeshes: THREE.Mesh[] = [];
  private gateMeshes: THREE.Mesh[] = [];
  private wireMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, seed: number = Date.now()) {
    this.scene = scene;
    this.seed = seed;
    this.chaosState = createChaosState(seed);
    
    const numVariables = 4;
    const numClauses = 5;
    
    this.state = {
      variables: new Array(numVariables).fill(false),
      clauses: this.generateClauses(numVariables, numClauses),
      isComplete: false,
      isValid: true,
      moveCount: 0,
      maxMoves: 20,
      targetClauses: numClauses,
    };
  }

  /**
   * Generate random 3-SAT clauses.
   */
  private generateClauses(numVariables: number, numClauses: number): Clause[] {
    const clauses: Clause[] = [];
    
    for (let i = 0; i < numClauses; i++) {
      const literals = [];
      for (let j = 0; j < 3; j++) {
        const state = stepChaos(this.chaosState, undefined, i * 100 + j * 10);
        const normalized = normalizeChaosState(state);
        const variable = Math.floor(Math.abs(normalized.normalized.nx) * numVariables) % numVariables;
        const negated = Math.random() > 0.5;
        literals.push({ variable, negated });
      }
      clauses.push({ literals, isSatisfied: false });
    }
    
    return clauses;
  }

  /**
   * Generate the P vs NP level layout.
   */
  generate(): WorldObject[] {
    const objects: WorldObject[] = [];
    
    // Create switches (one per variable)
    this.state.variables.forEach((_, i) => {
      const switchMesh = this.createSwitch(i, this.state.variables.length);
      this.switchMeshes.push(switchMesh);
      objects.push({
        mesh: switchMesh,
        type: 'collectible',
        id: `switch-${i}`,
        chaosIndex: i,
      });
    });
    
    // Create gates (one per clause)
    this.state.clauses.forEach((clause, i) => {
      const gateMesh = this.createGate(i, clause);
      this.gateMeshes.push(gateMesh);
      objects.push({
        mesh: gateMesh,
        type: 'obstacle',
        id: `gate-${i}`,
        chaosIndex: i,
      });
    });
    
    // Create wires connecting switches to gates
    this.state.clauses.forEach((clause, clauseIdx) => {
      clause.literals.forEach(literal => {
        const wire = this.createWire(literal.variable, clauseIdx);
        this.wireMeshes.push(wire);
      });
    });
    
    return objects;
  }

  /**
   * Create a switch mesh.
   */
  private createSwitch(index: number, total: number): THREE.Mesh {
    const group = new THREE.Group();
    
    // Base
    const baseGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1f1f2a,
      roughness: 0.8,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    group.add(base);
    
    // Toggle
    const toggleGeom = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const toggleMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.3,
    });
    const toggle = new THREE.Mesh(toggleGeom, toggleMat);
    toggle.position.y = 0.5;
    group.add(toggle);
    
    // Label
    const label = this.createLabel(`x${index + 1}`);
    label.position.y = 1.5;
    group.add(label);
    
    // Position in a row
    const x = (index - (total - 1) / 2) * 4;
    group.position.set(x, 1, -10);
    
    this.scene.add(group);
    return group as unknown as THREE.Mesh;
  }

  /**
   * Create a gate mesh.
   */
  private createGate(index: number, clause: Clause): THREE.Mesh {
    const group = new THREE.Group();
    
    // Gate body
    const gateGeom = new THREE.BoxGeometry(2, 1.5, 0.5);
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.7,
      metalness: 0.3,
    });
    const gate = new THREE.Mesh(gateGeom, gateMat);
    group.add(gate);
    
    // OR symbol
    const symbolGeom = new THREE.TorusGeometry(0.3, 0.1, 8, 16, Math.PI);
    const symbolMat = new THREE.MeshStandardMaterial({
      color: 0xe7e7ee,
      emissive: 0xe7e7ee,
      emissiveIntensity: 0.2,
    });
    const symbol = new THREE.Mesh(symbolGeom, symbolMat);
    symbol.rotation.z = Math.PI / 2;
    symbol.position.z = 0.3;
    group.add(symbol);
    
    // Clause label
    const label = this.createLabel(`C${index + 1}`);
    label.position.y = 1.2;
    group.add(label);
    
    // Status indicator
    const indicatorGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const indicatorMat = new THREE.MeshStandardMaterial({
      color: 0xe74c3c, // Red = unsatisfied
      emissive: 0xe74c3c,
      emissiveIntensity: 0.5,
    });
    const indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
    indicator.position.set(1.2, 0, 0);
    indicator.name = 'indicator';
    group.add(indicator);
    
    // Position in a row
    const x = (index - (this.state.clauses.length - 1) / 2) * 4;
    group.position.set(x, 1, 10);
    
    this.scene.add(group);
    return group as unknown as THREE.Mesh;
  }

  /**
   * Create a wire connecting switch to gate.
   */
  private createWire(switchIdx: number, gateIdx: number): THREE.Mesh {
    const switchX = (switchIdx - (this.state.variables.length - 1) / 2) * 4;
    const gateX = (gateIdx - (this.state.clauses.length - 1) / 2) * 4;
    
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(switchX, 1, -10),
      new THREE.Vector3((switchX + gateX) / 2, 3, 0),
      new THREE.Vector3(gateX, 1, 10)
    );
    
    const geometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: 0x26263a,
      emissive: 0x26263a,
      emissiveIntensity: 0.1,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * Create a text label.
   */
  private createLabel(text: string): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#111115';
    ctx.roundRect(0, 0, 128, 64, 8);
    ctx.fill();
    
    ctx.fillStyle = '#e7e7ee';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);

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
   * Toggle a variable switch.
   */
  toggleVariable(index: number): boolean {
    if (index < 0 || index >= this.state.variables.length) {
      return false;
    }

    this.state.variables[index] = !this.state.variables[index];
    this.state.moveCount++;
    
    // Update visual
    this.updateSwitchVisual(index);
    
    // Check all clauses
    this.evaluateClauses();
    
    // Check win condition
    const allSatisfied = this.state.clauses.every(c => c.isSatisfied);
    if (allSatisfied) {
      this.state.isComplete = true;
    }
    
    // Check move limit
    if (this.state.moveCount >= this.state.maxMoves) {
      this.state.isValid = false;
    }
    
    return true;
  }

  /**
   * Update switch visual state.
   */
  private updateSwitchVisual(index: number): void {
    const switchMesh = this.switchMeshes[index];
    if (switchMesh instanceof THREE.Group) {
      const toggle = switchMesh.children[1] as THREE.Mesh;
      const mat = toggle.material as THREE.MeshStandardMaterial;
      
      if (this.state.variables[index]) {
        mat.color.setHex(0x2ecc71); // Green = true
        mat.emissive.setHex(0x2ecc71);
        toggle.position.y = 0.7;
      } else {
        mat.color.setHex(0x8b5cf6); // Purple = false
        mat.emissive.setHex(0x8b5cf6);
        toggle.position.y = 0.3;
      }
    }
  }

  /**
   * Evaluate all clauses with current variable assignments.
   */
  private evaluateClauses(): void {
    this.state.clauses.forEach((clause, i) => {
      clause.isSatisfied = clause.literals.some(literal => {
        const value = this.state.variables[literal.variable];
        return literal.negated ? !value : value;
      });
      
      // Update gate visual
      this.updateGateVisual(i, clause.isSatisfied);
    });
  }

  /**
   * Update gate visual state.
   */
  private updateGateVisual(index: number, satisfied: boolean): void {
    const gateMesh = this.gateMeshes[index];
    if (gateMesh instanceof THREE.Group) {
      const indicator = gateMesh.getObjectByName('indicator') as THREE.Mesh;
      if (indicator) {
        const mat = indicator.material as THREE.MeshStandardMaterial;
        if (satisfied) {
          mat.color.setHex(0x2ecc71);
          mat.emissive.setHex(0x2ecc71);
        } else {
          mat.color.setHex(0xe74c3c);
          mat.emissive.setHex(0xe74c3c);
        }
      }
    }
  }

  /**
   * Get current level state.
   */
  getState(): PvsNPLevelState {
    return { ...this.state };
  }

  /**
   * Get variable assignments.
   */
  getVariables(): boolean[] {
    return [...this.state.variables];
  }

  /**
   * Animate level objects.
   */
  animate(time: number): void {
    // Pulse gates
    this.gateMeshes.forEach((gate, i) => {
      if (gate instanceof THREE.Group) {
        const indicator = gate.getObjectByName('indicator');
        if (indicator) {
          const scale = 1 + Math.sin(time * 3 + i) * 0.1;
          indicator.scale.setScalar(scale);
        }
      }
    });
  }

  /**
   * Clean up level resources.
   */
  dispose(): void {
    this.switchMeshes.forEach(mesh => {
      this.scene.remove(mesh);
    });
    this.gateMeshes.forEach(mesh => {
      this.scene.remove(mesh);
    });
    this.wireMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
  }
}
