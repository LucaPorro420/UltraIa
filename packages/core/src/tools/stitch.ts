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

  const { stitch } = await import(/* webpackIgnore: true */ '@google/stitch-sdk');
  const project = await stitch.createProject('UltraIa');
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
