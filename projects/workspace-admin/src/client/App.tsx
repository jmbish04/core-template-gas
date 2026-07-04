import React, {useEffect, useState} from 'react';

import './styles.css';

interface BootstrapState {
  project: string;
  sharedCapabilities: string[];
  workspaceTools: string[];
  docsPath: string;
}

function loadBootstrapState(): Promise<BootstrapState> {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((value: unknown) => resolve(value as BootstrapState))
      .withFailureHandler((error: unknown) => reject(error instanceof Error ? error : new Error(String(error))))
      .getBootstrapState();
  });
}

function runWorkspaceAgent(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((value: unknown) => resolve(String(value)))
      .withFailureHandler((error: unknown) => reject(error instanceof Error ? error : new Error(String(error))))
      .runWorkspaceAgent(prompt);
  });
}

export function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const [prompt, setPrompt] = useState(
    'Summarize the Apps Script repo structure and tell me which shared tools can create a document or read a spreadsheet.'
  );
  const [response, setResponse] = useState('No response yet.');
  const [status, setStatus] = useState('Loading bootstrap state...');

  useEffect(() => {
    void loadBootstrapState()
      .then((state) => {
        setBootstrap(state);
        setStatus('Ready.');
      })
      .catch((error) => {
        setStatus(`Bootstrap failed: ${String(error)}`);
      });
  }, []);

  async function handleRunAgent() {
    setStatus('Running shared AI workflow...');
    try {
      const value = await runWorkspaceAgent(prompt);
      setResponse(value);
      setStatus('Completed.');
    } catch (error) {
      setStatus(`Request failed: ${String(error)}`);
    }
  }

  return (
    <main className="app-shell">
      <section className="panel row">
        <p className="eyebrow">Multi-Project Apps Script Control Plane</p>
        <h1 className="headline">Workspace Admin</h1>
        <p className="subtle">{status}</p>
      </section>

      <section className="panel row">
        <h2>Shared Surface</h2>
        <pre>{JSON.stringify(bootstrap, null, 2)}</pre>
      </section>

      <section className="panel row">
        <h2>Workspace Agent</h2>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <div className="actions">
          <button onClick={() => void handleRunAgent()}>Run Shared AI Flow</button>
          <button onClick={() => google.script.host.close()}>Close</button>
        </div>
      </section>

      <section className="panel row">
        <h2>Latest Result</h2>
        <pre>{response}</pre>
      </section>
    </main>
  );
}
