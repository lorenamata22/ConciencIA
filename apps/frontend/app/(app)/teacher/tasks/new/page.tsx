import { getTaskFormOptions } from '@/lib/api/task';
import { TaskForm } from '../task-form';

export default async function NewTaskPage() {
  const options = await getTaskFormOptions();
  return <TaskForm options={options} />;
}
