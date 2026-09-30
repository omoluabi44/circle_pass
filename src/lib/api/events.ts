import { API_URL } from './config';

export async function getOrganizerEvents(token: string) {
  const res = await fetch(`${API_URL}/events/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function createEvent(token: string, data: any) {
  const isFormData = data instanceof FormData;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(`${API_URL}/events/`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data)
    });
  } catch (error: any) {
    if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
      throw new Error(`Network Error: Cannot connect to backend at ${API_URL}. Please ensure your backend is running or check your CORS/environment variables.`);
    }
    throw error;
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (errorData.detail) {
      throw new Error(errorData.detail);
    }

    // Recursively flatten a DRF validation error value into a readable string
    const flattenErrors = (val: any): string => {
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        return val
          .map((item, i) => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null) {
              // Nested object (e.g. one ticket_type's errors)
              return Object.entries(item)
                .map(([k, v]) => `${k}: ${flattenErrors(v)}`)
                .join(', ');
            }
            return String(item);
          })
          .filter(Boolean)
          .join(' | ');
      }
      if (typeof val === 'object' && val !== null) {
        return Object.entries(val)
          .map(([k, v]) => `${k}: ${flattenErrors(v)}`)
          .join(', ');
      }
      return String(val);
    };

    // Handle DRF field validation errors (dict of lists / nested)
    const errorMessages = Object.entries(errorData)
      .map(([field, errors]) => `${field}: ${flattenErrors(errors)}`)
      .join(' | ');
    
    throw new Error(errorMessages || 'Failed to create event');
  }
  return res.json();
}

export async function submitEvent(token: string, eventId: string | number) {
  const res = await fetch(`${API_URL}/events/${eventId}/submit/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit event');
  }
  return res.json();
}

export async function getPublicEvents(params?: Record<string, any>) {
  const url = new URL(`${API_URL}/events/`);
  if (params) {
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, String(params[key]));
      }
    });
  }
  
  const res = await fetch(url.toString(), {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch public events');
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${API_URL}/categories/`, {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function getEventBySlug(slug: string) {
  // Assuming slug is available via a filter or directly
  const res = await fetch(`${API_URL}/events/?slug=${slug}`, {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch event');
  const data = await res.json();
  if (Array.isArray(data)) {
    return data.length > 0 ? data[0] : null;
  }
  // If paginated response
  if (data.results && data.results.length > 0) {
    return data.results[0];
  }
  return null;
}

export async function getEventOverview(token: string, eventId: string | number) {
  const res = await fetch(`${API_URL}/events/${eventId}/overview/`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Overview error:", text);
    throw new Error('Failed to fetch event overview');
  }
  return res.json();
}

export async function updateEvent(token: string, eventId: string | number, data: any) {
  const res = await fetch(`${API_URL}/events/${eventId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to update event');
  }
  return res.json();
}

export async function getEventDiscounts(token: string, eventId: string | number) {
  const res = await fetch(`${API_URL}/events/${eventId}/discounts/`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Discounts error:", err);
    throw new Error('Failed to fetch event discounts');
  }
  return res.json();
}

export async function createEventDiscount(token: string, eventId: string | number, data: any) {
  const res = await fetch(`${API_URL}/events/${eventId}/discounts/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create discount');
  }
  return res.json();
}

export async function deleteEventDiscount(token: string, eventId: string | number, discountId: string | number) {
  const res = await fetch(`${API_URL}/events/${eventId}/discounts/${discountId}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to delete discount');
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

export async function getEventAnnouncements(token: string, eventId: string | number) {
  const res = await fetch(`${API_URL}/events/${eventId}/announcements/`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch event announcements');
  return res.json();
}

export async function createEventAnnouncement(token: string, eventId: string | number, data: any) {
  const res = await fetch(`${API_URL}/events/${eventId}/announcements/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to send announcement');
  }
  return res.json();
}

export async function getEventById(token: string, eventId: string | number) {
  const res = await fetch(`${API_URL}/events/${eventId}/`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`getEventById error for ${eventId}:`, text);
    throw new Error('Failed to fetch event details');
  }
  return res.json();
}

export async function getEventAttendees(token: string, eventId: string | number) {
  const res = await fetch(`${API_URL}/organizer/contacts/?event_id=${eventId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch event attendees');
  return res.json();
}

export async function getEventAnalytics(token: string, eventId: string | number) {
  const res = await fetch(`${API_URL}/events/${eventId}/analytics/`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Failed to fetch event analytics');
  return res.json();
}
