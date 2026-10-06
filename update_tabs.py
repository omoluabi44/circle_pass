import re

with open("src/app/admin/users/UserListTabs.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Imports
imports = """import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { deleteAdminUser } from "@/lib/api/admin";
"""
content = content.replace('import { useState } from "react";', imports)

# Function body
func_start = r'(export default function UserListTabs\(\{ users \}: \{ users: User\[\] \}\) \{)'
func_vars = """export default function UserListTabs({ users: initialUsers }: { users: User[] }) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [localUsers, setLocalUsers] = useState<User[]>(initialUsers);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const filteredUsers = activeTab === "ALL" 
    ? localUsers 
    : localUsers.filter(u => u.role === activeTab);

  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to completely delete this user? This cannot be undone.")) return;
    if (!session?.accessToken) return;
    
    setIsDeleting(userId);
    try {
      await deleteAdminUser(session.accessToken, userId);
      setLocalUsers(prev => prev.filter(u => u.id !== userId));
      toast.success("User deleted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user.");
    } finally {
      setIsDeleting(null);
    }
  };
"""

content = re.sub(r'export default function UserListTabs\(\{ users \}: \{ users: User\[\] \}\) \{\n  const \[activeTab, setActiveTab\] = useState<string>\("ALL"\);\n\n  const filteredUsers = activeTab === "ALL" \n    \? users \n    : users.filter\(u => u.role === activeTab\);', func_vars, content, flags=re.MULTILINE)

# Table headers
header_search = r'(<th className="px-4 py-3 text-left font-semibold text-foreground">Joined</th>\s*</tr>)'
header_replace = r'<th className="px-4 py-3 text-left font-semibold text-foreground">Joined</th>\n              <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>\n            </tr>'
content = re.sub(header_search, header_replace, content)

# Table body
body_search = r'(<td className="px-4 py-3 text-muted-foreground">\s*\{new Date\(u\.date_joined\)\.toLocaleDateString\(\)\}\s*</td>\s*</tr>)'
body_replace = r'''<td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.date_joined).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => handleDelete(u.id)}
                      disabled={isDeleting === u.id}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>'''
content = re.sub(body_search, body_replace, content)

# Colspan fix for empty state
content = content.replace('colSpan={4}', 'colSpan={5}')

with open("src/app/admin/users/UserListTabs.tsx", "w", encoding="utf-8") as f:
    f.write(content)
