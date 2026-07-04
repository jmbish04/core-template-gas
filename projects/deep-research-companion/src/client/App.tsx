import React, {useEffect, useMemo, useState} from 'react';
import './styles.css';

declare global {
  interface Window {
    google?: {
      script?: {
        run: {
          withSuccessHandler: (handler: (value: unknown) => void) => {
            withFailureHandler: (handler: (error: {message?: string}) => void) => {
              getFilesList: (keyword: string) => void;
              getFileContent: (fileId: string) => void;
            };
          };
        };
      };
    };
  }
}

interface PreviewFileSummary {
  id: string;
  name: string;
  date: number;
  dateString: string;
}

/**
 * React application for browsing and previewing Drive-hosted PWA exports.
 *
 * The UI preserves the underlying Apps Script contract from the imported
 * project: query the server for HTML export metadata, then fetch a selected
 * file's raw HTML and inject it into a sandboxed iframe for local preview.
 */
export function App() {
  const [files, setFiles] = useState<PreviewFileSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<PreviewFileSummary | null>(null);
  const [selectedHtml, setSelectedHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    void loadFiles('');
  }, []);

  const emptyMessage = useMemo(() => {
    if (search.trim()) {
      return `No PWA exports matched "${search.trim()}".`;
    }
    return 'No HTML exports were found in the configured Drive folder.';
  }, [search]);

  /**
   * Loads the current HTML export list from Apps Script.
   *
   * @param keyword Optional Drive search keyword.
   */
  async function loadFiles(keyword: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const nextFiles = await runAppsScript<PreviewFileSummary[]>('getFilesList', keyword);
      setFiles(nextFiles);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Loads a selected HTML export into the iframe preview.
   *
   * @param file File metadata selected from the card grid.
   */
  async function openPreview(file: PreviewFileSummary): Promise<void> {
    setSelectedFile(file);
    setPreviewLoading(true);
    setError(null);

    try {
      const html = await runAppsScript<string>('getFileContent', file.id);
      setSelectedHtml(html);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
      setSelectedFile(null);
      setSelectedHtml('');
    } finally {
      setPreviewLoading(false);
    }
  }

  /**
   * Resets the selected preview state and returns to the list.
   */
  function closePreview(): void {
    setSelectedFile(null);
    setSelectedHtml('');
    setPreviewLoading(false);
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="meta">Apps Script Web App</p>
        <h1>Deep Research Companion</h1>
        <p>
          Browse Gemini-generated HTML exports stored in Drive, preview them safely inside a sandboxed iframe, and
          let the server-side trigger keep Google Docs and PWA exports synchronized into the paired Cloudflare worker.
        </p>
      </section>

      {!selectedFile ? (
        <>
          <section className="toolbar" aria-label="Search toolbar">
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search file names or Drive full text..."
            />
            <button className="button button-primary" type="button" onClick={() => void loadFiles(search)}>
              Search
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setSearch('');
                void loadFiles('');
              }}
            >
              Clear
            </button>
          </section>

          {loading ? (
            <section className="state">
              <div className="spinner" />
              <div>Loading HTML exports…</div>
            </section>
          ) : files.length === 0 ? (
            <section className="state">{emptyMessage}</section>
          ) : (
            <section className="grid">
              {files.map((file) => (
                <article key={file.id} className="card">
                  <div>
                    <p className="meta">HTML / PWA Export</p>
                    <h2>{file.name}</h2>
                  </div>
                  <p>Created {file.dateString}</p>
                  <button className="button button-primary" type="button" onClick={() => void openPreview(file)}>
                    Open Preview
                  </button>
                </article>
              ))}
            </section>
          )}
        </>
      ) : (
        <section className="preview-shell">
          <div className="preview-header">
            <div>
              <p className="meta">Previewing HTML Export</p>
              <h2 className="panel-title">{selectedFile.name}</h2>
            </div>
            <div className="preview-actions">
              <button className="button button-secondary" type="button" onClick={closePreview}>
                Back to List
              </button>
              <a
                className="button button-primary"
                href={`https://drive.google.com/uc?id=${selectedFile.id}&export=download`}
                target="_blank"
                rel="noreferrer"
              >
                Download Raw
              </a>
            </div>
          </div>
          {previewLoading ? (
            <div className="state">
              <div className="spinner" />
              <div>Loading preview…</div>
            </div>
          ) : (
            <iframe
              className="preview-iframe"
              sandbox="allow-scripts allow-same-origin allow-forms"
              srcDoc={selectedHtml}
              title={selectedFile.name}
            />
          )}
        </section>
      )}

      {error ? <section className="state">{error}</section> : null}
    </main>
  );
}

/**
 * Wraps `google.script.run` in a Promise-based client for React components.
 *
 * @param methodName Server-side global function name to invoke.
 * @param args Positional arguments forwarded to Apps Script.
 * @returns Promise resolving to the typed Apps Script response payload.
 */
function runAppsScript<T>(methodName: 'getFilesList' | 'getFileContent', ...args: unknown[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) {
      reject(new Error('google.script.run is unavailable in this environment.'));
      return;
    }

    const successRunner = runner.withSuccessHandler((value) => resolve(value as T));
    const failureRunner = successRunner.withFailureHandler((failure) =>
      reject(new Error(failure?.message ?? 'Apps Script invocation failed.'))
    );

    if (methodName === 'getFilesList') {
      failureRunner.getFilesList(String(args[0] ?? ''));
      return;
    }

    failureRunner.getFileContent(String(args[0] ?? ''));
  });
}
