"use client";

import { UserPlus, Shield, Trash2, Mail, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function TeamPage() {
  const [members] = useState([
    { id: 1, name: "Admin User", email: "admin@circlepass.com", role: "Owner", status: "Active" },
    { id: 2, name: "Sarah Johnson", email: "sarah@circlepass.com", role: "Manager", status: "Active" },
    { id: 3, name: "David Chen", email: "david@circlepass.com", role: "Scanner", status: "Pending" },
  ]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-2">Manage your organization members and their access levels.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
          <UserPlus className="w-5 h-5" /> Invite Member
        </button>
      </header>
      
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border bg-secondary/30">
          <h2 className="font-bold text-foreground">Current Members</h2>
        </div>
        <div className="divide-y divide-border">
          {members.map(member => (
            <div key={member.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-secondary/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    {member.name}
                    {member.role === 'Owner' && <Shield className="w-4 h-4 text-primary" />}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {member.email}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="font-bold text-foreground bg-secondary px-2 py-0.5 rounded-md text-xs">{member.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 md:ml-auto">
                {member.status === 'Pending' ? (
                  <span className="text-xs font-bold text-warning bg-warning/10 px-3 py-1 rounded-full">Pending Invite</span>
                ) : (
                  <span className="text-xs font-bold text-success bg-success/10 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                )}
                
                {member.role !== 'Owner' && (
                  <button className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mt-8">
        <h3 className="text-xl font-bold text-foreground mb-6">Roles & Permissions</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="font-bold text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Owner</div>
            <p className="text-sm text-muted-foreground">Full access to all features, finances, and team management.</p>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-foreground flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Manager</div>
            <p className="text-sm text-muted-foreground">Can create and edit events, view analytics, but no financial access.</p>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Scanner</div>
            <p className="text-sm text-muted-foreground">App-only access to scan tickets and manage check-ins at the door.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
