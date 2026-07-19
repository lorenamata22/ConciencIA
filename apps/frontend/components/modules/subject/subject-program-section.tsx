"use client";

import { useCallback, useState } from "react";
import {
  FeedbackModal,
  ModalWarningIcon,
} from "@/components/ui/feedback-modal";
import {
  parseProgram,
  syncSubjectStructure,
  type StoredModule,
} from "@/lib/api/subjects";
import { ProgramStructureView } from "./program-structure-view";
import { ProgramModulesEditor } from "./program-modules-editor";
import { ProgramUpload } from "./program-upload";
import { useReviewModules } from "./use-review-modules";
import {
  canRegister,
  toReviewFromStored,
  toReviewModules,
  toSyncPayload,
  type ReviewModule,
} from "./review-state";

// Fases do bloco "Programa de asignatura" na edição de matéria:
//   view     → estrutura atual, somente leitura
//   edit     → modal de edição manual (preserva ids → preserva dados do aluno)
//   warn     → aviso de que o upload reescreve todo o programa
//   upload   → seleção do arquivo
//   parsing  → chamada de IA em curso
//   preview  → estrutura NOVA, ainda não persistida
//   review   → estrutura nova em modo de edição
type Phase = "view" | "edit" | "warn" | "upload" | "parsing" | "preview" | "review";

const isOk = (status: number) => status >= 200 && status < 300;

