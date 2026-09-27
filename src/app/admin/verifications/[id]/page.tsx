import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminOrganizerVerification } from "@/lib/api/admin";
import Link from "next/link";
import { ArrowLeft, Building2, User, Globe, AtSign, FileText } from "lucide-react";
import ClientVerificationButtons from "@/app/admin/users/ClientVerificationButtons";

export default async function AdminVerificationDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getSession();
  
  if (!session || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  const resolvedParams = await params;

  let verification: any = null;
  let error = null;

  try {
    verification = await getAdminOrganizerVerification((session as any).accessToken, parseInt(resolvedParams.id));
  } catch (err: any) {
    error = err.message || "Failed to load verification detail";
  }

  if (error || !verification) {
    return (
      <div className="min-h-screen bg-background p-10">
        <h1 className="text-2xl font-bold text-destructive">Error Loading Verification</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Link href="/admin/users" className="mt-4 inline-block text-primary hover:underline">Back to Users</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/admin/users" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Users & Verifications
        </Link>

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Review Organizer: {verification.company_name}</h1>
            <p className="text-muted-foreground mt-1">Review the business details and compliance documents below.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-xl text-sm font-bold ${verification.status === 'Verified' ? 'bg-success/10 text-success' : verification.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              Status: {verification.status}
            </span>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-3">Business Profile</h2>
            
            <div className="space-y-4">
              <div>
                <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-1">
                  <Building2 className="w-4 h-4" /> Company Name
                </span>
                <p className="font-medium text-foreground">{verification.company_name}</p>
              </div>
              
              <div>
                <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-1">
                  <User className="w-4 h-4" /> Owner Account Email
                </span>
                <p className="font-medium text-foreground">{verification.user_email}</p>
              </div>
              
              <div>
                <span className="text-sm font-bold text-muted-foreground mb-1 block">Bio / Description</span>
                <p className="text-sm text-foreground bg-secondary/50 p-3 rounded-lg min-h-[4rem]">
                  {verification.bio || <span className="italic text-muted-foreground">No bio provided</span>}
                </p>
              </div>
              
              <div className="flex gap-6">
                <div>
                  <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-1">
                    <Globe className="w-4 h-4" /> Website
                  </span>
                  {verification.website ? (
                    <a href={verification.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-medium">{verification.website}</a>
                  ) : <p className="text-sm text-muted-foreground">N/A</p>}
                </div>
                <div>
                  <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-1">
                    <AtSign className="w-4 h-4" /> Instagram
                  </span>
                  {verification.instagram_handle ? (
                    <p className="text-sm font-medium">{verification.instagram_handle}</p>
                  ) : <p className="text-sm text-muted-foreground">N/A</p>}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-foreground border-b border-border pb-3">Compliance Documents</h2>
            
            <div className="space-y-6">
              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" /> CAC Document
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Certificate of Incorporation / Business Reg.</p>
                {verification.cac_document ? (
                  <a href={verification.cac_document} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-background border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-colors">
                    View CAC Document
                  </a>
                ) : (
                  <div className="px-4 py-2.5 bg-destructive/10 text-destructive text-center rounded-xl font-bold text-sm">Missing</div>
                )}
              </div>
              
              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" /> Director ID
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Government Issued ID of primary director.</p>
                {verification.id_document ? (
                  <a href={verification.id_document} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-background border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-colors">
                    View ID Document
                  </a>
                ) : (
                  <div className="px-4 py-2.5 bg-destructive/10 text-destructive text-center rounded-xl font-bold text-sm">Missing</div>
                )}
              </div>
            </div>
          </section>
        </div>

        {verification.status !== 'Verified' && verification.status !== 'Rejected' && (
          <section className="bg-card border border-border rounded-2xl p-6 shadow-sm mt-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Final Decision</h2>
            <p className="text-muted-foreground mb-6">By approving this organizer, you are granting them permission to host paid events and collect payouts via Paystack on CirclePass.</p>
            <div className="flex gap-4">
              <ClientVerificationButtons id={verification.id} token={(session as any).accessToken} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
