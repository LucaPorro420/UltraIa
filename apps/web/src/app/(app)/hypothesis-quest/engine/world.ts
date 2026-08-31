/**
 * Hypothesis Quest 3D — World Generator
 * Generates 3D terrain and objects from chaos state.
 * Uses Lorenz attractor trajectories to create unique level layouts.
 */

import * as THREE from 'three';
import { 
  ChaosState, 
  createChaosState, 
  stepChaos, 
  normalizeChaosState,
  generateTrajectory,
  ChaosTrajectoryPoint 
} from './chaos';

export interface WorldConfig {
  terrainSize: number;
  terrainSegments: number;
  platformHeight: number;
  platformWidth: number;
  numPlatforms: number;
  objectScale: number;
}

export interface WorldObject {
  mesh: THREE.Object3D;
  type: 'platform' | 'collectible' | 'obstacle' | 'goal' | 'decoration';
  id: string;
  chaosIndex: number; // Which trajectory point spawned this
}

const DEFAULT_CONFIG: WorldConfig = {
  terrainSize: 100,
  terrainSegments: 64,
  platformHeight: 0.5,
  platformWidth: 3,
  numPlatforms: 20,
  objectScale: 1,
};

/**
 * Create a procedural terrain mesh influenced by chaos state.
 */
export function createTerrain(
  scene: THREE.Scene,
  chaosState: ChaosState,
  config: WorldConfig = DEFAULT_CONFIG
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(
    config.terrainSize, 
    config.terrainSize, 
    config.terrainSegments, 
    config.terrainSegments
  );
  geometry.rotateX(-Math.PI / 2);

  const vertices = geometry.attributes.position;
  const colors = new Float32Array(vertices.count * 3);

  // Use chaos state to deform terrain
  const state = { ...chaosState };
  
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i);
    const z = vertices.getZ(i);
    
    // Step chaos based on position
    const localState = stepChaos(state, undefined, Math.floor(Math.abs(x + z)));
    const normalized = normalizeChaosState(localState);
    
    // Height from chaos + noise
    const height = normalized.normalized.nz * 5 + 
      Math.sin(x * 0.1 + localState.x * 0.5) * 2 +
      Math.cos(z * 0.1 + localState.y * 0.5) * 2;
    
    vertices.setY(i, height);
    
    // Color based on height (Dark Obsidian theme)
    const t = (height + 5) / 15; // Normalize to [0, 1]
    colors[i * 3] = 0.05 + t * 0.1;     // R
    colors[i * 3 + 1] = 0.05 + t * 0.08; // G
    colors[i * 3 + 2] = 0.07 + t * 0.15; // B
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.position.y = -2;
  scene.add(mesh);
  return mesh;
}

/**
 * Generate platforms from chaos trajectory.
 */
export function generatePlatforms(
  scene: THREE.Scene,
  seed: number,
  config: WorldConfig = DEFAULT_CONFIG
): WorldObject[] {
  const objects: WorldObject[] = [];
  const trajectory = generateTrajectory(seed, config.numPlatforms);
  
  trajectory.forEach((point, i) => {
    const geometry = new THREE.BoxGeometry(
      config.platformWidth,
      config.platformHeight,
      config.platformWidth
    );
    
    // Color varies by chaos intensity
    const intensity = Math.abs(point.normalized.nz);
    const color = new THREE.Color().setHSL(
      0.75 + intensity * 0.1, // Hue: purple range
      0.6 + intensity * 0.3,
      0.3 + intensity * 0.2
    );
    
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.1 + intensity * 0.2,
      roughness: 0.7,
      metalness: 0.3,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position from trajectory
    const x = point.normalized.nx * 30;
    const y = point.normalized.nz * 15 + 5; // Float above terrain
    const z = point.normalized.ny * 30;
    
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    
    objects.push({
      mesh,
      type: 'platform',
      id: `platform-${i}`,
      chaosIndex: i,
    });
  });
  
  return objects;
}

/**
 * Generate collectible items (glowing orbs).
 */
