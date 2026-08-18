// //! REFERENCE COPY (no se usa en la logica real). Originales en packages/core/src/...
// * Copia documentada de los tipos y funciones de dominio que la web importa.
import type { BlueprintDraft } from '../ai/schemas';

// * `Capability` = cada herramienta que un agente puede usar.
// * Es un tipo (union de strings). El valor real se guarda en la columna `tools` (JSON).
export type Capability = 'web' | 'image' | 'video' | 'music' | 'design' | 'branding' | 'chat';

// * `generateBlueprintDraft` pide a la IA que disene un agente a partir de una descripcion.
// * Entrada:  { name?, taskDescription, capabilities? }
// * Salida:   BlueprintDraft (prompt, modelo, herramientas sugeridas, rúbrica de evaluacion)
// * Real en:  packages/core/src/domain/blueprint.ts
export type GenerateBlueprintDraftInput = {
  name?: string | null;
  taskDescription: string;
  /** Capacidades que el usuario quiere sugerir al LLM (filtro sugerido). */
  capabilities?: Capability[];
};

// * `createAgentBlueprint` guarda el borrador en la base de datos (tabla AgentBlueprint + AgentVersion).
// * Real en:  packages/core/src/domain/blueprint.ts
export type CreateAgentBlueprintInput = {
  workspaceId: string;
  name: string;
  taskDescription: string;
  draft: BlueprintDraft;
};

// * `OpenAICompatibleGateway` traduce nuestras llamadas al formato de cualquier API tipo OpenAI.
// * Real en:  packages/core/src/ai/gateway.ts
// * Se usa en: apps/web/src/app/(app)/agents/actions.ts y en las rutas de chat.
export type GatewayNote = 'Ver packages/core/src/ai/gateway.ts para la implementacion real.';
