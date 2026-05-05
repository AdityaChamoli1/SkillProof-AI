import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Recruiters() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Recruiter Hub</h1>
        <p className="text-sm text-muted-foreground">Search and rank verified candidates.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Candidate search</CardTitle></CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by skill, role, or trust grade…" disabled />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Recruiter tools (smart ranking, filters, exports) ship in the next iteration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
