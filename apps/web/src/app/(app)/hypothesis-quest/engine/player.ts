/**
 * Hypothesis Quest 3D — Player Controller
 * Third-person MOBA/MMORPG-style movement with WASD + mouse.
 */

import * as THREE from 'three';

export interface PlayerConfig {
  moveSpeed: number;
  jumpForce: number;
  gravity: number;
  groundLevel: number;
  playerHeight: number;
  collisionRadius: number;
}

export interface PlayerState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: number;       // Y-axis rotation (radians)
  isGrounded: boolean;
  isJumping: boolean;
  health: number;
  maxHealth: number;
  score: number;
  collectedItems: string[];
}

const DEFAULT_CONFIG: PlayerConfig = {
  moveSpeed: 8,
  jumpForce: 12,
  gravity: 25,
  groundLevel: 0,
  playerHeight: 1.8,
  collisionRadius: 0.5,
};

export class PlayerController {
  private config: PlayerConfig;
  private state: PlayerState;
  private keys: Set<string> = new Set();
  private mouseMovement: { x: number; y: number } = { x: 0, y: 0 };
  private mesh: THREE.Group;
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private trailPositions: THREE.Vector3[] = [];
  private maxTrailLength: number = 50;

  constructor(
    scene: THREE.Scene,
    startPos: THREE.Vector3 = new THREE.Vector3(0, 2, 0),
    config: Partial<PlayerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      position: startPos.clone(),
      velocity: new THREE.Vector3(),
      rotation: 0,
      isGrounded: false,
      isJumping: false,
      health: 100,
      maxHealth: 100,
      score: 0,
      collectedItems: [],
    };

    // Create player visual
    this.mesh = new THREE.Group();
    
    // Body (capsule-like)
    const bodyGeom = new THREE.CapsuleGeometry(0.3, 1.0, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6, // Primary purple
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.2,
      metalness: 0.3,
      roughness: 0.7,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    this.bodyMesh.position.y = 0.8;
    this.bodyMesh.castShadow = true;
    this.mesh.add(this.bodyMesh);

    // Head
    const headGeom = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xe7e7ee,
      emissive: 0xe7e7ee,
      emissiveIntensity: 0.1,
      metalness: 0.2,
      roughness: 0.8,
    });
    this.headMesh = new THREE.Mesh(headGeom, headMat);
    this.headMesh.position.y = 1.6;
    this.headMesh.castShadow = true;
    this.mesh.add(this.headMesh);

    // Point light on player
    const playerLight = new THREE.PointLight(0x8b5cf6, 0.5, 5);
    playerLight.position.y = 2;
    this.mesh.add(playerLight);

    this.mesh.position.copy(this.state.position);
    scene.add(this.mesh);

    // Event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.mouseMovement.x += e.movementX;
        this.mouseMovement.y += e.movementY;
      }
    });
  }

  /**
   * Update player state each frame.
   * @param delta Time since last frame in seconds
   * @param platforms Array of platform bounding boxes for collision
   */
  update(delta: number, platforms: THREE.Box3[] = []): PlayerState {
    const { config, state } = this;

    // Mouse look (camera rotation)
    const sensitivity = 0.002;
    state.rotation -= this.mouseMovement.x * sensitivity;
    this.mouseMovement.x = 0;
    this.mouseMovement.y = 0;

    // Movement direction relative to camera
    const forward = new THREE.Vector3(
      -Math.sin(state.rotation),
      0,
      -Math.cos(state.rotation)
    ).normalize();
    const right = new THREE.Vector3(
      Math.cos(state.rotation),
      0,
      -Math.sin(state.rotation)
    ).normalize();

    // Input
    const moveDir = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveDir.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveDir.sub(forward);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveDir.sub(right);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveDir.add(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      state.velocity.x = moveDir.x * config.moveSpeed;
      state.velocity.z = moveDir.z * config.moveSpeed;
    } else {
      // Friction
      state.velocity.x *= 0.85;
      state.velocity.z *= 0.85;
    }

    // Jump
    if ((this.keys.has('Space') || this.keys.has('KeyJ')) && state.isGrounded) {
      state.velocity.y = config.jumpForce;
      state.isGrounded = false;
      state.isJumping = true;
    }

    // Gravity
    state.velocity.y -= config.gravity * delta;

    // Apply velocity
    state.position.x += state.velocity.x * delta;
    state.position.y += state.velocity.y * delta;
    state.position.z += state.velocity.z * delta;

    // Ground collision
    state.isGrounded = false;
    if (state.position.y <= config.groundLevel + config.playerHeight / 2) {
      state.position.y = config.groundLevel + config.playerHeight / 2;
      state.velocity.y = 0;
      state.isGrounded = true;
      state.isJumping = false;
    }

    // Platform collision
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      state.position,
      new THREE.Vector3(config.collisionRadius * 2, config.playerHeight, config.collisionRadius * 2)
    );

    for (const platform of platforms) {
      if (playerBox.intersectsBox(platform)) {
        const overlap = new THREE.Vector3();
        playerBox.min.max(platform.min).sub(state.position);
        // Simple push-out
        if (state.velocity.y < 0 && state.position.y > platform.max.y) {
          state.position.y = platform.max.y + config.playerHeight / 2;
          state.velocity.y = 0;
          state.isGrounded = true;
          state.isJumping = false;
        }
      }
    }

    // Update mesh
    this.mesh.position.copy(state.position);
    this.mesh.rotation.y = state.rotation;

    // Update trail
    this.trailPositions.push(state.position.clone());
    if (this.trailPositions.length > this.maxTrailLength) {
      this.trailPositions.shift();
    }

    return { ...state };
  }

  /**
   * Get current player state (immutable copy).
   */
  getState(): PlayerState {
    return { ...this.state };
  }

  /**
   * Get the trail of positions for butterfly effect visualization.
   */
  getTrail(): THREE.Vector3[] {
    return [...this.trailPositions];
  }

  /**
   * Add score and collected item.
   */
  collectItem(itemId: string, scoreValue: number): void {
    this.state.collectedItems.push(itemId);
    this.state.score += scoreValue;
  }

  /**
   * Apply damage to player.
   */
  takeDamage(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
  }

  /**
   * Teleport player to new position.
   */
  teleport(position: THREE.Vector3): void {
    this.state.position.copy(position);
    this.mesh.position.copy(position);
    this.trailPositions = [];
  }

  /**
   * Get the Three.js mesh for this player.
   */
  getMesh(): THREE.Group {
    return this.mesh;
  }

  /**
   * Dispose of all resources.
   */
  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.bodyMesh.geometry.dispose();
    (this.bodyMesh.material as THREE.Material).dispose();
    this.headMesh.geometry.dispose();
    (this.headMesh.material as THREE.Material).dispose();
  }
}
