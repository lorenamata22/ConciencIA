'use client';

import { useEffect, useRef } from 'react';
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  editorViewOptionsCtx,
} from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';

// Editor WYSIWYG markdown-native (Milkdown, base remark-gfm — mesma do chat).
// Headless: nenhum tema do Milkdown é carregado; o visual vem 100% das classes
// do Design System aplicadas via editorViewOptionsCtx (ver `editorClass`).
// O conteúdo entra e sai como markdown puro — compatível com as mensagens do chat.
function Editable({
  defaultValue,
  editorClass,
  onChange,
}: {
  defaultValue: string;
  editorClass: string;
  onChange: (markdown: string) => void;
}) {
  // Ref para sempre chamar o onChange mais recente sem recriar o editor
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  // Ignora a emissão inicial (set do valor default) — só edições do usuário salvam
  const readyRef = useRef(false);

  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, defaultValue);
        // Aplica as classes do Design System diretamente na área editável
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          attributes: { class: editorClass, 'data-note-editor': 'true' },
        }));
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          if (!readyRef.current) return;
          onChangeRef.current(markdown);
        });
      })
      .use(commonmark)
      .use(gfm)
      // history: habilita undo/redo (Ctrl+Z / Ctrl+Y, Cmd no macOS)
      .use(history)
      .use(listener),
  );

  // Libera o salvamento só após o ciclo de criação (evita salvar ao abrir)
  useEffect(() => {
    const timer = setTimeout(() => {
      readyRef.current = true;
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return <Milkdown />;
}

// Remonte por nota (key={noteId} no uso) → o editor reinicializa com o novo
// markdown; não precisa de estado controlado para o conteúdo.
export function NoteEditor(props: {
  defaultValue: string;
  editorClass: string;
  onChange: (markdown: string) => void;
}) {
  return (
    <MilkdownProvider>
      <Editable {...props} />
    </MilkdownProvider>
  );
}
