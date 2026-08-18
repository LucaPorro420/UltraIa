#!/bin/bash
# ============================================================================
# MASTER TRAVEL VIDEO GENERATOR
# Generates travel videos (30s, 60s, 2min, 30min) from @tomassporro footage
# with procedural VFX, music, TTS narration, and cinematic effects
#
# Usage:
#   VIDEOS_TO_GENERATE="30s,60s,2min" bash scripts/generate-all-travel-videos.sh
#   VIDEOS_TO_GENERATE="30min" bash scripts/generate-all-travel-videos.sh
# ============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FOOTAGE_DIR="$ROOT_DIR/VideoTask&Memory/historyTravelTP"
OUTPUT_DIR="$ROOT_DIR/resultTask/travel/output"
SCRIPTS_DIR="$ROOT_DIR/scripts"
MANIFESTS_DIR="$ROOT_DIR/resultTask/travel"

# Parse VIDEOS_TO_GENERATE env var (comma-separated)
# Default: 30s,60s,2min (skip 30min as it's very long)
IFS=',' read -ra VIDEOS_TO_GENERATE <<< "${VIDEOS_TO_GENERATE:-30s,60s,2min}"

mkdir -p "$OUTPUT_DIR"

echo "========================================================================"
echo "ULTRAIA TRAVEL VIDEO GENERATOR"
echo "========================================================================"
echo "Footage:  $FOOTAGE_DIR"
echo "Output:   $OUTPUT_DIR"
echo "Manifests: $MANIFESTS_DIR"
echo "Videos:   ${VIDEOS_TO_GENERATE[*]}"
echo ""

# Check dependencies
check_deps() {
  local missing=()
  command -v ffmpeg >/dev/null 2>&1 || missing+=("ffmpeg")
  command -v ffprobe >/dev/null 2>&1 || missing+=("ffprobe")
  command -v node >/dev/null 2>&1 || missing+=("node")
  command -v edge-tts >/dev/null 2>&1 || missing+=("edge-tts")
  
  if [ ${#missing[@]} -gt 0 ]; then
    echo "ERROR: Missing dependencies: ${missing[*]}"
    echo "Install: apt install ffmpeg python3-pip && pip install edge-tts"
    exit 1
  fi
  
  echo "Dependencies OK: ffmpeg, ffprobe, node, edge-tts"
}

# Generate TTS narration using edge-tts CLI
generate_tts() {
  local text="$1"
  local output="$2"
  local voice="${3:-es-ES-AlvaroNeural}"
  
  echo "Generating TTS: $output"
  edge-tts --text "$text" --voice "$voice" --write-media "$output" 2>/dev/null || {
    echo "WARNING: edge-tts failed for $output, creating silent placeholder"
    # Create minimal silent MP3 (1s)
    ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t 1 -c:a libmp3lame -b:a 32k "$output" -y -loglevel error
  }
}

# Generate all TTS files for a plan
generate_plan_tts() {
  local plan_file="$1"
  local prefix="$2"
  
  echo "Generating TTS for $prefix..."
  
  # Extract texts from plan using node
  node -e "
    const plan = JSON.parse(require('fs').readFileSync('$plan_file', 'utf-8'));
    const texts = [
      { name: 'hook', text: plan.hook },
      ...plan.escenas.map((e, i) => ({ name: 'scene-' + i, text: e.narracion })),
      { name: 'cta', text: plan.cta }
    ];
    texts.forEach(t => console.log(t.name + '|' + t.text));
  " | while IFS='|' read -r name text; do
    generate_tts "$text" "$OUTPUT_DIR/${prefix}-${name}.mp3"
  done
}

# Main generation function for one video
generate_video() {
  local duration="$1"
  local plan_file="$MANIFESTS_DIR/plan-${duration}.json"
  local render_script="$SCRIPTS_DIR/render-travel-${duration}.sh"
  local output_file="$OUTPUT_DIR/travel-${duration}.mp4"
  
  echo ""
  echo "========================================================================"
  echo "GENERATING: travel-${duration}.mp4"
  echo "========================================================================"
  
  if [ ! -f "$plan_file" ]; then
    echo "ERROR: Plan not found: $plan_file"
    return 1
  fi
  
  if [ ! -f "$render_script" ]; then
    echo "ERROR: Render script not found: $render_script"
    return 1
  fi
  
  # Generate TTS
  generate_plan_tts "$plan_file" "travel-${duration}"
  
  # Copy footage to temp and run render
  echo "Preparing footage..."
  local tmpdir=$(mktemp -d)
  cp "$FOOTAGE_DIR"/*.mp4 "$tmpdir/" 2>/dev/null || true
  
  # Create a modified render script that uses the actual footage paths
  local custom_render="$tmpdir/render-${duration}.sh"
  sed "s|/path/to/VideoTask&Memory/historyTravelTP|$FOOTAGE_DIR|g; s|/path/to/output|$OUTPUT_DIR|g" "$render_script" > "$custom_render"
  chmod +x "$custom_render"
  
  echo "Running render script in $tmpdir..."
  cd "$tmpdir"
  
  # Run the render
  if bash "$custom_render" 2>&1 | tee render.log; then
    echo "Render completed successfully"
  else
    echo "WARNING: Render script exited with error (check render.log)"
  fi
  
  # Check result
  if [ -f "$tmpdir/travel-${duration}.mp4" ]; then
    cp "$tmpdir/travel-${duration}.mp4" "$output_file"
    echo "SUCCESS: $output_file"
    ffprobe -v error -show_entries format=duration,bit_rate,size -of default=noprint_wrappers=1:nokey=1 "$output_file" | \
      awk -F= '{printf "  %s: %s\n", $1, $2}'
  else
    echo "WARNING: Render did not produce output"
    echo "Check: $custom_render"
    echo "Last 20 lines of log:"
    tail -20 "$tmpdir/render.log" || true
  fi
  
  # Cleanup
  rm -rf "$tmpdir"
}

# ============================================================================
# MAIN
# ============================================================================

check_deps

# Generate requested videos
for dur in "${VIDEOS_TO_GENERATE[@]}"; do
  # Trim whitespace
  dur=$(echo "$dur" | xargs)
  
  case "$dur" in
    30s|60s|2min)
      generate_video "$dur"
      ;;
    30min)
      echo ""
      echo "========================================================================"
      echo "30min video: Generating (this takes ~30-60 minutes)..."
      echo "========================================================================"
      generate_video "30min"
      ;;
    *)
      echo "WARNING: Unknown duration '$dur', skipping"
      ;;
  esac
done

echo ""
echo "========================================================================"
echo "GENERATION COMPLETE"
echo "========================================================================"
echo "Output directory: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"/*.mp4 2>/dev/null || echo "No MP4 files generated"
echo ""
echo "Manifests: $MANIFESTS_DIR"
ls -la "$MANIFESTS_DIR"/*.json
echo ""
echo "Render scripts: $SCRIPTS_DIR"
ls -la "$SCRIPTS_DIR"/render-travel-*.sh