import { notFound } from 'next/navigation';
import { getMyTask, getTaskFormOptions } from '@/lib/api/task';
import { TaskForm } from '../../task-form';

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const [task, options] = await Promise.all([
    getMyTask(taskId),
    getTaskFormOptions(),
  ]);

  if (!task) notFound();

  return <TaskForm options={options} task={task} />;
}
