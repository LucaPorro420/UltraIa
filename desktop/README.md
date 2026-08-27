# UltraIa Desktop Shell (WebView2)

Ventana nativa de Windows que hospeda la app web de UltraIa en un control **WebView2**.
Es la **Fase D, paso 3** del plan Desktop: un shell nativo duradero para un proyecto sin
fecha de final.

## ¿Por qué WebView2 y no Electron?

- **Evergreen**: WebView2 se actualiza solo con el runtime de Microsoft Edge. La ventana no
  queda obsoleta y no arrastra un Chromium propio (Electron empaqueta ~150 MB de navegador).
- **Nativo en Windows**: usa .NET (LTS) + WinForms, sin dependencias pesadas en el workspace
  npm. No afecta `npm run build` / typecheck / lint / test del monorepo.
- **Durabilidad**: la API de WebView2 es estable y soportada a largo plazo por Microsoft.

## Prerrequisitos

1. **.NET 8 SDK** (o runtime): https://dotnet.microsoft.com/download
2. **Microsoft Edge WebView2 Runtime** (ya viene en Windows 11; en Windows 10 instalar desde
   https://developer.microsoft.com/microsoft-edge/webview2/)

## Compilar y ejecutar

```powershell
# Desde la carpeta desktop/
dotnet run -c Release            # ejecuta en modo dev (requiere .NET SDK)

# Publicar un ejecutable único para distribuir (win-x64)
dotnet publish -c Release -r win-x64 --self-contained false -o dist
./dist/UltraIa.exe
```

## Comportamiento

- Si la variable de entorno `ULTRAIA_URL` está definida, el shell navega directamente a esa
  URL (p. ej. una instancia desplegada en Vercel) y **no** arranca ningún servidor local.
- Si no, comprueba `http://localhost:3000`. Si no responde, lanza `python start.py` (web + webhooks)
  desde la raíz del repo y espera hasta 90s a que esté listo.
- Los enlaces externos (`NewWindowRequested`) se abren en el navegador del sistema, no dentro
  del shell, para no atrapar al usuario.
- Al cerrar la ventana se detiene el servidor local si este lo arrancó.

## Notas

- El ejecutable busca `start.py` subiendo hasta 6 niveles desde su ubicación; colócalo dentro
  del repo (p. ej. `desktop/UltraIa.exe`) o usa `ULTRAIA_URL` para apuntar a un deploy.
- Los artefactos de build (`bin/`, `obj/`) están en `.gitignore`.
