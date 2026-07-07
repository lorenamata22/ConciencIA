import { getMySubjects } from '@/lib/api/subject';
import { getAiContextFiles } from '@/lib/api/file';
import { DocumentationBrowser } from '@/components/modules/documentation/documentation-browser';

// Tela de materiais que alimentam a IA — todo upload sai com is_ai_context=true
export default async function TeacherDocumentationPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject } = await searchParams;
  const [subjects, files] = await Promise.all([
    getMySubjects(),
    getAiContextFiles(),
  ]);

  return (
    <DocumentationBrowser
      subjects={subjects}
      files={files}
      activeSubjectId={subject ?? null}
      basePath="/teacher/documentation"
      homeHref="/teacher"
    />
  );
}
