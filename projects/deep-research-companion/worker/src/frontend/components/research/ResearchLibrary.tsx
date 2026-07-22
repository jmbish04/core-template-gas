"use client";

import * as React from "react";
import { ExternalLinkIcon, FileTextIcon, MonitorUpIcon, SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet } from "@/lib/api";

type Tag = { id: number; name: string; htmlColor: string; isActive: boolean };
type ResearchItem = {
  id: string; googleDocId: string; googleDocUrl: string; sourceTitle: string;
  generatedTitle: string | null; summary: string | null; tags: Tag[];
  createdAt: string; syncedAt: string;
  pwa: { id: string; driveFileId: string; title: string } | null;
};

export function ResearchLibrary() {
  const [items, setItems] = React.useState<ResearchItem[]>([]);
  const [query, setQuery] = React.useState("");
  const [tagId, setTagId] = React.useState("all");
  const [mapping, setMapping] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    apiGet<{ documents: ResearchItem[] }>("research/library")
      .then((data) => setItems(data.documents))
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setLoading(false));
  }, []);

  const tags = React.useMemo(() => {
    const map = new Map<number, Tag>();
    for (const item of items) for (const tag of item.tags) map.set(tag.id, tag);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);
  const filtered = items.filter((item) => {
    const haystack = `${item.generatedTitle ?? ""} ${item.sourceTitle} ${item.summary ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (tagId === "all" || item.tags.some((tag) => String(tag.id) === tagId))
      && (mapping === "all" || (mapping === "mapped" ? Boolean(item.pwa) : !item.pwa));
  });

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm font-medium text-primary">Research archive</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Deep research library</h1>
        <p className="mt-2 text-sm text-muted-foreground">Google research documents, their tags, and matched interactive HTML exports.</p>
      </div>
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_14rem_14rem]">
        <label className="relative"><SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter documents…" />
        </label>
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={tagId} onChange={(e) => setTagId(e.target.value)}>
          <option value="all">All tags</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={mapping} onChange={(e) => setMapping(e.target.value)}>
          <option value="all">All HTML mappings</option><option value="mapped">Has HTML</option><option value="unmapped">Missing HTML</option>
        </select>
      </div>
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Document name</TableHead><TableHead>Tags</TableHead><TableHead>HTML</TableHead><TableHead className="text-right">Open</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => { window.location.href = `/research/${item.id}`; }}>
                <TableCell className="max-w-xl"><div className="font-medium">{item.generatedTitle ?? item.sourceTitle}</div><div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.summary ?? item.sourceTitle}</div></TableCell>
                <TableCell><div className="flex max-w-sm flex-wrap gap-1">{item.tags.map((tag) => <Badge key={tag.id} variant="outline" style={{ borderColor: tag.htmlColor, color: tag.htmlColor }}>{tag.name}</Badge>)}{!item.tags.length && <span className="text-xs text-muted-foreground">No tags</span>}</div></TableCell>
                <TableCell>{item.pwa ? <Badge variant="secondary">Mapped</Badge> : <Badge variant="outline">Not mapped</Badge>}</TableCell>
                <TableCell><div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon-sm" render={<a href={`/research/${item.id}`} aria-label="Open research view" />}><FileTextIcon /></Button>
                  <Button variant="ghost" size="icon-sm" render={<a href={`https://docs.google.com/document/d/${item.googleDocId}/edit`} target="_blank" aria-label="Open Google Doc" />}><ExternalLinkIcon /></Button>
                  <Button variant="ghost" size="icon-sm" disabled={!item.pwa} render={item.pwa ? <a href={`/api/research/pwas/${item.pwa.driveFileId}/render`} target="_blank" aria-label="Open HTML app" /> : undefined}><MonitorUpIcon /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {!loading && !filtered.length ? <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No research documents match these filters.</TableCell></TableRow> : null}
            {loading ? <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading research archive…</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
