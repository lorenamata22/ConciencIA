import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export interface DriveBreadcrumbItem {
  id: string;
  name: string;
}

export interface DriveFolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  folderId: string | null;
  mimeType: string;
  size: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriveContents {
  folder: { id: string; name: string; parentId: string | null } | null;
  breadcrumb: DriveBreadcrumbItem[];
  folders: DriveFolderItem[];
  files: DriveFileItem[];
}

const EMPTY_CONTENTS: DriveContents = {
  folder: null,
  breadcrumb: [],
  folders: [],
  files: [],
};

// Conteúdo de uma pasta (ou da raiz da instituição quando folderId ausente)
export async function getDriveContents(folderId?: string): Promise<DriveContents> {
  try {
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
    const res = await fetch(`${API_URL}/drive/contents${query}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return EMPTY_CONTENTS;
    const json = await res.json();
    return (json.data as DriveContents) ?? EMPTY_CONTENTS;
  } catch {
    return EMPTY_CONTENTS;
  }
}
