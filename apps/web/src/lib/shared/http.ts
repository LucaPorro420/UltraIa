// //! REFERENCE COPY (no se usa en la app). Original real: apps/web/src/app/(app)/studio/studio-client.tsx
// * Copia comentada de los helpers HTTP que el Studio usa para llamar a sus propias API.
// * Se repite 7 veces dentro del Studio; aquí se explica una sola vez.

// * `postJson` envia datos en formato JSON con metodo POST y devuelve el JSON de respuesta.
// ? Si el servidor responde con error (res.ok == false), lanza un Error legible.
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Request failed');
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// * `getJson` es la version de solo-lectura (GET). La app casi no la usa, pero la dejamos documentada.
export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Request failed');
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
