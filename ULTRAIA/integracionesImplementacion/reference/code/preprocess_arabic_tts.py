import re

def preprocess_arabic_for_tts(text: str) -> str:
    """
    Limpia y prepara texto en árabe para motores de Text-to-Speech (ElevenLabs),
    normalizando comas y signos de puntuación para pausas naturales.
    """
    # Elimina caracteres extraños manteniendo puntuación estándar
    text = re.sub(r'[^\u0600-\u06FF\s\.\,\؟\!]', '', text)
    
    # Reemplaza la coma occidental por la coma árabe (،) obligatoria para pausas en TTS
    text = text.replace(',', '،')
    
    # Asegura espacios tras los signos de puntuación
    text = re.sub(r'([،\.\؟\!])(?=[^\s])', r'\1 ', text)
    
    return text.strip()

# Ejemplo de uso:
raw_input = "مرحبا بكم, في هذا الفيديو سنشرح الذكاء الاصطناعي."
clean_output = preprocess_arabic_for_tts(raw_input)
print(clean_output)
# Output: "مرحبا بكم، في هذا الفيديو سنشرح الذكاء الاصطناعي."