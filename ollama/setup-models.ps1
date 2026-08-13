# UltraIa - Crea los 8 modelos tuneados (ultraia-*) sobre Llama 3.1 8B
# Requiere: Ollama instalado y corriendo (https://ollama.com/download)
# Uso: .\setup-models.ps1
$ErrorActionPreference = 'Stop'

Write-Host "=== UltraIa: setup de modelos Ollama ===" -ForegroundColor Cyan

# 1. Modelos base necesarios (tuneados con Modelfile + embedding para memoria/RAG)
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# 2. Crear los 8 modelos de agente a partir de los Modelfiles de esta carpeta
$Modelfiles = @(
  @{ Name = 'ultraia-orquestador'; File = 'Modelfile.orquestador' },
  @{ Name = 'ultraia-investigador'; File = 'Modelfile.investigador' },
  @{ Name = 'ultraia-redactor';     File = 'Modelfile.redactor' },
  @{ Name = 'ultraia-guionista';    File = 'Modelfile.guionista' },
  @{ Name = 'ultraia-disenador';    File = 'Modelfile.disenador' },
  @{ Name = 'ultraia-analista';     File = 'Modelfile.analista' },
  @{ Name = 'ultraia-gestor';       File = 'Modelfile.gestor' },
  @{ Name = 'ultraia-publicador';   File = 'Modelfile.publicador' }
)

foreach ($m in $Modelfiles) {
  Write-Host "Creando $($m.Name) ..." -ForegroundColor Yellow
  ollama create $m.Name -f (Join-Path $PSScriptRoot $m.File)
  if ($LASTEXITCODE -ne 0) { throw "Falló al crear $($m.Name)" }
}

# 3. Verificación
Write-Host "`n=== Modelos disponibles ===" -ForegroundColor Cyan
ollama list

Write-Host "`n=== Verificación rápida (respuesta del Orquestador) ===" -ForegroundColor Cyan
ollama run ultraia-orquestador "Dime en una línea qué haces como agente."

Write-Host "`nListo. Para usarlos: ponia ULTRAIA_MODEL='ultraia-orquestador' en .env, o fija el model de cada agente en la base de datos (ver agents.json)." -ForegroundColor Green