export function generateCollectibles(
  scene: THREE.Scene,
  seed: number,
  count: number = 10
): WorldObject[] {
  const objects: WorldObject[] = [];
  const trajectory = generateTrajectory(seed, count, undefined, 200);
  
  trajectory.forEach((point, i) => {
    const geometry = new THREE.SphereGeometry(0.4, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const x = point.normalized.nx * 25;
    const y = Math.abs(point.normalized.nz) * 12 + 3;
    const z = point.normalized.ny * 25;
    
    mesh.position.set(x, y, z);
    scene.add(mesh);
    
    // Add glow light
    const light = new THREE.PointLight(0x8b5cf6, 0.5, 4);
    mesh.add(light);
    
    objects.push({
      mesh,
      type: 'collectible',
      id: `collectible-${i}`,
      chaosIndex: i,
    });
  });
  
  return objects;
}

/**
 * Generate obstacles (spinning cubes that follow chaos).
 */
export function generateObstacles(
  scene: THREE.Scene,
  seed: number,
  count: number = 8
): WorldObject[] {
  const objects: WorldObject[] = [];
  const trajectory = generateTrajectory(seed, count, undefined, 300);
  
  trajectory.forEach((point, i) => {
    const geometry = new THREE.OctahedronGeometry(0.8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      emissive: 0xe74c3c,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.5,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const x = point.normalized.nx * 28;
    const y = Math.abs(point.normalized.nz) * 10 + 2;
    const z = point.normalized.ny * 28;
    
    mesh.position.set(x, y, z);
    scene.add(mesh);
    
    objects.push({
      mesh,
      type: 'obstacle',
      id: `obstacle-${i}`,
      chaosIndex: i,
    });
  });
  
  return objects;
}

/**
 * Create the goal portal at the end of the level.
 */
export function createGoal(
  scene: THREE.Scene,
  position: THREE.Vector3
): WorldObject {
  const group = new THREE.Group();
  
  // Ring
  const ringGeom = new THREE.TorusGeometry(1.5, 0.2, 16, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xf1c40f,
    emissive: 0xf1c40f,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.2,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  
  // Inner glow
  const glowGeom = new THREE.SphereGeometry(1, 16, 16);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xf1c40f,
    emissive: 0xf1c40f,
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.3,
  });
  const glow = new THREE.Mesh(glowGeom, glowMat);
  group.add(glow);
  
  // Light
  const light = new THREE.PointLight(0xf1c40f, 1, 10);
  group.add(light);
  
  group.position.copy(position);
  scene.add(group);
  
  return {
    mesh: group,
    type: 'goal',
    id: 'goal',
    chaosIndex: -1,
  };
}

/**
 * Animate world objects based on chaos state.
 */
export function animateWorldObjects(
  objects: WorldObject[],
  chaosState: ChaosState,
  time: number
): void {
  const intensity = Math.abs(chaosState.x) / 20;
  
  objects.forEach((obj) => {
    if (obj.type === 'collectible') {
      // Float and pulse
      obj.mesh.position.y += Math.sin(time * 2 + obj.chaosIndex) * 0.01;
      const scale = 1 + Math.sin(time * 3 + obj.chaosIndex) * 0.1;
      obj.mesh.scale.setScalar(scale);
    }
    
    if (obj.type === 'obstacle') {
      // Spin based on chaos
      obj.mesh.rotation.x += 0.02 * (1 + intensity);
      obj.mesh.rotation.y += 0.03 * (1 + intensity);
    }
    
    if (obj.type === 'platform') {
      // Slight bob based on chaos
      obj.mesh.position.y += Math.sin(time + obj.chaosIndex * 0.5) * 0.005;
    }
  });
}

/**
 * Get collision boxes for platforms.
 */
export function getCollisionBoxes(objects: WorldObject[]): THREE.Box3[] {
  return objects
    .filter(obj => obj.type === 'platform' || obj.type === 'obstacle')
    .map(obj => new THREE.Box3().setFromObject(obj.mesh));
}
