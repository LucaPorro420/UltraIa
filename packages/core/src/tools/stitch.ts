//! Google Stitch UI generation — text-to-UI mockup.
// Uses Google Stitch SDK (free Labs experiment) to generate high-fidelity
// UI screens from text prompts. Requires STITCH_API_KEY. Returns screenshot
// URL + editable HTML URL. Fail-soft: throws on missing key or API errors.
export interface UiScreen {
  prompt: string;
  imageUrl: string;
  htmlUrl: string;
  projectId: string;
  screenId: string;
}

/**
 * Generate a high-fidelity UI screen from a text prompt using Google Stitch
 * (free Google Labs experiment). Returns a screenshot URL and the generated
 * HTML URL. Requires STITCH_API_KEY (free, https://stitch.withgoogle.com).
 *
 * This is the "design" capability that mirrors DESIGN.png: describe an
 * interface and get a real, editable UI mockup.
 */
export async function generateUiScreen(prompt: string): Promise<UiScreen> {
  const p = (prompt || '').trim();
  if (!p) throw new Error('Prompt is required');
  if (p.length > 2000) throw new Error('Prompt too long (max 2000 chars)');
  if (!process.env.STITCH_API_KEY) {
    throw new Error(
      'STITCH_API_KEY is not set. Get a free key at https://stitch.withgoogle.com and add it to .env.',
    );
  }

  let stitchModule: { stitch: { createProject: (name: string) => Promise<{ projectId: string; generate: (prompt: string) => Promise<{ screenId: string; getImage: () => Promise<string>; getHtml: () => Promise<string> }> }> } };
  try {
    stitchModule = await import(/* webpackIgnore: true */ '@google/stitch-sdk') as typeof stitchModule;
  } catch {
    throw new Error(
      'Package @google/stitch-sdk is not installed. Run: npm install @google/stitch-sdk',
    );
  }
  const project = await stitchModule.stitch.createProject('UltraIa');
  const screen = await project.generate(p);
  const [imageUrl, htmlUrl] = await Promise.all([screen.getImage(), screen.getHtml()]);

  return {
    prompt: p,
    imageUrl,
    htmlUrl,
    projectId: project.projectId,
    screenId: screen.screenId,
  };
}
