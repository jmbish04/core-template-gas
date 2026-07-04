"use client";

import * as React from "react";

import { apiGet, apiSend } from "@/lib/api";

type LibraryDocument = {
  id: string;
  googleDocId: string;
  googleDocUrl: string;
  sourceTitle: string;
  generatedTitle: string | null;
  summary: string | null;
  tags: string[];
  createdAt: string;
  syncedAt: string;
};

type LibraryPwa = {
  id: string;
  driveFileId: string;
  driveFileUrl: string;
  sourceTitle: string;
  generatedTitle: string | null;
  summary: string | null;
  tags: string[];
  relatedGoogleDocId: string | null;
  geminiPatched: boolean;
  createdAt: string;
  syncedAt: string;
};

type LibraryResponse = {
  documents: LibraryDocument[];
  pwas: LibraryPwa[];
};

type FilterKind = "all" | "documents" | "pwas";
type OrphanFilter = "all" | "orphans" | "related";

export function ResearchLibrary() {
  const [data, setData] = React.useState<LibraryResponse>({ documents: [], pwas: [] });
  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState<FilterKind>("all");
  const [orphan, setOrphan] = React.useState<OrphanFilter>("all");
  const [selected, setSelected] = React.useState<{ kind: "document"; id: string } | { kind: "pwa"; id: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tagDraft, setTagDraft] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<LibraryResponse>("research/library", { q, kind, orphan });
      setData(next);
      if (!selected && next.documents[0]) {
        setSelected({ kind: "document", id: next.documents[0].googleDocId });
      } else if (!selected && next.pwas[0]) {
        setSelected({ kind: "pwa", id: next.pwas[0].driveFileId });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [kind, orphan, q, selected]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selectedDocument = selected?.kind === "document"
    ? data.documents.find((item) => item.googleDocId === selected.id) ?? null
    : null;
  const selectedPwa = selected?.kind === "pwa"
    ? data.pwas.find((item) => item.driveFileId === selected.id) ?? null
    : null;

  React.useEffect(() => {
    const tags = selectedDocument?.tags ?? selectedPwa?.tags ?? [];
    setTagDraft(tags.join(", "));
  }, [selectedDocument, selectedPwa]);

  async function saveDocumentTags(documentId: string) {
    await apiSend("PATCH", `research/documents/${documentId}`, {
      tags: splitTags(tagDraft),
    });
    await load();
  }

  async function savePwa(pwaId: string, relatedGoogleDocId: string | null) {
    await apiSend("PATCH", `research/pwas/${pwaId}`, {
      tags: splitTags(tagDraft),
      relatedGoogleDocId,
    });
    await load();
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100svh-var(--header-height)-2rem)] max-w-7xl flex-col gap-6 px-4 py-8">
      <section className="rounded-3xl bg-card p-6 ring-1 ring-border/40">
        <p className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Research Archive</p>
        <h1 className="text-3xl font-semibold tracking-tight">Documents and PWA exports</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Browse synced Google Docs and HTML/PWA exports, keep tags up to date, and curate document-to-PWA relationships.
        </p>
      </section>

      <section className="grid gap-4 rounded-3xl bg-card p-4 ring-1 ring-border/40 md:grid-cols-[1.6fr_0.8fr_0.8fr]">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="rounded-xl border border-border/50 bg-background px-4 py-3 text-sm"
          placeholder="Search titles, summaries, or synced content"
        />
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as FilterKind)}
          className="rounded-xl border border-border/50 bg-background px-4 py-3 text-sm"
        >
          <option value="all">All assets</option>
          <option value="documents">Documents only</option>
          <option value="pwas">PWAs only</option>
        </select>
        <select
          value={orphan}
          onChange={(event) => setOrphan(event.target.value as OrphanFilter)}
          className="rounded-xl border border-border/50 bg-background px-4 py-3 text-sm"
        >
          <option value="all">All relations</option>
          <option value="orphans">Orphans only</option>
          <option value="related">Related only</option>
        </select>
      </section>

      {error ? <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[24rem_1fr]">
        <section className="rounded-3xl bg-card p-4 ring-1 ring-border/40">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Library</h2>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="py-10 text-sm text-muted-foreground">Loading archive…</div>
          ) : (
            <div className="space-y-3">
              {data.documents.map((item) => (
                <button
                  key={item.googleDocId}
                  type="button"
                  onClick={() => setSelected({ kind: "document", id: item.googleDocId })}
                  className="block w-full rounded-2xl border border-border/40 px-4 py-3 text-left hover:bg-muted/30"
                >
                  <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Document</div>
                  <div className="font-medium">{item.generatedTitle ?? item.sourceTitle}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary ?? "No summary yet."}</div>
                </button>
              ))}
              {data.pwas.map((item) => (
                <button
                  key={item.driveFileId}
                  type="button"
                  onClick={() => setSelected({ kind: "pwa", id: item.driveFileId })}
                  className="block w-full rounded-2xl border border-border/40 px-4 py-3 text-left hover:bg-muted/30"
                >
                  <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">PWA</div>
                  <div className="font-medium">{item.generatedTitle ?? item.sourceTitle}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary ?? "No summary yet."}</div>
                </button>
              ))}
              {!data.documents.length && !data.pwas.length ? (
                <div className="rounded-2xl border border-dashed border-border/50 px-4 py-10 text-center text-sm text-muted-foreground">
                  No items matched the current filter.
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-card p-4 ring-1 ring-border/40">
          {selectedDocument ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Document View</p>
                <h2 className="text-2xl font-semibold">{selectedDocument.generatedTitle ?? selectedDocument.sourceTitle}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{selectedDocument.summary ?? "No summary yet."}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
                <iframe
                  title={selectedDocument.sourceTitle}
                  className="min-h-[70svh] rounded-2xl border border-border/40 bg-background"
                  src={selectedDocument.googleDocUrl.replace("/edit", "/view")}
                />
                <div className="space-y-3 rounded-2xl border border-border/40 p-4">
                  <label className="block text-sm font-medium">Tags</label>
                  <input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm"
                    placeholder="research, deep-dive, market-map"
                  />
                  <button
                    type="button"
                    onClick={() => void saveDocumentTags(selectedDocument.googleDocId)}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Save Tags
                  </button>
                  <div className="pt-3 text-sm text-muted-foreground">
                    Related PWAs:
                    <ul className="mt-2 space-y-2">
                      {data.pwas.filter((item) => item.relatedGoogleDocId === selectedDocument.googleDocId).map((item) => (
                        <li key={item.driveFileId}>
                          <button
                            type="button"
                            onClick={() => setSelected({ kind: "pwa", id: item.driveFileId })}
                            className="text-left text-primary hover:underline"
                          >
                            {item.generatedTitle ?? item.sourceTitle}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedPwa ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">PWA View</p>
                <h2 className="text-2xl font-semibold">{selectedPwa.generatedTitle ?? selectedPwa.sourceTitle}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{selectedPwa.summary ?? "No summary yet."}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
                <iframe
                  title={selectedPwa.sourceTitle}
                  className="min-h-[70svh] rounded-2xl border border-border/40 bg-background"
                  src={`/api/research/pwas/${selectedPwa.driveFileId}/render`}
                />
                <div className="space-y-3 rounded-2xl border border-border/40 p-4">
                  <label className="block text-sm font-medium">Tags</label>
                  <input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm"
                    placeholder="pwa, gemini, prototype"
                  />
                  <label className="block text-sm font-medium">Related document</label>
                  <select
                    value={selectedPwa.relatedGoogleDocId ?? ""}
                    onChange={(event) => void savePwa(selectedPwa.driveFileId, event.target.value || null)}
                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No relation</option>
                    {data.documents.map((item) => (
                      <option key={item.googleDocId} value={item.googleDocId}>
                        {item.generatedTitle ?? item.sourceTitle}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void savePwa(selectedPwa.driveFileId, selectedPwa.relatedGoogleDocId ?? null)}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Save Tags
                  </button>
                  <div className="text-sm text-muted-foreground">
                    Gemini passthrough:
                    <span className="ml-2 font-medium text-foreground">
                      {selectedPwa.geminiPatched ? "Detected and proxied" : "Not detected"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[40svh] items-center justify-center text-sm text-muted-foreground">
              Select a document or PWA to inspect it.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