export function SubjectProgramSection({
  subjectId,
  subjectName,
  modules: storedModules,
}: {
  subjectId: string;
  subjectName: string;
  modules: StoredModule[];
}) {
  const [phase, setPhase] = useState<Phase>("view");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estrutura persistida em tela (só troca depois de um save bem-sucedido)
  const [current, setCurrent] = useState<ReviewModule[]>(() =>
    toReviewFromStored(storedModules),
  );

  const [file, setFile] = useState<File | null>(null);

  // Rascunho: usado tanto pela edição manual quanto pelo programa novo
  const draft = useReviewModules([]);
  const { modules: draftModules, setModules: setDraftModules } = draft;

  const openEditor = useCallback(() => {
    setError(null);
    setDraftModules(current);
    setPhase("edit");
  }, [current, setDraftModules]);

  const closeDraft = useCallback(() => {
    setError(null);
    setFile(null);
    setDraftModules([]);
    setPhase("view");
  }, [setDraftModules]);

  // ── Persistência (comum aos dois fluxos) ───────────────────────────────
  const save = useCallback(async () => {
    setSaving(true);
    setError(null);

    const result = await syncSubjectStructure(
      subjectId,
      toSyncPayload(draftModules),
    );
    setSaving(false);

    if (isOk(result.statusCode) && result.data) {
      setCurrent(toReviewFromStored(result.data.modules));
      setFile(null);
      setDraftModules([]);
      setPhase("view");
      return;
    }

    // 409 = tópico removido está em uso (progresso/chat/prueba/material).
    // Mantém o rascunho em tela para o usuário corrigir.
    setError(
      result.message || "No pudimos guardar el programa. Inténtalo de nuevo.",
    );
  }, [subjectId, draftModules, setDraftModules]);

  // ── Parse do programa novo ─────────────────────────────────────────────
  const runParse = useCallback(async () => {
    if (!file) return;
    setPhase("parsing");
    setError(null);

    const result = await parseProgram(file);
    if (isOk(result.statusCode) && result.data) {
      // Sem ids: é estrutura nova, substitui a anterior por inteiro
      setDraftModules(toReviewModules(result.data.modules));
      setPhase("preview");
      return;
    }

    setPhase("upload");
    setError(
      result.message || "No pudimos analizar el programa. Prueba con otro archivo.",
    );
  }, [file, setDraftModules]);

  const canSave = canRegister("ok", subjectName, draftModules);
  const inNewProgram =
    phase === "preview" || phase === "review" || phase === "parsing";
  // Matéria ainda sem programa: é o primeiro upload, não uma substituição —
  // nada de avisos de replace nem de edição manual de uma estrutura vazia
  const isFirstProgram = current.length === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Estrutura persistida — sai de cena enquanto um programa novo é revisado */}
      {!inNewProgram && phase !== "upload" && (
        <>
          {isFirstProgram ? (
            <div className="rounded-2xl border border-dashed border-brand-border px-6 py-10 text-center">
              <p className="text-sm text-brand-label">
                Todavía no hay programa para esta asignatura.
              </p>
              <p className="mt-1 text-sm text-brand-placeholder">
                Sube el archivo y la IA lo organizará en módulos y temas.
              </p>
            </div>
          ) : (
            <ProgramStructureView subjectName={subjectName} modules={current} />
          )}

          <div className="flex flex-wrap gap-3">
            {!isFirstProgram && (
              <button
                type="button"
                onClick={openEditor}
                className="rounded-xl border border-brand-border px-5 py-3 text-sm font-medium text-brand-label transition-colors hover:bg-brand-border/30"
              >
                Editar programa
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setError(null);
                // Sem estrutura anterior não há o que substituir: vai direto
                setPhase(isFirstProgram ? "upload" : "warn");
              }}
              className="rounded-xl border border-brand-border px-5 py-3 text-sm font-medium text-brand-label transition-colors hover:bg-brand-border/30"
            >
              {isFirstProgram ? "Subir programa" : "Subir nuevo programa"}
            </button>
          </div>
        </>
      )}

      {/* Upload do programa novo */}
      {phase === "upload" || phase === "parsing" ? (
        <div className="flex flex-col gap-5">
          <ProgramUpload
            file={file}
            onSelect={(f) => {
              setError(null);
              setFile(f);
            }}
            onClear={() => setFile(null)}
            onError={setError}
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={closeDraft}
              className="rounded-xl border border-brand-border px-5 py-3 text-sm font-medium text-brand-label transition-colors hover:bg-brand-border/30"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={runParse}
              disabled={!file || phase === "parsing"}
              className="rounded-xl bg-[#999DA3] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#999DA3]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === "parsing" ? "Analizando el programa..." : "Siguiente"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Programa novo: preview e review — nada foi persistido ainda */}
      {phase === "preview" || phase === "review" ? (
        <div className="flex flex-col gap-5">
          {!isFirstProgram && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Este programa reemplazará por completo el temario actual. Nada se
              guarda hasta que confirmes.
            </p>
          )}

          {phase === "preview" ? (
            <ProgramStructureView
              subjectName={subjectName}
              modules={draftModules}
            />
          ) : (
            <ProgramModulesEditor controller={draft} />
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={closeDraft}
              disabled={saving}
              className="rounded-xl border border-brand-border px-5 py-3 text-sm font-medium text-brand-label transition-colors hover:bg-brand-border/30 disabled:opacity-60"
            >
              Cancelar
            </button>
            {phase === "preview" && (
              <button
                type="button"
                onClick={() => setPhase("review")}
                className="rounded-xl border border-brand-border px-5 py-3 text-sm font-medium text-brand-label transition-colors hover:bg-brand-border/30"
              >
                Editar
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!canSave || saving}
              className="rounded-xl bg-[#999DA3] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#999DA3]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar programa"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Aviso antes do upload */}
      <FeedbackModal
        open={phase === "warn"}
        onClose={() => setPhase("view")}
        icon={<ModalWarningIcon />}
        title="¿Subir un nuevo programa?"
        description="El nuevo programa va a reescribir por completo el temario actual. Los temas que ya tengan progreso, conversaciones o exámenes de alumnos no podrán eliminarse."
        actions={
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setPhase("view")}
              className="rounded-xl border border-brand-border px-4 py-3 text-sm font-medium text-brand-label transition-colors hover:bg-brand-border/30"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setPhase("upload")}
              className="rounded-xl bg-[#999DA3] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#999DA3]/90"
            >
              Continuar
            </button>
          </div>
        }
      />

      {/* Edição manual do temario existente */}
      {phase === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-8">
            <h2 className="mb-1 text-xl text-brand-brown">Editar programa</h2>
            <p className="mb-6 text-sm text-brand-label">
              Ajusta módulos y temas. Los temas existentes conservan el progreso
              de los alumnos.
            </p>

            <ProgramModulesEditor controller={draft} />

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            <div className="mt-8 flex justify-end gap-4">
              <button
                type="button"
                onClick={closeDraft}
                disabled={saving}
                className="rounded-xl border border-brand-border px-5 py-3 text-sm font-medium text-brand-label transition-colors hover:bg-brand-border/30 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!canSave || saving}
                className="rounded-xl bg-[#999DA3] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#999DA3]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
