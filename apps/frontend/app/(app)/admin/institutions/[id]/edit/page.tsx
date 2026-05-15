import { notFound } from 'next/navigation';
import { getInstitutionById } from '@/lib/api/institution';
import { EditInstitutionForm } from './edit-institution-form';

export default async function EditInstitutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const institution = await getInstitutionById(id);
  if (!institution) notFound();

  return <EditInstitutionForm institution={institution} />;
}
