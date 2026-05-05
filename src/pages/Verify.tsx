import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Link2 } from "lucide-react";

export default function Verify() {
  return (
    <div className="container-tight py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Verify a credential
        </h1>
        <p className="mt-4 text-muted-foreground">
          Paste a credential hash or transaction ID to confirm authenticity on Polygon.
        </p>
      </div>
      <Card className="mx-auto mt-12 max-w-2xl">
        <CardHeader><CardTitle>Verification explorer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="0x... credential hash or tx id" />
            </div>
            <Button><Link2 className="mr-2 h-4 w-4" /> Verify</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Public explorer — anyone can verify credentials issued via SkillProof. Live verification ships next iteration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
