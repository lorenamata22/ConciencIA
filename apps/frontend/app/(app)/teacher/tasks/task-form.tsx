'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createTaskAction, updateTaskAction, type TaskActionState } from '@/app/actions/task';
import { FormField, inputClass, ObjectSelect, MultiSelect } from '@/components/ui/form';
import { FeedbackModal, ModalSuccessIcon, ModalErrorIcon } from '@/components/ui/feedback-modal';
import type { TaskDetail, TaskFormOptions } from '@/lib/api/task';

export function TaskForm({
  options,
  task,
}: {
  options: TaskFormOptions;
  task?: TaskDetail;
}) {
  const isEdit = !!task;
  const boundAction = isEdit
    ? updateTaskAction.bind(null, task.id)
    : createTaskAction;
  const [state, action, isPending] = useActionState<TaskActionState, FormData>(
    boundAction,
    { error: null },
  );
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.error || state.success) setShowModal(true);
  }, [state]);

  const isSuccess = !!state.success;

  const subjectOptions = options.subjects.map((s) => ({ id: s.id, label: s.name }));
  const classOptions = options.classes.map((c) => ({ id: c.id, label: c.name }));
  const onlySubject = options.subjects.length === 1 ? options.subjects[0] : null;
  const defaultSubjectId = task?.subject.id ?? onlySubject?.id;
  const defaultClassIds = task?.classes.map((c) => c.id) ?? [];

  return (
    <>
      <FeedbackModal
        open={showModal}
        onClose={() => setShowModal(false)}
        icon={isSuccess ? <ModalSuccessIcon /> : <ModalErrorIcon />}
        title={
          isSuccess
            ? isEdit
              ? '¡Tarea actualizada!'
              : '¡Tarea registrada con éxito!'
            : 'No pudimos guardar la tarea'
        }
        titleColor={isSuccess ? 'text-[#6EC090]' : 'text-[#D86262]'}
        description={
          isSuccess ? (
            <>
              La tarea{' '}
              <span className="font-medium text-brand-brown">
                &quot;{state.taskName}&quot;
              </span>{' '}
              ha sido {isEdit ? 'actualizada' : 'registrada'} correctamente.
            </>
          ) : (
            <>
              Ocurrió un problema al procesar la solicitud.
              <br />
              {state.error}
            </>
          )
        }
        actions={
          isSuccess ? (
            isEdit ? (
              <div className="flex justify-center">
                <button
                  onClick={() => router.push('/teacher/tasks')}
                  className="px-5 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 transition-colors"
                >
                  Ver tareas
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    router.refresh();
                    router.push('/teacher/tasks/new');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors"
                >
                  Crear otra
                </button>
                <button
                  onClick={() => router.push('/teacher/tasks')}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 transition-colors"
                >
                  Ver tareas
                </button>
              </div>
            )
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white transition-colors"
              >
                Intentar nuevamente
              </button>
            </div>
          )
        }
      />

      <div className="pt-10 px-10 md:px-30">
        <div className="mt-15 mb-10">
          <Link
            href="/teacher/tasks"
            className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Tareas
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl text-brand">{isEdit ? 'Editar tarea' : 'Nueva tarea'}</h1>
          <p className="text-sm text-brand-label mt-1">
            {isEdit
              ? <>Actualizando <span className="font-medium">{task.name}</span></>
              : 'Crea y administra tareas dentro de las clases.'}
          </p>
        </div>

        <hr className="border-brand-border mb-10" />

        <form action={action} autoComplete="off">
          <div className="max-w-lg flex flex-col gap-6">
            <FormField label="Nombre de la tarea" required>
              <input
                name="name"
                type="text"
                placeholder="Ej. Tarea 1: Teorema de pitágoras"
                defaultValue={task?.name ?? ''}
                className={inputClass}
                required
                autoFocus
              />
            </FormField>

            <FormField label="Asignatura" required>
              <ObjectSelect
                name="subjectId"
                placeholder="Selecciona una asignatura"
                options={subjectOptions}
                defaultValue={defaultSubjectId}
              />
            </FormField>

            <FormField label="Clases" required>
              <MultiSelect
                name="classIds"
                placeholder="Selecciona una o más clases"
                options={classOptions}
                defaultValues={defaultClassIds}
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/teacher/tasks"
                className="px-5 py-3 rounded-xl text-sm font-medium text-brand-label border border-brand-border hover:bg-brand-border/30 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 cursor-pointer transition-colors disabled:opacity-60"
              >
                {isPending
                  ? isEdit
                    ? 'Guardando...'
                    : 'Registrando...'
                  : isEdit
                    ? 'Guardar cambios'
                    : 'Registrar tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
