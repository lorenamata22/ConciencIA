"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FeedbackModal,
  ModalSuccessIcon,
  ModalWarningIcon,
} from "@/components/ui/feedback-modal";
import type { CourseOption } from "@/lib/api/subject";
import {
  createSubjectWithModules,
  parseProgram,
  type OrphanLine,
  type ProgramCoverage,
} from "@/lib/api/subjects";
import { SubjectForm } from "./subject-form";
import { ProgramPreview } from "./program-preview";
import { ProgramReview } from "./program-review";
import {
  canRegister as canRegisterModules,
  emptyModule,
  emptyTopic,
  toCreatePayload,
  toReviewModules,
  type ReviewModule,
  type ReviewTopic,
} from "./review-state";

// preview: resultado do parse somente leitura (aprovar ou editar)
// review: mesma estrutura em modo de edição
type Phase = "form" | "parsing" | "preview" | "review" | "done";

const isOk = (status: number) => status >= 200 && status < 300;

export function NewSubjectPage({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("form");
  const [persisting, setPersisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [modules, setModules] = useState<ReviewModule[]>([]);
  const [coverage, setCoverage] = useState<ProgramCoverage | null>(null);
  const [orphans, setOrphans] = useState<OrphanLine[]>([]);
  const [createdName, setCreatedName] = useState("");
  // Arquivo que originou o parse atual — evita re-analisar (custo de IA) ao
  // voltar ao form e avançar de novo sem trocar o programa
  const [parsedFile, setParsedFile] = useState<File | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Aviso ao sair enquanto houver review não persistido
  useEffect(() => {
    if (phase !== "preview" && phase !== "review") return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  // ── Parse (Siguiente) ──────────────────────────────────────────────────
  const runParse = useCallback(async () => {
    if (!file) return;

    // Mesmo arquivo já analisado: retoma a estrutura em memória (com as edições
    // do usuário) em vez de gastar outra chamada de IA
    if (file === parsedFile && modules.length > 0) {
      setError(null);
      setPhase("preview");
      return;
    }

    setPhase("parsing");
    setError(null);

    const result = await parseProgram(file);
    if (isOk(result.statusCode) && result.data) {
      setModules(toReviewModules(result.data.modules));
      setCoverage(result.data.coverage);
      setOrphans(result.data.orphan_lines);
      setParsedFile(file);
      setPhase("preview");
      return;
    }

    setPhase("form");
    if (result.statusCode === 400) {
      setError(
        result.message || "Archivo inválido. Sube un PDF o DOCX (≤1MB).",
      );
    } else if (result.statusCode === 422) {
      setError(
        result.message ||
          "No pudimos estructurar el documento. Prueba con otro archivo.",
      );
    } else {
      setError(
        result.message || "Ocurrió un problema al analizar el programa.",
      );
    }
  }, [file, parsedFile, modules.length]);

  // ── Persist (Registrar asignatura) ─────────────────────────────────────
  const runRegister = useCallback(async () => {
    setPersisting(true);
    setError(null);

    const result = await createSubjectWithModules(
      toCreatePayload(courseId, name, modules),
    );
    setPersisting(false);
    if (isOk(result.statusCode) && result.data) {
      setCreatedName(result.data.name ?? name);
      setPhase("done");
      return;
    }

    // Erro no POST: mantém a tela atual (preview ou review) — não perde o trabalho
    setError(
      result.message ||
        "No pudimos registrar la asignatura. Inténtalo de nuevo.",
    );
  }, [courseId, name, modules]);

  // ── Mutações do review (imutáveis) ─────────────────────────────────────
  const renameModule = useCallback((moduleKey: string, value: string) => {
    setModules((prev) =>
      prev.map((m) => (m.key === moduleKey ? { ...m, name: value } : m)),
    );
  }, []);

  const removeModule = useCallback((moduleKey: string) => {
    setModules((prev) => prev.filter((m) => m.key !== moduleKey));
  }, []);

  const addModule = useCallback(() => {
    setModules((prev) => [...prev, emptyModule()]);
  }, []);

  const addTopic = useCallback((moduleKey: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.key === moduleKey ? { ...m, topics: [...m.topics, emptyTopic()] } : m,
      ),
    );
  }, []);

  const removeTopic = useCallback((moduleKey: string, topicKey: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.key === moduleKey
          ? { ...m, topics: m.topics.filter((t) => t.key !== topicKey) }
          : m,
      ),
    );
  }, []);

  const changeTopic = useCallback(
    (
      moduleKey: string,
      topicKey: string,
      patch: Partial<Pick<ReviewTopic, "title" | "description">>,
    ) => {
      setModules((prev) =>
        prev.map((m) =>
          m.key === moduleKey
            ? {
                ...m,
                topics: m.topics.map((t) =>
                  t.key === topicKey ? { ...t, ...patch } : t,
                ),
              }
            : m,
        ),
      );
    },
    [],
  );

  const hasParsed = phase === "preview" || phase === "review";

  const subtitle =
    phase === "preview"
      ? "Administra los módulos generados a partir del programa de asignaturas subido en la etapa anterior."
      : phase === "review"
        ? "Revisa la estructura extraída del programa y ajústala antes de registrar."
        : "Sube el programa de asignatura y la IA lo organizará en módulos y temas.";

  return (
    <div className="px-10 pt-10 pb-16 md:px-30">
      <div className="mt-15 mb-10">
        <Link
          href="/institution/subjects"
          onClick={(event) => {
            // Estrutura parseada e não registrada: confirma antes de descartar
            if (!hasParsed) return;
            event.preventDefault();
            setConfirmLeave(true);
          }}
          className="flex w-fit items-center gap-1.5 text-sm text-brand-label transition-colors hover:text-brand-brown"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="text-4xl text-brand">
          {hasParsed ? "Programa de asignatura" : "Nueva Asignatura"}
        </h1>
        <p className="mt-1 text-sm text-brand-label">{subtitle}</p>
      </div>

      {phase === "preview" ? (
        <ProgramPreview
          subjectName={name}
          modules={modules}
          canRegister={canRegisterModules(courseId, name, modules)}
          persisting={persisting}
          error={error}
          onEdit={() => setPhase("review")}
          onBack={() => setPhase("form")}
          onRegister={runRegister}
        />
      ) : phase === "review" && coverage ? (
        <ProgramReview
          modules={modules}
          coverage={coverage}
          orphans={orphans}
          canRegister={canRegisterModules(courseId, name, modules)}
          persisting={persisting}
          error={error}
          subjectName={name}
          onRenameModule={renameModule}
          onRemoveModule={removeModule}
          onAddModule={addModule}
          onAddTopic={addTopic}
          onRemoveTopic={removeTopic}
          onTopicChange={changeTopic}
          onBack={() => setPhase("preview")}
          onRegister={runRegister}
        />
      ) : (
        <SubjectForm
          courses={courses}
          name={name}
          courseId={courseId}
          file={file}
          error={error}
          submitting={phase === "parsing"}
          onNameChange={setName}
          onCourseChange={setCourseId}
          onSelectFile={(f) => {
            setError(null);
            setFile(f);
          }}
          onClearFile={() => setFile(null)}
          onError={setError}
          onSubmit={runParse}
        />
      )}

      <FeedbackModal
        open={phase === "done"}
        onClose={() => router.push("/institution/subjects")}
        icon={<ModalSuccessIcon />}
        title="¡Asignatura registrada!"
        titleColor="text-[#6EC090]"
        description={
          <>
            La asignatura{" "}
            <span className="font-medium text-brand-brown">
              &quot;{createdName}&quot;
            </span>{" "}
            fue creada correctamente.
          </>
        }
        actions={
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => router.push("/institution/subjects")}
              className="rounded-xl bg-[#999DA3] px-4 py-3 text-sm font-medium text-white transition-colors"
            >
              Ver asignaturas
            </button>
          </div>
        }
      />

      <FeedbackModal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        icon={<ModalWarningIcon />}
        title="¿Salir sin registrar?"
        description="La estructura generada a partir del programa se perderá y tendrás que subir el archivo de nuevo."
        actions={
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setConfirmLeave(false)}
              className="rounded-xl bg-[#999DA3] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#999DA3]/90"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={() => router.push("/institution/subjects")}
              className="rounded-xl border border-brand-border px-4 py-3 text-sm font-medium text-brand-label transition-colors hover:bg-brand-border/30"
            >
              Salir
            </button>
          </div>
        }
      />
    </div>
  );
}
