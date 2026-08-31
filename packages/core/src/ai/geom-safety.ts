/**
 * Validación segura de expresiones matemáticas.
 *
 * VULN-001: Previene RCE via new Function() con input del LLM.
 *
 * Patrón: whitelist de caracteres permitidos + blacklist de patrones peligrosos.
 * No es un sandbox completo, pero bloquea los vectores de ataque conocidos.
 */

/**
 * Caracteres permitidos en expresiones matemáticas:
 * - Números, operadores, paréntesis, corchetes
 * - Math.*, u, v, p (variables del shader)
 * - Espacios, comas, puntos
 */
const SAFE_CHARS = /^[a-zA-Z0-9\s\+\-\*\/\(\)\[\]\{\}\,\.\:\=]*$/;

/**
 * Patrones peligrosos que siempre deben ser rechazados.
 * Estos son los vectores de ataque principales para RCE en Node.js.
 */
const DANGEROUS_PATTERNS = [
  // Module loading
  /\brequire\s*\(/,
  /\bimport\s*\(/,
  /\bmodule\s*\./,
  
  // Process manipulation
  /\bprocess\s*\./,
  /\bglobal\s*\./,
  /\bglobalThis\s*\./,
  
  // Code execution
  /\beval\s*\(/,
  /\bexec\s*\(/,
  /\bexecSync\s*\(/,
  /\bspawn\s*\(/,
  /\bfork\s*\(/,
  
  // Child process
  /\bchild_process\b/,
  /\bchild\.process\b/,
  
  // Prototype pollution
  /\b__proto__\b/,
  /\bconstructor\s*[[.(]/,
  /\bprototype\s*[[.(]/,
  /\bthis\b/,
  
  // Dangerous string operations
  /\bFunction\s*\(/,
  /\bsetTimeout\s*\(['"\x60]/,
  /\bsetInterval\s*\(['"\x60]/,
  
  // File system access
  /\breadFileSync\b/,
  /\bwriteFileSync\b/,
  /\bunlinkSync\b/,
  
  // Network access
  /\bfetch\s*\(/,
  /\bhttp\s*\./,
  /\bhttps\s*\./,
  /\bXMLHttpRequest\b/,
  
  // Shell commands
  /\bspawnSync\s*\(/,
  /\bexecFileSync\s*\(/,
];

/**
 * Verifica si una expresión matemática es segura para usar en new Function().
 *
 * @param expression - La expresión a validar
 * @returns true si la expresión es segura, false si contiene código peligroso
 */
export function isSafeMathExpression(expression: string): boolean {
  // Rechazar vacío o solo espacios
  if (!expression || !expression.trim()) {
    return false;
  }

  // Verificar caracteres permitidos
  if (!SAFE_CHARS.test(expression)) {
    return false;
  }

  // Verificar patrones peligrosos
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(expression)) {
      return false;
    }
  }

  return true;
}
