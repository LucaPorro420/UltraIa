/**
 * Hypothesis Quest 3D — Camera Controller
 * MOBA/MMORPG-style orbit camera with smooth follow.
 */

import * as THREE from 'three';

export interface CameraConfig {
  distance: number;        // Distance from target
  minDistance: number;
  maxDistance: number;
  height: number;          // Height offset
  minPitch: number;        // Min vertical angle (radians)
  maxPitch: number;        // Max vertical angle (radians)
  smoothSpeed: number;     // Follow smoothing
  rotationSpeed: number;   // Mouse rotation sensitivity
  zoomSpeed: number;       // Scroll zoom speed
}

const DEFAULT_CONFIG: CameraConfig = {
  distance: 12,
  minDistance: 5,
  maxDistance: 25,
  height: 8,
  minPitch: 0.3,      // ~17 degrees min
  maxPitch: 1.2,      // ~69 degrees max
  smoothSpeed: 5,
  rotationSpeed: 0.003,
  zoomSpeed: 0.5,
};

export class CameraController {
  private config: CameraConfig;
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3 = new THREE.Vector3();
  private currentPos: THREE.Vector3 = new THREE.Vector3();
  
  // Orbit state
  private azimuth: number = 0;     // Horizontal rotation (radians)
  private pitch: number = 0.6;     // Vertical angle (radians)
  private distance: number;
  
  // Input
  private isRightMouseDown: boolean = false;
  private mouseDelta: { x: number; y: number } = { x: 0, y: 0 };

  constructor(camera: THREE.PerspectiveCamera, config: Partial<CameraConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.camera = camera;
    this.distance = this.config.distance;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Right-click for orbit
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // Right click
        this.isRightMouseDown = true;
        document.body.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = false;
        document.body.style.cursor = 'default';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isRightMouseDown) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });

    // Scroll to zoom
    window.addEventListener('wheel', (e) => {
      this.distance += e.deltaY * 0.01 * this.config.zoomSpeed;
      this.distance = Math.max(this.config.minDistance, 
        Math.min(this.config.maxDistance, this.distance));
    }, { passive: true });

    // Prevent context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Update camera position to follow target.
   * @param target Position to follow
   * @param delta Time since last frame
   */
  update(target: THREE.Vector3, delta: number): void {
    this.target.copy(target);

    // Process mouse input for orbit
    if (this.isRightMouseDown) {
      this.azimuth -= this.mouseDelta.x * this.config.rotationSpeed;
      this.pitch += this.mouseDelta.y * this.config.rotationSpeed;
      this.pitch = Math.max(this.config.minPitch, 
        Math.min(this.config.maxPitch, this.pitch));
    }
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;

    // Calculate desired camera position
    const desiredPos = new THREE.Vector3(
      target.x + this.distance * Math.cos(this.pitch) * Math.sin(this.azimuth),
      target.y + this.distance * Math.sin(this.pitch),
      target.z + this.distance * Math.cos(this.pitch) * Math.cos(this.azimuth)
    );

    // Smooth interpolation
    const t = 1 - Math.exp(-this.config.smoothSpeed * delta);
    this.currentPos.lerp(desiredPos, t);

    // Update camera
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(target.x, target.y + 1.5, target.z); // Look slightly above target
  }

  /**
   * Set the orbit angles directly.
   */
  setOrbit(azimuth: number, pitch: number): void {
    this.azimuth = azimuth;
    this.pitch = Math.max(this.config.minPitch, 
      Math.min(this.config.maxPitch, pitch));
  }

  /**
   * Set camera distance (zoom level).
   */
  setDistance(distance: number): void {
    this.distance = Math.max(this.config.minDistance, 
      Math.min(this.config.maxDistance, distance));
  }

  /**
   * Get the camera's forward direction (horizontal only).
   */
  getForward(): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.sin(this.azimuth),
      0,
      -Math.cos(this.azimuth)
    ).normalize();
  }

  /**
   * Get the camera's right direction (horizontal only).
   */
  getRight(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.cos(this.azimuth),
      0,
      -Math.sin(this.azimuth)
    ).normalize();
  }

  /**
   * Get current camera state for serialization.
   */
  getState(): { azimuth: number; pitch: number; distance: number } {
    return {
      azimuth: this.azimuth,
      pitch: this.pitch,
      distance: this.distance,
    };
  }

  /**
   * Get the Three.js camera.
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}
