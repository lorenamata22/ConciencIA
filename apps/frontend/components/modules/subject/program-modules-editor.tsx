"use client";

import { useState } from "react";
import { ModuleAccordion } from "./module-accordion";
import type { ReviewModulesController } from "./use-review-modules";

// Lista editável de módulos/tópicos + "Añadir módulo". Compartilhada pelo
// review do cadastro e pelo modal de edição do programa.
export function ProgramModulesEditor({
  controller,
}: {
  controller: ReviewModulesController;
}) {
  const {
    modules,
    renameModule,
    removeModule,
    addModule,
    addTopic,
    removeTopic,
    changeTopic,
  } = controller;

  // Um módulo aberto por vez (padrão do Figma)
  const [openKey, setOpenKey] = useState<string | null>(
    modules[0]?.key ?? null,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {modules.map((module, index) => (
          <ModuleAccordion
            key={module.key}
            module={module}
            index={index}
            open={openKey === module.key}
            onToggle={() =>
              setOpenKey((current) =>
                current === module.key ? null : module.key,
              )
            }
            onRename={(name) => renameModule(module.key, name)}
            onRemove={() => removeModule(module.key)}
            onAddTopic={() => addTopic(module.key)}
            onRemoveTopic={(topicKey) => removeTopic(module.key, topicKey)}
            onTopicChange={(topicKey, patch) =>
              changeTopic(module.key, topicKey, patch)
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addModule}
        className="w-fit rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-label transition-colors hover:bg-brand-border/30"
      >
        + Añadir módulo
      </button>
    </div>
  );
}
