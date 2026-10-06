import re

with open("src/app/organizer/events/create/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove Google Maps imports
content = content.replace('import { useLoadScript, Autocomplete } from "@react-google-maps/api";', '')

# Replace Google Maps state/functions with OSM logic
google_logic_search = r'(  const \{ isLoaded \} = useLoadScript\(\{.*?\}\s*\};\n)'
osm_logic = '''  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!locationQuery || locationQuery.length < 3 || locationQuery === formData.venue) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&addressdetails=1&limit=5`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Location search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [locationQuery, formData.venue]);

  const handleSelectLocation = (place: any) => {
    const address = place.address || {};
    const city = address.city || address.town || address.village || address.county || "";
    const state = address.state || address.region || "";
    const country = address.country || "";
    const venueName = place.display_name.split(',')[0];
    const fullVenue = venueName + (city && city !== venueName ? `, ${city}` : "");

    setFormData(prev => ({
      ...prev,
      venue: fullVenue,
      city: city,
      state: state,
      country: country
    }));
    
    setLocationQuery(fullVenue);
    setShowSuggestions(false);
  };
'''
content = re.sub(google_logic_search, osm_logic, content, flags=re.DOTALL)

# Replace the JSX block
jsx_search = r'(<label className="block text-sm font-medium text-muted-foreground mb-1">Venue & Google Maps Location \*\</label>\s*\{isLoaded \? \([\s\S]*?\)\s*</div>)'
osm_jsx = '''<label className="block text-sm font-medium text-muted-foreground mb-1">Venue Location *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search for venue or address..." 
                      className="w-full border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      value={locationQuery || formData.venue} 
                      onChange={e => {
                        setLocationQuery(e.target.value);
                        setFormData({...formData, venue: e.target.value});
                        setShowSuggestions(true);
                      }} 
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    )}
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                        {suggestions.map((place: any) => (
                          <li 
                            key={place.place_id} 
                            className="p-3 hover:bg-secondary cursor-pointer border-b border-border/50 last:border-0 text-sm transition-colors"
                            onClick={() => handleSelectLocation(place)}
                          >
                            <div className="font-medium text-foreground">{place.display_name.split(',')[0]}</div>
                            <div className="text-xs text-muted-foreground truncate">{place.display_name}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>'''
content = re.sub(jsx_search, osm_jsx, content)

with open("src/app/organizer/events/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
