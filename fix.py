import re
content = open("src/app/organizer/page.tsx", "r", encoding="utf-8").read()

recent_events_replacement = """        {activeEvents.length > 0 ? (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-gray-100">
              {activeEvents.map((evt: any) => (
                <div key={evt.id} className="p-4 space-y-3 bg-card hover:bg-secondary/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-semibold text-foreground leading-tight">{evt.title}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      evt.status === 'PUBLISHED' || evt.status === 'LIVE' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                    }`}>
                      {evt.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground border-t border-border/50 pt-2">
                    <span>Sales: <span className="font-medium text-foreground">{evt.tickets_sold}</span> {evt.capacity ? `/ ${evt.capacity}` : ''}</span>
                    <span>Revenue: <span className="font-medium text-foreground">?{(evt.revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></span>
                  </div>
                  <div className="pt-1">
                    <Link href={`/organizer/events/${evt.id}`} className="block w-full py-2.5 text-center bg-primary/10 text-primary rounded-lg font-semibold text-sm hover:bg-primary/20 transition-colors">
                      Manage Event
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary text-muted-foreground text-sm uppercase tracking-wide">
                    <th className="px-6 py-4 font-semibold">Event Name</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Sales</th>
                    <th className="px-6 py-4 font-semibold">Revenue</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {activeEvents.map((evt: any) => (
                    <tr key={evt.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{evt.title}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          evt.status === 'PUBLISHED' || evt.status === 'LIVE' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                          {evt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">
                        {evt.tickets_sold} {evt.capacity ? `/ ${evt.capacity}` : ''}
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">
                        ?{(evt.revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/organizer/events/${evt.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : ("""

referrals_replacement = """        {data?.referrals && data.referrals.length > 0 ? (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-gray-100">
              {data.referrals.map((ref: any, idx: number) => (
                <div key={idx} className="p-4 space-y-2 bg-card hover:bg-secondary/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground text-base tracking-wide">{ref.referral_code}</span>
                    <span className="font-semibold text-success">?{(ref.revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Sales: <span className="font-medium text-foreground">{ref.sales}</span> ticket(s)
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary text-muted-foreground text-sm uppercase tracking-wide">
                    <th className="px-6 py-4 font-semibold">Referral Code</th>
                    <th className="px-6 py-4 font-semibold">Total Sales</th>
                    <th className="px-6 py-4 font-semibold">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {data.referrals.map((ref: any, idx: number) => (
                    <tr key={idx} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{ref.referral_code}</td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">
                        {ref.sales} ticket(s)
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">
                        ?{(ref.revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : ("""

content = re.sub(r'{\s*activeEvents\.length\s*>\s*0\s*\?\s*\(\s*<table[\s\S]*?</table>\s*\)\s*:\s*\(', recent_events_replacement, content)
content = re.sub(r'{\s*data\?\.referrals\s*&&\s*data\.referrals\.length\s*>\s*0\s*\?\s*\(\s*<table[\s\S]*?</table>\s*\)\s*:\s*\(', referrals_replacement, content)
open("src/app/organizer/page.tsx", "w", encoding="utf-8").write(content)
