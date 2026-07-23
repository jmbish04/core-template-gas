"use client";

import * as React from "react";
import { PlusIcon, TagIcon } from "lucide-react";
import { apiGet, apiSend } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type ResearchTag = { id: number; name: string; description: string; htmlColor: string; isActive: boolean };
const emptyDraft = { name: "", description: "", htmlColor: "#6366f1", isActive: true };

export function TagManager() {
  const [tags, setTags] = React.useState<ResearchTag[]>([]);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(emptyDraft);
  const load = React.useCallback(() => apiGet<{ tags: ResearchTag[] }>("research/tags").then((data) => setTags(data.tags)), []);
  React.useEffect(() => { void load(); }, [load]);
  async function createTag() { await apiSend("POST", "research/tags", draft); setOpen(false); setDraft(emptyDraft); await load(); }
  async function toggle(tag: ResearchTag) { await apiSend("PATCH", `research/tags/${tag.id}`, { isActive: !tag.isActive }); await load(); }
  return <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
    <div className="flex items-end justify-between"><div><p className="text-sm font-medium text-primary">Configuration</p><h1 className="mt-1 text-3xl font-semibold">Research tags</h1><p className="mt-2 text-sm text-muted-foreground">Manage the reusable labels available on research documents.</p></div><Button onClick={() => setOpen(true)}><PlusIcon />New tag</Button></div>
    <div className="overflow-hidden rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Tag</TableHead><TableHead>Description</TableHead><TableHead>Color</TableHead><TableHead className="text-right">Active</TableHead></TableRow></TableHeader><TableBody>{tags.map((tag) => <TableRow key={tag.id}><TableCell><div className="flex items-center gap-2 font-medium"><TagIcon className="size-4" style={{ color: tag.htmlColor, fill: tag.htmlColor }} />{tag.name}</div></TableCell><TableCell className="max-w-lg text-muted-foreground">{tag.description || "—"}</TableCell><TableCell><code>{tag.htmlColor}</code></TableCell><TableCell className="text-right"><Switch checked={tag.isActive} onCheckedChange={() => void toggle(tag)} aria-label={`Toggle ${tag.name}`} /></TableCell></TableRow>)}</TableBody></Table></div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create research tag</DialogTitle><DialogDescription>Add a reusable tag. It will be selected automatically when created from a research item.</DialogDescription></DialogHeader><div className="space-y-4"><Input placeholder="Tag name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><Textarea placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /><label className="flex items-center gap-3 text-sm">Color <input type="color" value={draft.htmlColor} onChange={(e) => setDraft({ ...draft, htmlColor: e.target.value })} /><code>{draft.htmlColor}</code></label><Button className="w-full" disabled={!draft.name.trim()} onClick={() => void createTag()}>Create tag</Button></div></DialogContent></Dialog>
  </div>;
}
