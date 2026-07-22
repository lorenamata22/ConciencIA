import { getStudentSubjects } from '@/lib/api/subject';
import { NotesView } from '@/components/modules/notes/notes-view';

// "Mis Apuntes" — as matérias do aluno alimentam a coluna esquerda; o restante
// (cards + detalhe) é carregado no client conforme o filtro selecionado.
export default async function StudentNotesPage() {
  const subjects = await getStudentSubjects();

  return (
    <div className="flex h-full flex-col pt-10">
      <h1 className="px-10 pt-6 pb-4 text-4xl font-medium text-brand-teal md:px-30">
        Mis apuntes
      </h1>
      <div className="min-h-0 flex-1">
        <NotesView subjects={subjects} />
      </div>
    </div>
  );
}
