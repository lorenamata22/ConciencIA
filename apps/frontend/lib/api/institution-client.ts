export async function deleteInstitutionUser(institutionId: string, userId: string): Promise<void> {
  const res = await fetch(`/api/institutions/${institutionId}/users/${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete user');
}
