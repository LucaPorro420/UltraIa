import { z } from 'zod';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSlideshowFfmpegArgv, generateImage, prisma, renderCompositionWav, slugifyPrompt, assertPublicUrl } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { effectiveExt, getStudioCloud } from '@/lib/server/studio-assets';
import { sanitizeError } from '@/lib/server/sanitize-error';

const bodySchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('image-reroll'),
    prompt: z.string().min(1).max(2000),
    sourceUrl: z.string().min(1).max(2048),
    parentId: z.string().optional(),
  }),
  z.object({
    op: z.literal('music-resynth'),
    composition: z.object({
      mood: z.string().default('calm'),
      genre: z.string().optional(),
      key: z.string().optional(),
      tempoBpm: z.number().int().min(40).max(220),
      sections: z.array(z.object({ name: z.string() })).min(1).default([{ name: 'Loop' }]),
    }),
    overrides: z
      .object({
        bpm: z.number().int().min(40).max(220).optional(),
        mood: z.string().min(1).max(30).optional(),
        durationSec: z.number().min(2).max(30).optional(),
        seed: z.number().int().optional(),
      })
      .optional(),
    parentId: z.string().optional(),
  }),
  z.object({
    op: z.literal('video-slideshow'),
    frames: z
      .array(z.object({ url: z.string().min(1), caption: z.string().default('') }))
      .min(1)
      .max(12),
    fps: z.number().int().min(12).max(60).default(24),
    secondsPerFrame: z.number().min(0.5).max(6).default(2),
    prompt: z.string().max(2000).default('storyboard slideshow'),
    parentId: z.string().optional(),
  }),
]);

/** POST /api/assets/[id]/derive — aplica una modificación y crea el asset hijo. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const parent = await prisma.generatedAsset.findFirst({ where: { id, userId: user.id } });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const op = parsed.data;
  const parentId = op.parentId ?? parent?.id ?? null;

  try {
    if (op.op === 'image-reroll') {
      // Re-roll generativo img2img (keyless pollinations/meigen vía generateImage).
      const img = await generateImage({ prompt: op.prompt, imageUrl: op.sourceUrl });
      const child = await prisma.generatedAsset.create({
        data: {
          userId: user.id,
          prompt: op.prompt,
          url: img.url,
          provider: img.provider,
          model: img.model,
          seed: img.seed,
          width: img.width,
          height: img.height,
          mediaType: 'image',
          parentId,
        },
      });
      return Response.json({ ok: true, childId: child.id, url: child.url }, { status: 201 });
    }

    if (op.op === 'music-resynth') {
      // Resíntesis keyless: beat+pad+motif desde la composición con overrides.
      const rendered = renderCompositionWav(op.composition, op.overrides ?? {});
      const seed = op.overrides?.seed ?? 1337;
      const name = `${slugifyPrompt(`${rendered.plan.moodKey}-${rendered.plan.bpm}bpm`)}-${seed}.wav`;
      const cloud = getStudioCloud();
      const saved = await cloud.upload(name, new Uint8Array(rendered.wav), 'media/audio');
      const child = await prisma.generatedAsset.create({
        data: {
          userId: user.id,
          prompt: `resíntesis ${rendered.plan.moodKey} ${rendered.plan.bpm}bpm`,
          url: '/api/assets/placeholder',
          provider: 'composition-synth',
          model: 'omag-sound-v1',
          mediaType: 'music',
          storage: 'cloud',
          cloudPath: saved.path,
          parentId,
          metaJson: JSON.stringify({
            plan: rendered.plan,
            durationSec: rendered.durationSec,
            composition: op.composition,
          }),
        },
      });
      await prisma.generatedAsset.update({ where: { id: child.id }, data: { url: `/api/assets/${child.id}` } });
      return Response.json(
        { ok: true, childId: child.id, url: `/api/assets/${child.id}`, durationSec: rendered.durationSec },
        { status: 201 },
      );
    }

    // video-slideshow: descarga frames a temp, ejecuta ffmpeg (fail-soft) y sube MP4.
    const tmp = await mkdtemp(join(tmpdir(), 'ultraia-slid-'));
    try {
      const locals: string[] = [];
      for (let i = 0; i < op.frames.length; i++) {
        assertPublicUrl(op.frames[i].url); // H07: SSRF guard on frame URLs
        const res = await fetch(op.frames[i].url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status} en frame ${i}`);
        const ext = effectiveExt(op.frames[i].url, res.headers.get('content-type') ?? undefined);
        const local = join(tmp, `frame-${i}.${ext}`);
        await writeFile(local, new Uint8Array(await res.arrayBuffer()));
        locals.push(local);
      }
      const out = join(tmp, 'slideshow.mp4');
      const argv = buildSlideshowFfmpegArgv(locals, out, { fps: op.fps, secondsPerFrame: op.secondsPerFrame });
      // argv[0] es 'ffmpeg' — spawnSync(file, args) sin el binario duplicado.
      const run = spawnSync(argv[0], argv.slice(1), { timeout: 120_000 });
      let mp4: Buffer | null = null;
      try {
        mp4 = await readFile(out);
      } catch {
        mp4 = null;
      }
      if (!mp4 || run.status !== 0) {
        return Response.json(
          {
            ok: false,
            error: !mp4 ? 'ffmpeg no produjo salida' : `ffmpeg exit ${run.status}`,
            hint: 'Requiere ffmpeg en PATH localmente; en deploy sin ffmpeg usa el player slideshow.',
            argv,
          },
          { status: 503 },
        );
      }
      const cloud = getStudioCloud();
      const tag = parentId ? parentId.slice(-6) : slugifyPrompt(op.prompt).slice(0, 6);
      const saved = await cloud.upload(
        `${slugifyPrompt(op.prompt)}-${tag}-${op.frames.length}f.mp4`,
        new Uint8Array(mp4),
        'media/videos',
      );
      const child = await prisma.generatedAsset.create({
        data: {
          userId: user.id,
          prompt: op.prompt,
          url: '/api/assets/placeholder',
          provider: 'procvid-slideshow',
          model: 'ffmpeg-zoompan-xfade',
          mediaType: 'video',
          width: 1080,
          height: 1920,
          storage: 'cloud',
          cloudPath: saved.path,
          parentId,
          metaJson: JSON.stringify({ fps: op.fps, secondsPerFrame: op.secondsPerFrame, frames: op.frames.length }),
        },
      });
      await prisma.generatedAsset.update({ where: { id: child.id }, data: { url: `/api/assets/${child.id}` } });
      return Response.json({ ok: true, childId: child.id, url: `/api/assets/${child.id}` }, { status: 201 });
    } finally {
      rm(tmp, { recursive: true, force: true }).catch(() => undefined);
    }
  } catch (err) {
    return Response.json({ ok: false, error: sanitizeError(err) }, { status: 502 });
  }
}
