export * from './calculator';
export * from './web';
export * from './image';
export * from './video';
export * from './music';
export * from './stitch';

import * as web from './web';
import * as image from './image';
import * as video from './video';
import * as music from './music';
import * as stitch from './stitch';

export const tools = { web, image, video, music, stitch };

export const TOOL_DESCRIPTIONS: Record<string, string> = {
  calculator: 'Safely evaluate a mathematical expression (math only).',
  web: 'Fetch a public web page (website or non-private social post) and read its text and metadata. Keyless.',
  image: 'Generate a photoreal image from a text prompt using a free, keyless image model. Returns a hotlinkable URL.',
  video: 'Produce a video storyboard (sequence of photoreal frames) from a text prompt. Keyless; real video when a provider is configured.',
  music: 'Compose an original music piece (structured composition) from a text prompt. Keyless; rendered audio when a provider is configured.',
  design: 'Generate a high-fidelity UI screen from a text prompt using Google Stitch (free Google Labs). Returns a screenshot + HTML.',
};

export type Capability = 'calculator' | 'web' | 'image' | 'video' | 'music' | 'design';
