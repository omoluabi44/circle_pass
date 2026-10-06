with open('src/app/organizer/events/create/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Venue & Google Maps Location *</label>
                    {isLoaded ? (
                      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                        <input 
                          type="text" 
                          placeholder="Search for venue or address..." 
                          className="w-full border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                          value={formData.venue} 
                          onChange={e => setFormData({...formData, venue: e.target.value})} 
                        />
                      </Autocomplete>
                    ) : (
                      <input 
                        type="text" 
                        placeholder="Loading Google Maps..." 
                        className="w-full border border-border rounded-lg p-2.5 outline-none bg-background text-foreground opacity-50"
                        disabled 
                      />
                    )}
                  </div>"""

replacement = """                  <div className="relative">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Venue / Location *</label>
                    <input 
                      type="text" 
                      placeholder="Start typing to search location..." 
                      className="w-full border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      value={locationQuery} 
                      onChange={e => setLocationQuery(e.target.value)} 
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-[34px]">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    )}
                    
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((place: any) => (
                          <li 
                            key={place.place_id} 
                            onClick={() => handleSelectLocation(place)}
                            className="p-3 hover:bg-secondary cursor-pointer text-sm border-b border-border last:border-0"
                          >
                            {place.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>"""

text = text.replace(target, replacement)

with open('src/app/organizer/events/create/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
