#!/bin/bash
# Auto-generated render script for travel-30s.mp4
# Generated: 2026-08-18T12:55:17.993Z

set -e  # Exit on error

TMPDIR=$(mktemp -d)
cd "$TMPDIR"

# TODO: Copy source clips to $TMPDIR/
# cp /path/to/VideoTask&Memory/historyTravelTP/*.mp4 .

# Step 1: [0] Ken Burns: El glaciar avanza en silencio (pan right, 8s) → clip-0.mp4
ffmpeg -y -loop 1 -i ./imagenes/img-0.jpg -vf scale=720:1280,crop=720:1280,zoompan=z='1.0000+0.0008*on':d=200:s=720x1280:fps=25 -t 8 -c:v libx264 -preset fast -pix_fmt yuv420p clip-0.mp4

# Step 2: [1] Ken Burns: La cascada cae entre la niebla (tilt up, 8s) → clip-1.mp4
ffmpeg -y -loop 1 -i ./imagenes/img-1.jpg -vf scale=720:1280,crop=720:1280,zoompan=z='1.0008+0.0008*on':d=200:s=720x1280:fps=25 -t 8 -c:v libx264 -preset fast -pix_fmt yuv420p clip-1.mp4

# Step 3: [2] Ken Burns: El cañón se abre en capas de color (zoom in, 8s) → clip-2.mp4
ffmpeg -y -loop 1 -i ./imagenes/img-2.jpg -vf scale=720:1280,crop=720:1280,zoompan=z='1.0016+0.0008*on':d=200:s=720x1280:fps=25 -t 8 -c:v libx264 -preset fast -pix_fmt yuv420p clip-2.mp4

# Step 4: [3] Ken Burns: El desierto guarda dunas infinitas (crane down, 8s) → clip-3.mp4
ffmpeg -y -loop 1 -i ./imagenes/img-3.jpg -vf scale=720:1280,crop=720:1280,zoompan=z='1.0024+0.0008*on':d=200:s=720x1280:fps=25 -t 8 -c:v libx264 -preset fast -pix_fmt yuv420p clip-3.mp4

# Final render: render final: travel-30s.mp4 (30.2s, 720x1280@25fps)
# VFX Overlays: frost, ground
# This is a placeholder for the overlay filtergraph
# Color grade: warm-cinematic
ffmpeg -y -i clip-0.mp4 -i clip-1.mp4 -i clip-2.mp4 -i clip-3.mp4 -filter_complex [0:v][1:v]xfade=transition=fade:duration=0.6:offset=7.4[v1];[v1][2:v]xfade=transition=fade:duration=0.6:offset=14.8[v2];[v2][3:v]xfade=transition=fade:duration=0.6:offset=22.2[v3] -map [v3] -c:v libx264 -preset fast -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k -t 30.20 travel-30s.mp4

# Copy result to output
cp "travel-30s.mp4" /path/to/output/
echo "Done: travel-30s.mp4"
echo "Duration: 30.2s"
echo "Scenes: 4"
