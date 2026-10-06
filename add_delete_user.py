with open("src/lib/api/admin.ts", "a", encoding="utf-8") as f:
    f.write("""

export async function deleteAdminUser(token: string, userId: number) {
  const res = await fetch(`${API_URL}/admin/users/${userId}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return true;
}
""")
