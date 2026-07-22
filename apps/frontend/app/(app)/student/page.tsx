import { StudentLearningBody } from "@/components/modules/student/student-learning-body";

// Aprendizado do aluno (Chat/Examen). Matéria, modo, header e Pomodoro vivem no
// StudentShell (layout de /student); esta página só renderiza o corpo, que lê
// modo + matéria do contexto. Deep-link ?mode=exam é adotado pelo shell.
export default function StudentLearningPage() {
  return <StudentLearningBody />;
}
