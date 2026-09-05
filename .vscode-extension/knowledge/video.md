# Video & Media Production Guide

## Video Pipeline
```
Capture → Edit → Encode → Package → Distribute → Analyze
```

## Encoding & Formats
| Format | Use Case | Codec | Container |
|--------|----------|-------|-----------|
| Web | Streaming | H.264/H.265 | MP4/WebM |
| Broadcast | TV/Cinema | ProRes/DNxHR | MOV/MXF |
| Archive | Storage | FFV1/H.265 | MKV |
| Game | Capture | NVENC/AMF | MP4 |

## FFmpeg Commands
```bash
# Transcode to H.264
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium output.mp4

# Extract audio
ffmpeg -i input.mp4 -vn -acodec copy output.aac

# Trim video
ffmpeg -i input.mp4 -ss 00:01:00 -to 00:02:00 -c copy output.mp4

# Resize
ffmpeg -i input.mp4 -vf scale=1920:1080 output.mp4

# Add subtitles
ffmpeg -i input.mp4 -vf subtitles=subs.srt output.mp4

# Generate thumbnails
ffmpeg -i input.mp4 -vf "fps=1/10" thumb_%03d.jpg

# Concat videos
ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4

# Screen capture (Windows)
ffmpeg -f gdigrab -framerate 30 -i desktop -c:v libx264 output.mp4
```

## Video Editing Concepts
- **Timeline**: clips arranged sequentially/parallel
- **Transitions**: cut, dissolve, wipe, zoom
- **Effects**: color correction, blur, sharpen, chroma key
- **Compositing**: layers, blending modes, masks
- **Audio**: ducking, sync, spatial audio
- **Titling**: lower thirds, end cards, motion graphics

## Streaming Architecture
```
Source (OBS/FFmpeg) → Encoder → Origin Server → CDN → Viewer
                              (RTMP)        (HLS/DASH)
```

## Media Processing
- **Image**: Sharp (Node), Pillow (Python), ImageMagick
- **Video**: FFmpeg, Remotion (React), MoviePy (Python)
- **Audio**: Web Audio API, Tone.js, Howler.js
- **Animation**: Lottie, Rive, Spine, SVG animations
- **3D**: Three.js, Babylon.js, Blender scripting

## YouTube/TikTok Optimization
- **Aspect Ratios**: 16:9 (landscape), 9:16 (shorts/reels), 1:1 (square)
- **Resolutions**: 1080p min, 4K preferred
- **FPS**: 30fps standard, 60fps gaming
- **Bitrate**: 8-12 Mbps for 1080p, 35-45 Mbps for 4K
- **Thumbnails**: 1280x720, high contrast, readable text
- **Captions**: SRT/WebVTT, burned-in for social
- **Metadata**: Title (60 chars), description (5000 chars), tags
