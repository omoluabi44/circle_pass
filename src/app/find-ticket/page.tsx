"use client";

import { useState } from "react";
import { Search, Ticket, Mail, Phone, Hash, AlertCircle, RefreshCw } from "lucide-react";
import { findTicket } from "@/lib/api/find-ticket";

export default function FindTicketPage() {
  const [activeTab, setActiveTab] = useState<"reference" | "email" | "phone">("reference");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<any[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      setLoading(true);
      setError("");
      setResults(null);
      
      const payload: any = {};
      if (activeTab === "reference") payload.order_reference = inputValue;
      else if (activeTab === "email") payload.email = inputValue;
      else if (activeTab === "phone") payload.phone_number = inputValue;

      const data = await findTicket(payload);
      setResults(data);
    } catch (err: any) {
      if (err.message && err.message.includes("429")) {
        setError("Too many requests. Please try again later.");
      } else {
        setError(err.message || "Failed to find tickets. Please check your details and try again.");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Find My Ticket</h1>
          <p className="text-lg text-gray-600">
            Enter your details below to locate your event tickets.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setActiveTab("reference"); setInputValue(""); setResults(null); setError(""); }}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'reference' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <Hash className="w-4 h-4" />
              Order Reference
            </button>
            <button
              onClick={() => { setActiveTab("email"); setInputValue(""); setResults(null); setError(""); }}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'email' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <Mail className="w-4 h-4" />
              Email Address
            </button>
            <button
              onClick={() => { setActiveTab("phone"); setInputValue(""); setResults(null); setError(""); }}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'phone' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <Phone className="w-4 h-4" />
              Phone Number
            </button>
          </div>

          <div className="p-6 md:p-8">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  {activeTab === 'reference' && <Hash className="w-5 h-5" />}
                  {activeTab === 'email' && <Mail className="w-5 h-5" />}
                  {activeTab === 'phone' && <Phone className="w-5 h-5" />}
                </div>
                <input
                  type={activeTab === 'email' ? 'email' : 'text'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    activeTab === 'reference' ? 'e.g. ORD-123456789' :
                    activeTab === 'email' ? 'e.g. name@example.com' :
                    'e.g. +2348012345678'
                  }
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        {results !== null && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-primary" />
              Search Results
            </h2>

            {results.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No tickets found</h3>
                <p className="text-gray-500">We couldn't find any tickets matching your search criteria.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {results.map((ticket, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{ticket.event_title || "Event Name"}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1 font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {ticket.ticket_type || "Standard"}
                        </span>
                        <span>{ticket.attendee_name || "Attendee"}</span>
                        <span>Quantity: {ticket.quantity || 1}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ticket.status === 'VALID' || ticket.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                        ticket.status === 'USED' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {ticket.status || "VALID"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
