"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { getEventById, updateEvent } from '@/lib/api/events';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

export default function TicketsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session, status } = useSession();
  
  const [event, setEvent] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [tier, setTier] = useState('REGULAR');
  const [loading, setLoading] = useState(true);
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      if (status === "loading") return;
      if (!session?.accessToken || !id || id === "undefined") return;
      try {
        const data = await getEventById(session.accessToken as string, id);
        setEvent(data);
      } catch (err: any) {
        toast.error("Failed to fetch tickets");
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [id, session, status]);

  const closeModal = () => {
    setShowModal(false);
    setEditingTicketId(null);
    setName('');
    setPrice('');
    setQuantity('');
    setTier('REGULAR');
  };

  const openEditModal = (ticket: any) => {
    setEditingTicketId(ticket.id);
    setName(ticket.name);
    setPrice(ticket.price.toString());
    setQuantity(ticket.quantity.toString());
    setTier(ticket.tier);
    setShowModal(true);
  };

  const handleDeleteTicketType = async (ticketId: number) => {
    if (!confirm("Are you sure you want to delete this ticket type? This action might fail if tickets have already been sold.")) return;

    setUpdating(true);
    try {
      const currentTicketTypes = event.ticket_types || [];
      const updatedTicketTypes = currentTicketTypes.filter((t: any) => t.id !== ticketId);

      const updated = await updateEvent(session?.accessToken as string, id, {
        ticket_types: updatedTicketTypes
      });
      
      setEvent(updated);
      toast.success("Ticket type deleted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete ticket type.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateOrUpdateTicketType = async () => {
    if (!name || !quantity || !tier || (tier !== 'FREE' && !price) || (tier === 'FREE' && price && Number(price) !== 0)) {
      toast.error('Please fill all required fields correctly (FREE must have 0 price).');
      return;
    }
    
    setUpdating(true);
    try {
      const ticketTypeData: any = {
        name,
        tier,
        price: Number(price) || 0,
        quantity: Number(quantity),
        description: "",
        is_active: true
      };
      
      let updatedTicketTypes;
      const currentTicketTypes = event.ticket_types || [];

      if (editingTicketId) {
        ticketTypeData.id = editingTicketId;
        updatedTicketTypes = currentTicketTypes.map((t: any) => 
          t.id === editingTicketId ? { ...t, ...ticketTypeData } : t
        );
      } else {
        updatedTicketTypes = [...currentTicketTypes, ticketTypeData];
      }

      const updated = await updateEvent(session?.accessToken as string, id, {
        ticket_types: updatedTicketTypes
      });
      
      setEvent(updated);
      closeModal();
      toast.success(editingTicketId ? "Ticket type updated!" : "Ticket type created!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save ticket type.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center text-muted-foreground">Loading ticket types...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ticket Types</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Ticket Type
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
              <th className="p-4 text-sm font-semibold text-muted-foreground">Name</th>
              <th className="p-4 text-sm font-semibold text-muted-foreground">Tier</th>
              <th className="p-4 text-sm font-semibold text-muted-foreground">Price</th>
              <th className="p-4 text-sm font-semibold text-muted-foreground">Inventory</th>
              <th className="p-4 text-sm font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {event?.ticket_types?.length > 0 ? (
              event.ticket_types.map((ticket: any) => (
                <tr key={ticket.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-medium text-foreground flex items-center gap-2">
                    {ticket.name}
                    {ticket.is_sold_out && <span className="px-2 py-0.5 text-xs bg-destructive/10 text-destructive rounded-full">Sold out</span>}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{ticket.tier}</td>
                  <td className="p-4 text-sm text-foreground">₦{Number(ticket.price).toLocaleString()}</td>
                  <td className="p-4 text-sm text-foreground">
                    {ticket.quantity_sold || 0} / {ticket.quantity}
                  </td>
                  <td className="p-4 flex items-center space-x-3">
                    <button 
                      onClick={() => openEditModal(ticket)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTicketType(ticket.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No ticket types found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">{editingTicketId ? 'Edit Ticket Type' : 'Create Ticket Type'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Tier</label>
                <select 
                  value={tier}
                  onChange={(e) => {
                    setTier(e.target.value);
                    if (e.target.value === 'FREE') setPrice('0');
                  }}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground"
                >
                  <option value="REGULAR">REGULAR</option>
                  <option value="VIP">VIP</option>
                  <option value="VVIP">VVIP</option>
                  <option value="EARLY_BIRD">EARLY_BIRD</option>
                  <option value="FREE">FREE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground" 
                  placeholder="e.g. VIP Pass" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Price (₦)</label>
                  <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={tier === 'FREE'}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground disabled:opacity-50" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Quantity</label>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground" 
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={closeModal} disabled={updating} className="px-4 py-2 text-muted-foreground hover:bg-secondary rounded-xl transition-colors">Cancel</button>
              <button onClick={handleCreateOrUpdateTicketType} disabled={updating} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50">
                {updating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
