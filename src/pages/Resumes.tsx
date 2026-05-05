import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";

export default function Resumes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Resumes</h1>
        <p className="text-sm text-muted-foreground">Upload, analyze, and verify your resumes.</p>
      </div>

      <Card className="border-dashed border-2 border-border/80 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
            <Upload className="h-5 w-5" />
          </div>
          <h3 className="font-display text-lg font-semibold">Upload your first resume</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            PDF or DOCX. We'll run ATS scoring, extract skills, and surface trust signals.
          </p>
          <Button className="mt-5" disabled>
            <FileText className="mr-2 h-4 w-4" /> Coming next iteration
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">AI scoring engine ships in the next build.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent analyses</CardTitle></CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No resumes yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
