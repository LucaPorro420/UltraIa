import hashlib
import json
import sqlite3

# Inicializar Base de Datos de Caché Local
conn = sqlite3.connect('ai_cache.db')
cursor = conn.cursor()
cursor.execute('''
    CREATE TABLE IF NOT EXISTS prompt_cache (
        hash TEXT PRIMARY KEY,
        response_json TEXT
    )
''')
conn.commit()

def get_cached_or_generate(prompt_text: str, generation_function):
    # Crear hash único del prompt
    prompt_hash = hashlib.sha256(prompt_text.encode('utf-8')).hexdigest()
    
    # Buscar en Caché
    cursor.execute('SELECT response_json FROM prompt_cache WHERE hash = ?', (prompt_hash,))
    row = cursor.fetchone()
    
    if row:
        print("[CACHE HIT] Resultado recuperado sin gastar créditos de API.")
        return json.loads(row[0])
    
    # Si no existe, ejecutar la función que consume la API
    print("[CACHE MISS] Solicitando nueva generación a la API...")
    result = generation_function(prompt_text)
    
    # Guardar en DB
    cursor.execute('INSERT INTO prompt_cache (hash, response_json) VALUES (?, ?)', 
                   (prompt_hash, json.dumps(result)))
    conn.commit()
    return result