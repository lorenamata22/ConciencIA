import { redirect } from "next/navigation";

// Modo Exame agora vive sob o mesmo header persistente de /student (para o timer
// Pomodoro sobreviver à troca de modo). Esta rota redireciona para /student com
// o modo já selecionado, preservando o deep-link por matéria.
export default async function StudentExamPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const { subjectId } = await searchParams;
  const query = new URLSearchParams({ mode: "exam" });
  if (subjectId) query.set("subjectId", subjectId);
  redirect(`/student?${query.toString()}`);
}
