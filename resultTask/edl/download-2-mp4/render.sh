# generado por capability video_edit (video-use pattern)
# 1. extraer segmentos (fades 30ms + grade):
"ffmpeg" "-y" "-ss" "0.000" "-to" "3.200" "-i" "Download (2).mp4" "-vf" "eq=contrast=1.08:saturation=1.12:brightness=0.02,colorbalance=rs=0.06:bs=-0.04" "-af" "anull,afade=t=in:st=0:d=0.03,afade=t=out:st=3.170:d=0.03" "-c:v" "libx264" "-preset" "veryfast" "-crf" "18" "-r" "30" "-c:a" "aac" "resultTask/edl/download-2-mp4/clip_0.ts"
"ffmpeg" "-y" "-ss" "3.800" "-to" "7.600" "-i" "Download (2).mp4" "-vf" "eq=contrast=1.08:saturation=1.12:brightness=0.02,colorbalance=rs=0.06:bs=-0.04" "-af" "anull,afade=t=in:st=0:d=0.03,afade=t=out:st=3.770:d=0.03" "-c:v" "libx264" "-preset" "veryfast" "-crf" "18" "-r" "30" "-c:a" "aac" "resultTask/edl/download-2-mp4/clip_1.ts"
"ffmpeg" "-y" "-ss" "8.200" "-to" "12.400" "-i" "Download (2).mp4" "-vf" "eq=contrast=1.08:saturation=1.12:brightness=0.02,colorbalance=rs=0.06:bs=-0.04" "-af" "anull,afade=t=in:st=0:d=0.03,afade=t=out:st=4.170:d=0.03" "-c:v" "libx264" "-preset" "veryfast" "-crf" "18" "-r" "30" "-c:a" "aac" "resultTask/edl/download-2-mp4/clip_2.ts"
"ffmpeg" "-y" "-ss" "13.000" "-to" "23.200" "-i" "Download (2).mp4" "-vf" "eq=contrast=1.08:saturation=1.12:brightness=0.02,colorbalance=rs=0.06:bs=-0.04" "-af" "anull,afade=t=in:st=0:d=0.03,afade=t=out:st=10.170:d=0.03" "-c:v" "libx264" "-preset" "veryfast" "-crf" "18" "-r" "30" "-c:a" "aac" "resultTask/edl/download-2-mp4/clip_3.ts"

# 2. escribir lista de concat:
cat > "resultTask/edl/download-2-mp4/concat.txt" << 'EOF'
file 'resultTask/edl/download-2-mp4/clip_0.ts'
file 'resultTask/edl/download-2-mp4/clip_1.ts'
file 'resultTask/edl/download-2-mp4/clip_2.ts'
file 'resultTask/edl/download-2-mp4/clip_3.ts'
EOF

# 3. concat lossless (-c copy):
"ffmpeg" "-y" "-f" "concat" "-safe" "0" "-i" "resultTask/edl/download-2-mp4/concat.txt" "-c" "copy" "-movflags" "+faststart" "resultTask/edl/download-2-mp4/final.mp4"
