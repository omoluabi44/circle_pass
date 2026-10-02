import { getSession } from "@/lib/auth";
import { getAdminUsers, getAdminOrganizerVerifications } from "@/lib/api/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";
import ClientVerificationButtons from "./ClientVerificationButtons";
import UserListTabs from "./UserListTabs";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || !session.accessToken || session.user?.role !== "ADMIN") {
    redirect("/login");
  }

  let users = [];
  let verifications = [];

  try {
    users = await getAdminUsers(session.accessToken);
    verifications = await getAdminOrganizerVerifications(session.accessToken);
  } catch (err) {
    console.error(err);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Organizers & Users</h1>
      </header>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold mb-4">Organizer Verifications</h2>
          <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
            {verifications.length === 0 ? (
              <div className="p-4 text-muted-foreground text-sm">No verifications found.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">User Email</th>
                    <th className="px-4 py-3">Documents</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {verifications.map((v: any) => (
                    <tr key={v.id} className="hover:bg-secondary transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{v.company_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.user_email}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 text-xs">
                          {v.cac_document ? (
                            <a href={v.cac_document} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">CAC</a>
                          ) : <span className="text-muted-foreground">No CAC</span>}
                          <span className="text-border">|</span>
                          {v.id_document ? (
                            <a href={v.id_document} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">ID</a>
                          ) : <span className="text-muted-foreground">No ID</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${v.status === 'Verified' ? 'bg-success/10 text-success' : v.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end h-full min-h-[3.5rem] gap-2">
                        <Link href={`/admin/verifications/${v.id}`} className="px-3 py-1.5 bg-secondary text-foreground text-xs font-bold rounded-lg hover:bg-secondary/80 transition-colors">
                          Review
                        </Link>
                        {v.status !== 'Verified' && v.status !== 'Rejected' && session.accessToken && (
                          <ClientVerificationButtons id={v.id} token={session.accessToken} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">All Users</h2>
          <UserListTabs users={users} />
        </section>
      </div>
    </div>
  );
}
