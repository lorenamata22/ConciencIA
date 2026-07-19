import { getMyCourses } from "@/lib/api/subject";
import { NewSubjectPage } from "@/components/modules/subject/new-subject-page";

// Server Component: busca os cursos e entrega ao fluxo client-side de
// upload → parse → review → registro.
export default async function Page() {
  const courses = await getMyCourses();
  return <NewSubjectPage courses={courses} />;
}
