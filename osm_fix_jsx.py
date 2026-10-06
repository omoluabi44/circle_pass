import re

with open("src/app/organizer/events/create/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

jsx_search = r'(<label className="block text-sm font-medium text-muted-foreground mb-1">Venue & Google Maps Location \*</label>\s*\{isLoaded \? \([\s\S]*?\)\s*</div>)'
osm_jsx = """<label className="block text-sm font-medium text-muted-foreground mb-1">Venue Location *</label>
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
                </div>"""
                
if re.search(jsx_search, content):
    content = re.sub(jsx_search, osm_jsx, content)
else:
    print("Could not find the JSX block")

with open("src/app/organizer/events/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
