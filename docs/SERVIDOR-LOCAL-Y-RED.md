# UltraIa como servidor local y servidor de red

Esta guía deja UltraIa funcionando **sin pagar hosting**: el equipo Windows ejecuta
la web, los webhooks y el Gen-Engine; otros equipos de la misma Wi-Fi/LAN acceden
por la IP privada del equipo servidor.

## 1. Qué se obtiene

| Servicio | Solo en este equipo | Desde otro equipo de la LAN |
|---|---|---|
| Web Next.js | `http://localhost:3000` | `http://IP_DEL_SERVIDOR:3000` |
| Webhooks FastAPI | `http://localhost:8000` | `http://IP_DEL_SERVIDOR:8000` |
| Gen-Engine FastAPI | `http://localhost:8100/health` | `http://IP_DEL_SERVIDOR:8100/health` |

Esto no publica el proyecto en Internet y no necesita tarjeta ni servicio cloud.
El costo es **$0**, mientras el PC esté encendido y conectado a la red.

## 2. Primera instalación

Abre PowerShell en la raíz del repositorio:

```powershell
cd C:\Users\UTEC-5695\Desktop\UltraIa
python start.py --install
```

Requisitos: Node.js 20 o superior, Python 3.10 o superior y npm. El instalador
crea los `.env` faltantes, instala dependencias y prepara SQLite.

Para IA completamente local, instala Ollama y descarga un modelo:

```powershell
ollama pull llama3.1
```

Las claves de proveedores externos son opcionales. No copies claves reales en este
archivo ni las subas a Git.

## 3. Preparar el Firewall de Windows

Solo hace falta una vez. Abre PowerShell **como Administrador**:

```powershell
cd C:\Users\UTEC-5695\Desktop\UltraIa
powershell -ExecutionPolicy Bypass -File scripts\permitir-red.ps1
```

El script permite TCP 3000, 8000 y 8100 únicamente en el perfil de red `Private`.
Si Windows muestra la red como `Public`, cambia el perfil de la Wi-Fi a `Private`
antes de ejecutar el script. Para eliminar las reglas:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\permitir-red.ps1 -Remove
```

## 4. Arrancar el servidor

Desde la raíz:

```powershell
python start.py --lan --clean --no-open
```

`--lan` escucha en todas las interfaces para que entren el móvil y otros PCs.
`--clean` libera procesos UltraIa antiguos en esos puertos, pero nunca mata
procesos desconocidos. `--no-open` evita abrir un navegador automáticamente.

Alternativa que detecta la RAM y elige modo ligero o estándar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\iniciar-local.ps1 -Lan
```

Cuando todo esté listo, la consola imprime las URLs LAN detectadas. En este equipo
la IP observada actualmente es `192.168.1.7`, por lo que normalmente se usaría:

```text
Web:      http://192.168.1.7:3000
Webhooks: http://192.168.1.7:8000
GenEngine: http://192.168.1.7:8100/health
```

La IP puede cambiar si el router renueva DHCP. Si una URL deja de funcionar,
ejecuta:

```powershell
ipconfig
```

y usa la dirección `IPv4` del adaptador Wi-Fi o Ethernet activo.

## 5. Probar desde el móvil u otro PC

1. Conecta el móvil/PC y el servidor a la **misma Wi-Fi**.
2. Abre `http://IP_DEL_SERVIDOR:3000` en el navegador.
3. Para la app móvil, define `EXPO_PUBLIC_API_URL` con
   `http://IP_DEL_SERVIDOR:3000` y arranca Expo.
4. No uses `localhost` desde el móvil: `localhost` significa el propio móvil.

Prueba rápida desde otro Windows:

```powershell
Test-NetConnection 192.168.1.7 -Port 3000
```

El resultado correcto incluye `TcpTestSucceeded : True`.

## 6. Detener y volver a arrancar

En la ventana del servidor pulsa `Ctrl+C`. El lanzador termina el árbol completo
de Node/Python y libera los puertos.

Para iniciar solo la web:

```powershell
python start.py --web --lan --clean --no-open
```

Para una máquina con poca RAM:

```powershell
python start.py --lite --lan --clean --no-open --ram-mb 512
```

## 7. Diagnóstico

```powershell
python start.py --check-connections
python start.py --help
```

Si otro equipo no conecta:

- confirma que ambos dispositivos estén en la misma red;
- confirma que el perfil de Windows sea `Private`;
- vuelve a ejecutar `permitir-red.ps1` como Administrador;
- revisa que el servidor siga mostrando `Web UP`;
- verifica que el router no tenga aislamiento de clientes Wi-Fi;
- usa la IP actual de `ipconfig`, no una IP antigua.

## 8. Seguridad

Este modo es para una red confiable. No abras los puertos 3000, 8000 o 8100 en el
router ni hagas port-forwarding. Para compartir fuera de casa se necesita HTTPS,
autenticación reforzada y un despliegue cloud; eso es distinto de este servidor
local gratuito.

## 9. Comando diario recomendado

```powershell
cd C:\Users\UTEC-5695\Desktop\UltraIa
python start.py --lan --clean --no-open
```

Deja esa ventana abierta mientras uses UltraIa desde el PC, móvil o tablet.
