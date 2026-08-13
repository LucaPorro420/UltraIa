import subprocess

def merge_audio_video_subtitles(video_path: str, audio_path: str, output_path: str, srt_path: str = None):
    """
    Combina video y audio ajustando la duración y quemando subtítulos automáticamente.
    """
    cmd = [
        'ffmpeg',
        '-y',                           # Sobrescribir archivo de salida si existe
        '-i', video_path,               # Entrada de Video
        '-i', audio_path,               # Entrada de Audio
        '-c:v', 'libx264',              # Códec de Video estándar
        '-c:a', 'aac',                  # Códec de Audio estándar
        '-shortest',                    # Cortar el resultado según la duración del elemento más corto
    ]
    
    # Si hay archivo de subtítulos (.srt), los quema directamente en el video
    if srt_path:
        cmd.extend(['-vf', f"subtitles={srt_path}:force_style='FontSize=24,PrimaryColour=&H00FFFFFF'"])
        
    cmd.append(output_path)
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode == 0:
        print(f"Video final renderizado con éxito: {output_path}")
    else:
        print(f"Error en FFmpeg: {result.stderr.decode('utf-8')}")