"use client";

import { useCallback, useState } from "react";
import {
  emptyModule,
  emptyTopic,
  type ReviewModule,
  type ReviewTopic,
} from "./review-state";

// Estado editável da estrutura + mutações imutáveis. Compartilhado pelo
// cadastro (Nueva Asignatura) e pela edição de matéria existente.
export function useReviewModules(initial: ReviewModule[] = []) {
  const [modules, setModules] = useState<ReviewModule[]>(initial);

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

  return {
    modules,
    setModules,
    renameModule,
    removeModule,
    addModule,
    addTopic,
    removeTopic,
    changeTopic,
  };
}

export type ReviewModulesController = ReturnType<typeof useReviewModules>;
