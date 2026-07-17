import { getStudentSubjects } from "@/lib/api/subject";
import { ChatScreen } from "@/components/modules/chat/chat-screen";

// Chat IA — Modo Estudo (item "Chat" da sidebar aponta para /student).
// Server component: busca as matérias do aluno e entrega ao ChatScreen.
export default async function StudentChatPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const subjects = await getStudentSubjects();
  const { subjectId } = await searchParams;

  return (
    <div className="h-full">
      <ChatScreen subjects={subjects} initialSubjectId={subjectId} />
    </div>
  );
}
