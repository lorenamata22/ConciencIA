import { getDriveContents } from '@/lib/api/drive';
import { getSession } from '@/lib/session';
import { DriveBrowser } from '@/components/modules/drive/drive-browser';

export default async function InstitutionFilesPage({
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
      title="Archivos"
      homeHref="/institution"
      basePath="/institution/files"
      contents={contents}
      canWrite
      canModifyAll
      userId={session?.userId ?? ''}
    />
  );
}
