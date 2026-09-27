import { Hammer } from "lucide-react";

export default function AuditPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto h-[80vh] flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground capitalize">Audit</h1>
        <p className="text-muted-foreground mt-2">Manage your Audit here.</p>
      </header>
      
      <div className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-12 text-center bg-secondary/50">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
          <Hammer className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Work in Progress</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This Audit page is currently being built as part of the Launch 1 MVP Sprint.
        </p>
      </div>
    </div>
  );
}
