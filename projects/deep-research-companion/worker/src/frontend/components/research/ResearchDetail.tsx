"use client";

import * as React from "react";
import { BotIcon, ExternalLinkIcon, FileQuestionIcon, PlusIcon } from "lucide-react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";

import { apiGet, apiSend } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ThreadProvider } from "@/components/assistant/Thread";
import type { ResearchTag } from "./TagManager";

type Pwa = { id: string; driveFileId: string; sourceTitle: string; generatedTitle: string | null; summary: string | null };
type Detail = { document: { id: string; googleDocId: string; sourceTitle: string; generatedTitle: string | null; summary: string | null }; tags: ResearchTag[]; availableTags: ResearchTag[]; pwa: Pwa | null };

function ResearchChat({ docId }: { docId: string }) {
  const agent = useAgent({ agent: "chat-broker", name: `research-${docId}` });
  const chat = useAgentChat({ agent });
  const runtime = useAISDKRuntime(chat);
  return <ThreadProvider runtime={runtime} status={agent.readyState === 1 ? "connected" : "connecting"} welcomeTitle="Ask this research" welcomeSubtitle="Answers are grounded in this document's Vectorize namespace." placeholder="Ask a question about this research…" />;
}

export function ResearchDetail({ id }: { id: string }) {
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [view, setView] = React.useState<"doc" | "pwa">("doc");
  const [tagDialog, setTagDialog] = React.useState(false);
  const [mapDialog, setMapDialog] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [unmapped, setUnmapped] = React.useState<Pwa[]>([]);
  const [chosenPwa, setChosenPwa] = React.useState<string | null>(null);
  const [tagDraft, setTagDraft] = React.useState({ name: "", description: "", htmlColor: "#6366f1", isActive: true });
  const load = React.useCallback(async () => { const data = await apiGet<Detail>(`research/documents/${id}`); setDetail(data); setSelected(data.tags.map((tag) => tag.id)); }, [id]);
  React.useEffect(() => { void load(); }, [load]);
  async function saveTags(ids = selected) { await apiSend("PUT", `research/documents/${id}/tags`, { tagIds: ids }); await load(); }
  async function createTag() { const tag = await apiSend<ResearchTag>("POST", "research/tags", tagDraft); const next = [...new Set([...selected, tag.id])]; setSelected(next); await saveTags(next); setTagDialog(false); }
  async function openMapping() { const data = await apiGet<{ pwas: Pwa[] }>("research/pwas/unmapped"); setUnmapped(data.pwas); setMapDialog(true); }
  async function saveMapping() { if (!chosenPwa || !detail) return; await apiSend("POST", "research/relationships", { driveFileId: chosenPwa, relatedGoogleDocId: detail.document.googleDocId }); setMapDialog(false); await load(); setView("pwa"); }
  async function removeMapping() { if (!detail?.pwa) return; await apiSend("POST", "research/relationships", { driveFileId: detail.pwa.driveFileId, relatedGoogleDocId: null }); await load(); setView("doc"); }
  if (!detail) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading research document…</div>;
  const title = detail.document.generatedTitle ?? detail.document.sourceTitle;
  return <div className="container mx-auto max-w-[1600px] space-y-4 px-4 py-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Research library</a><h1 className="mt-2 text-2xl font-semibold">{title}</h1><p className="mt-1 max-w-4xl text-sm text-muted-foreground">{detail.document.summary}</p></div><div className="flex gap-2"><Button variant="outline" render={<a href={`https://docs.google.com/document/d/${detail.document.googleDocId}/edit`} target="_blank" />}><ExternalLinkIcon />Google Docs</Button><Button onClick={() => setChatOpen(true)}><BotIcon />Ask this research</Button></div></div>
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <Popover><PopoverTrigger render={<Button variant="outline" />}>Tags ({selected.length})</PopoverTrigger><PopoverContent className="w-80"><div className="space-y-2">{detail.availableTags.map((tag) => <label key={tag.id} className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-muted"><Checkbox checked={selected.includes(tag.id)} onCheckedChange={(checked) => setSelected(checked ? [...selected, tag.id] : selected.filter((id) => id !== tag.id))} /><span className="size-2.5 rounded-full" style={{ background: tag.htmlColor }} />{tag.name}</label>)}<Button variant="ghost" className="w-full justify-start" onClick={() => setTagDialog(true)}><PlusIcon />Create tag</Button><Button className="w-full" onClick={() => void saveTags()}>Save tags</Button></div></PopoverContent></Popover>
      {detail.tags.map((tag) => <Badge key={tag.id} variant="outline" style={{ color: tag.htmlColor, borderColor: tag.htmlColor }}>{tag.name}</Badge>)}
      <div className="ml-auto flex items-center gap-2">{detail.pwa ? <><Button variant="outline" size="sm" onClick={() => void openMapping()}>Change HTML mapping</Button><Button variant="ghost" size="sm" onClick={() => void removeMapping()}>Remove mapping</Button></> : null}<Tabs value={view} onValueChange={(value) => setView(value as "doc" | "pwa")}><TabsList><TabsTrigger value="doc">Google Doc</TabsTrigger><TabsTrigger value="pwa" disabled={!detail.pwa}>Interactive HTML</TabsTrigger></TabsList></Tabs></div>
    </div>
    {view === "doc" ? <iframe title={title} className="h-[calc(100vh-15rem)] min-h-[620px] w-full rounded-xl border bg-white" src={`https://docs.google.com/document/d/${detail.document.googleDocId}/edit`} /> : detail.pwa ? <iframe title={detail.pwa.sourceTitle} className="h-[calc(100vh-15rem)] min-h-[620px] w-full rounded-xl border bg-white" src={`/api/research/pwas/${detail.pwa.driveFileId}/render`} /> : null}
    {!detail.pwa ? <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-card text-center"><FileQuestionIcon className="size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">No HTML file could be mapped</h2><p className="mt-1 max-w-lg text-sm text-muted-foreground">The automatic title and timestamp matcher did not find a confident PWA match.</p><Button className="mt-4" variant="outline" onClick={() => void openMapping()}>Map HTML document</Button></div> : null}
    <Dialog open={tagDialog} onOpenChange={setTagDialog}><DialogContent><DialogHeader><DialogTitle>Create and select tag</DialogTitle><DialogDescription>The new active tag will be assigned to this research item.</DialogDescription></DialogHeader><Input placeholder="Name" value={tagDraft.name} onChange={(e) => setTagDraft({ ...tagDraft, name: e.target.value })} /><Textarea placeholder="Description" value={tagDraft.description} onChange={(e) => setTagDraft({ ...tagDraft, description: e.target.value })} /><input type="color" value={tagDraft.htmlColor} onChange={(e) => setTagDraft({ ...tagDraft, htmlColor: e.target.value })} /><Button onClick={() => void createTag()} disabled={!tagDraft.name.trim()}>Create and select</Button></DialogContent></Dialog>
    <Dialog open={mapDialog} onOpenChange={setMapDialog}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>Map an unmatched HTML file</DialogTitle><DialogDescription>Select the matching interactive HTML export.</DialogDescription></DialogHeader><div className="grid max-h-[65vh] gap-3 overflow-auto md:grid-cols-2">{unmapped.map((pwa) => <button key={pwa.driveFileId} onClick={() => setChosenPwa(pwa.driveFileId)} className={`overflow-hidden rounded-xl border text-left ${chosenPwa === pwa.driveFileId ? "ring-2 ring-primary" : ""}`}><iframe className="pointer-events-none h-44 w-full bg-white" src={`/api/research/pwas/${pwa.driveFileId}/render`} title={pwa.sourceTitle} /><div className="p-3 font-medium">{pwa.generatedTitle ?? pwa.sourceTitle}</div></button>)}</div>{!unmapped.length && <p className="py-10 text-center text-muted-foreground">No unmatched HTML files are available.</p>}<Button disabled={!chosenPwa} onClick={() => void saveMapping()}>Save mapping</Button></DialogContent></Dialog>
    <Dialog open={chatOpen} onOpenChange={setChatOpen}><DialogContent className="flex h-[min(85vh,760px)] max-w-2xl flex-col overflow-hidden p-0"><DialogHeader className="border-b p-4"><DialogTitle>Ask this research</DialogTitle><DialogDescription>Vector retrieval is isolated to this Google document.</DialogDescription></DialogHeader><div className="min-h-0 flex-1">{chatOpen ? <ResearchChat docId={detail.document.googleDocId} /> : null}</div></DialogContent></Dialog>
  </div>;
}
