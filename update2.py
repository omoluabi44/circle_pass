import re

with open("src/app/organizer/events/create/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
imports = """import { useLoadScript, Autocomplete } from "@react-google-maps/api";\n"""
content = content.replace('import { uploadToS3 } from "@/utils/s3Upload";', 'import { uploadToS3 } from "@/utils/s3Upload";\n' + imports)

# Setup useLoadScript
load_script = """  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onLoad = (autoC: google.maps.places.Autocomplete) => setAutocomplete(autoC);
  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place && place.address_components) {
        let city = "";
        let state = "";
        let country = "";
        let lga = "";
        
        place.address_components.forEach(component => {
          const types = component.types;
          if (types.includes("locality")) city = component.long_name;
          if (types.includes("administrative_area_level_2") || types.includes("locality")) lga = component.long_name;
          if (types.includes("administrative_area_level_1")) state = component.long_name;
          if (types.includes("country")) country = component.long_name;
        });

        // Use the main venue name (e.g. Landmark Centre) or fallback to full formatted address
        const venueName = place.name || place.formatted_address || "";
        
        setFormData(prev => ({
          ...prev,
          venue: venueName + (lga && lga !== city ? `, ${lga}` : ""),
          city: city || lga,
          state,
          country
        }));
      }
    }
  };
"""

content = content.replace("export default function CreateEventPage() {", "export default function CreateEventPage() {\n" + load_script)

# Replace Location Section
location_section = """            {formData.event_type !== 'ONLINE' && (
              <div className="space-y-4 border border-border rounded-lg p-4 bg-secondary/20">
                <h3 className="font-medium text-sm text-foreground">Location Details</h3>
                
                <div>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Location Name (Optional)</label>
                  <input type="text" placeholder="e.g. Main Hall, Hall B" className="w-full border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
                    value={formData.location_name} onChange={e => setFormData({...formData, location_name: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Country</label>
                    <select className="w-full border border-border rounded-lg p-2.5 outline-none bg-background text-foreground"
                      value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})}>
                      <option value="">Select Country</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                      <option value="South Africa">South Africa</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">State/Region</label>
                    <input type="text" className="w-full border border-border rounded-lg p-2.5 outline-none"
                      value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">City</label>
                    <input type="text" className="w-full border border-border rounded-lg p-2.5 outline-none"
                      value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                </div>
              </div>
            )}"""

# regex replace old location block
old_loc_search = r"\{formData\.event_type !== 'ONLINE'.*?\}\)}</div"
# Oh wait, using re.sub for multiline JSX is risky, I'll just use string replacement on the exact block.
with open("src/app/organizer/events/create/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
