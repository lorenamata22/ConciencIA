import { getDriveContents } from '@/lib/api/drive';
import { getSession } from '@/lib/session';
import { DriveBrowser } from '@/components/modules/drive/drive-browser';

export default async function StudentFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string }>;
}) {
  const { folderId } = await searchParams;
  const [contents, session] = await Promise.all([
    getDriveContents(folderId),
    getSession(),
  ]);

  return (
    <DriveBrowser
      title="Mis archivos"
      homeHref="/student"
      basePath="/student/files"
      contents={contents}
      canWrite={false}
      canModifyAll={false}
      userId={session?.userId ?? ''}
    />
  );
}
