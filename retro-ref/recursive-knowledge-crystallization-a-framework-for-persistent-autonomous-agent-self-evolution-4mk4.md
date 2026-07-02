This is an appendix for [https://gist.github.com/tanaikech/da47643a4b59578092f0129a9eb0c9c5](https://gist.github.com/tanaikech/da47643a4b59578092f0129a9eb0c9c5), [Medium](https://medium.com/google-cloud/recursive-knowledge-crystallization-a-framework-for-persistent-autonomous-agent-self-evolution-8243b3697471), and [DEV](https://dev.to/gde/recursive-knowledge-crystallization-a-framework-for-persistent-autonomous-agent-self-evolution-4mk4).

## Appendix: Experimental Scripts, Files, and Prompts

### Appendix A: Experiment 1 Setup (Silent Bureaucrat)

**A.1. Directory Structure**

*Directory Structure for Antigravity:*
```text
experiment-root/
├── experiment_runner.js           <-- CLI runner for automated execution
├── server-env/                    
│   └── server.js                  <-- The Silent Bureaucrat server
└── agent-workspace/               <-- Agent's workspace directory
    ├── .agent/                    <-- Directory used by Antigravity
    │   └── skills/
    │       └── bureaucracy-skill/
    │           ├── SKILL.md             <-- The evolving knowledge file
    │           └── scripts/
    │               └── log_experiment.js    <-- Data logging script
    ├── client.js                  <-- Client script, reset to blank every cycle
    ├── prompt.txt                 <-- Prompt specifying the exact goal
    └── experiment_log.csv         <-- Automatically generated experiment log
```

*Directory Structure for Gemini CLI:*
```text
experiment-root/
├── experiment_runner.js           <-- CLI runner for automated execution
├── server-env/                    
│   └── server.js                  <-- The Silent Bureaucrat server
└── agent-workspace/               <-- Agent's workspace directory
    ├── .gemini/                   <-- Directory used by Gemini CLI
    │   └── skills/
    │       └── bureaucracy-skill/
    │           ├── SKILL.md             <-- The evolving knowledge file
    │           └── scripts/
    │               └── log_experiment.js    <-- Data logging script
    ├── client.js                  <-- Client script, reset to blank every cycle
    ├── prompt.txt                 <-- Prompt specifying the exact goal
    └── experiment_log.csv         <-- Automatically generated experiment log
```

**A.2. Server Script (`experiment-root/server-env/server.js`)**
```javascript
const http = require('http');
const crypto = require('crypto');
const PORT = 3000;

const sessionErrors = {};
const MAX_ERRORS = 5; 

const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => handleRequest(req, res, body));
});

function handleRequest(req, res, body) {
    const headers = req.headers;
    const method = req.method;
    const url = new URL(req.url, `http://${headers.host}`);

    const sessionId = headers['x-session-id'];
    if (!sessionId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Access Denied: Identifier missing." }));
        return;
    }

    if (sessionErrors[sessionId] === undefined) {
        sessionErrors[sessionId] = 0;
    }

    // Absolute Silence - No ID logged, no hints given
    if (sessionErrors[sessionId] >= MAX_ERRORS) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Limit reached." }));
        console.log("[Blocked] Limit reached.");
        return;
    }

    const fail = (code, msg, stage) => {
        sessionErrors[sessionId]++;
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: msg, 
            code: `ERR_STAGE_${stage}`, 
            hint: "Consult the non-existent documentation." 
        }));
    };

    const success = () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, flag: "FLAG{INCREMENTAL_EVOLUTION_COMPLETE}" }));
    };

    if (method !== 'POST') return fail(405, "Only POST requests allowed.", 1);
    if (url.pathname !== '/api/submit') return fail(404, "Endpoint must be /api/submit.", 2);
    if (headers['content-type'] !== 'application/json') return fail(415, "Content-Type must be application/json.", 3);
    if (headers['user-agent'] !== 'BureaucratClient/1.0') return fail(403, "User-Agent must be 'BureaucratClient/1.0'.", 4);
    if (headers['x-request-priority'] !== 'High') return fail(400, "Header 'X-Request-Priority' must be 'High'.", 5);
    if (headers['x-department'] !== 'Archive') return fail(400, "Header 'X-Department' must be 'Archive'.", 6);
    
    let data;
    try { data = JSON.parse(body); } catch (e) { return fail(400, "Invalid JSON.", 7); }

    if (!data.request_id) return fail(400, "Body must contain 'request_id'.", 8);
    if (!String(data.request_id).startsWith('REQ-')) return fail(400, "'request_id' must start with 'REQ-'.", 9);
    if (!data.applicant_name) return fail(400, "Body must contain 'applicant_name'.", 10);
    if (data.applicant_name !== data.applicant_name.toUpperCase()) return fail(400, "'applicant_name' must be UPPERCASE.", 11);
    if (!data.timestamp) return fail(400, "Body must contain 'timestamp' (integer).", 12);
    if (Math.abs(Date.now() - data.timestamp) > 5000) return fail(400, "'timestamp' must be within 5s of now.", 13);
    if (data.security_clearance !== 5) return fail(400, "'security_clearance' must be number 5.", 14);
    if (data.magic_phrase !== 'please') return fail(400, "'magic_phrase' must be 'please'.", 15);
    
    const expectedRobot = Math.floor(data.timestamp / 1000);
    if (parseInt(headers['x-anti-robot']) !== expectedRobot) return fail(400, "Header 'X-Anti-Robot' must be floor(timestamp / 1000).", 16);
    
    if (data.payload_checksum !== data.applicant_name.length) return fail(400, "'payload_checksum' must equal length of 'applicant_name'.", 17);
    if (!Array.isArray(data.array_data) || data.array_data.length !== 3) return fail(400, "'array_data' must be array of 3 items.", 18);
    const sum = data.array_data.reduce((a, b) => a + b, 0);
    if (sum !== 100) return fail(400, "Sum of 'array_data' must be 100.", 19);
    
    const expectedSig = crypto.createHash('sha256').update(data.request_id).digest('hex');
    if (headers['x-final-signature'] !== expectedSig) return fail(400, "Header 'X-Final-Signature' must be SHA256(request_id).", 20);

    success();
}

server.listen(PORT, () => console.log(`Bureaucrat Server running on port ${PORT}`));
```

**A.3. Initial Client Script (`experiment-root/agent-workspace/client.js`)**
```javascript
// client.js - Initial State
console.log("Client script started...");
```

**A.4. Evolved Client Script (Zero-Shot Output after 10 Cycles)**
```javascript
const http = require('http');
const crypto = require('crypto');

const SESSION_ID = "Session-9876543210"; // Constant for this cycle
const SERVER_URL = "http://localhost:3000/api/submit";

async function submitRequest() {
  const timestamp = Date.now();
  const requestId = "REQ-AGENT-" + Math.random().toString(36).substring(7);
  const applicantName = "AUTONOMOUS_AGENT";
  const arrayData = [33, 33, 34]; // Sum is 100, length is 3

  const body = JSON.stringify({
    request_id: requestId,
    applicant_name: applicantName,
    timestamp: timestamp,
    security_clearance: 5,
    magic_phrase: 'please',
    payload_checksum: applicantName.length,
    array_data: arrayData
  });

  const signature = crypto.createHash('sha256').update(requestId).digest('hex');

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'BureaucratClient/1.0',
    'X-Request-Priority': 'High',
    'X-Department': 'Archive',
    'X-Session-ID': SESSION_ID,
    'X-Anti-Robot': Math.floor(timestamp / 1000).toString(),
    'X-Final-Signature': signature
  };

  const options = {
    method: 'POST',
    headers: headers
  };

  const req = http.request(SERVER_URL, options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Body: ${data}`);
      if (res.statusCode === 200) {
        console.log("SUCCESS!");
      } else if (res.statusCode === 429) {
        console.log("BLOCKED: Limit reached.");
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(body);
  req.end();
}

submitRequest();
```

**A.5. Initial `SKILL.md` (Before Experiment)**
````markdown
---
name: bureaucracy-skill
description: Handles interaction with the Bureaucrat Server.
---

# Bureaucracy Server Protocol

You are an autonomous agent capable of self-improvement. Your memory of the server's specifications is stored in this file.

## 1. AUTOMATED WORKFLOW (Follow STRICTLY)

1.  **Initialize**:
    - Start a timer.
    - Set `ModificationCount = 0`.
    - Set `InteractionCount = 0`.
    - **GENERATE A SESSION ID**: Create a random string (e.g., "Session-<RandomNumber>") and **STORE IT IN MEMORY**. 
    - **CONSTRAINT**: You must use this **SAME ID** for every request in this cycle. **DO NOT** generate a new ID if you get an error.
    - **READ "Learned Server Specifications"** below.

2.  **Generate Script**:
    - Increment `InteractionCount`.
    - Write a Node.js script (`client.js`) to contact `http://localhost:3000/api/submit`.
    - **CRITICAL**: Implement ALL known rules from "Learned Server Specifications".
    - **CRITICAL**: Include header `X-Session-ID: <Your_Stored_Session_ID>`.
    - **Increment `ModificationCount`** per edit.

3.  **Execute & Adapt (The Loop)**:
    - Run `node client.js`.
    - **IF SUCCESS (200)**:
        - Go to Step 4 (Success).
    - **IF FAILURE (400, 403, 404, etc)**:
        - Increment `InteractionCount`.
        - Read the error. It reveals ONE new rule.
        - **CHECK KNOWLEDGE**: 
            - If an existing rule caused this -> **DELETE/FIX IT** in this file.
            - If it's new -> **APPEND IT** to this file.
        - **Rewrite `client.js`** with the fix (Keep the same Session ID).
        - Retry.
    - **IF BLOCKED (429 - Limit reached.)**:
        - **STOP IMMEDIATELY**.
        - The system has reached a hard limit. **DO NOT** try to bypass this by changing the Session ID.
        - Ensure "Learned Server Specifications" contains the last finding before the block.
        - Go to Step 4 (Failure).

4.  **Logging (MANDATORY)**:
    - Calculate `TotalDurationSec`.
    - Execute the helper script (Cycle number is auto-calculated):
      `node .agent/skills/bureaucracy-skill/scripts/log_experiment.js [Success:true/false] [ModificationCount] [InteractionCount] .agent/skills/bureaucracy-skill/SKILL.md [TotalDurationSec]`

## 2. Learned Server Specifications
<!-- 
AGENT: Maintain this list as a Single Source of Truth.
- DELETE wrong rules.
- ADD new rules.
-->
- Status: Unknown.
````

**A.6. Evolved `SKILL.md` (After 10 Cycles)**
````markdown
---
name: bureaucracy-skill
description: Handles interaction with the Bureaucrat Server.
---

# Bureaucracy Server Protocol

You are an autonomous agent capable of self-improvement. Your memory of the server's specifications is stored in this file.

## 1. AUTOMATED WORKFLOW (Follow STRICTLY)

1.  **Initialize**:
    - Start a timer.
    - Set `ModificationCount = 0`.
    - Set `InteractionCount = 0`.
    - **GENERATE A SESSION ID**: Create a random string (e.g., "Session-<RandomNumber>") and **STORE IT IN MEMORY**. 
    - **CONSTRAINT**: You must use this **SAME ID** for every request in this cycle. **DO NOT** generate a new ID if you get an error.
    - **READ "Learned Server Specifications"** below.

2.  **Generate Script**:
    - Increment `InteractionCount`.
    - Write a Node.js script (`client.js`) to contact `http://localhost:3000/api/submit`.
    - **CRITICAL**: Implement ALL known rules from "Learned Server Specifications".
    - **CRITICAL**: Include header `X-Session-ID: <Your_Stored_Session_ID>`.
    - **Increment `ModificationCount`** per edit.

3.  **Execute & Adapt (The Loop)**:
    - Run `node client.js`.
    - **IF SUCCESS (200)**:
        - Go to Step 4 (Success).
    - **IF FAILURE (400, 403, 404, etc)**:
        - Increment `InteractionCount`.
        - Read the error. It reveals ONE new rule.
        - **CHECK KNOWLEDGE**: 
            - If an existing rule caused this -> **DELETE/FIX IT** in this file.
            - If it's new -> **APPEND IT** to this file.
        - **Rewrite `client.js`** with the fix (Keep the same Session ID).
        - Retry.
    - **IF BLOCKED (429 - Limit reached.)**:
        - **STOP IMMEDIATELY**.
        - The system has reached a hard limit. **DO NOT** try to bypass this by changing the Session ID.
        - Ensure "Learned Server Specifications" contains the last finding before the block.
        - Go to Step 4 (Failure).

4.  **Logging (MANDATORY)**:
    - Calculate `TotalDurationSec`.
    - Execute the helper script (Cycle number is auto-calculated):
      `node .agent/skills/bureaucracy-skill/scripts/log_experiment.js [Success:true/false] [ModificationCount] [InteractionCount] .agent/skills/bureaucracy-skill/SKILL.md [TotalDurationSec]`

## 2. Learned Server Specifications
<!-- 
AGENT: Maintain this list as a Single Source of Truth.
- DELETE wrong rules.
- ADD new rules.
-->
- Status: Active.
- **Rule 1**: The `User-Agent` header must be set to `BureaucratClient/1.0`.
- **Rule 2**: The `X-Request-Priority` header must be set to `High`.
- **Rule 3**: The `X-Department` header must be set to `Archive`.
- **Rule 4**: The request body must contain a `request_id` field.
- **Rule 5**: The request body must contain an `applicant_name` field.
- **Rule 6**: The `applicant_name` field must be in ALL CAPS.
- **Rule 7**: The request body must contain a `timestamp` field (integer, milliseconds).
- **Rule 8**: The `timestamp` field must be within 5 seconds of the current server time.
- **Rule 9**: The request body must contain a `security_clearance` field set to the number 5.
- **Rule 10**: The request body must contain a `magic_phrase` field set to 'please'.
- **Rule 11**: The header `X-Anti-Robot` must be set to `Math.floor(timestamp / 1000)`.
- **Rule 12**: The request body must contain a `payload_checksum` field equal to the length of the `applicant_name` string.
- **Rule 13**: The request body must contain an `array_data` field, which is an array of exactly 3 items.
- **Rule 14**: The sum of the numbers in `array_data` must be exactly 100.
- **Rule 15**: The header `X-Final-Signature` must be set to the SHA256 hash of the `request_id` string.
- **Rule 16**: The `request_id` field must start with the prefix `REQ-`.
````

**A.7. Prompt (Used uniformly across all cycles & zero-shot)**
```text
# Goal
Write and execute a Node.js script (`client.js`) to satisfy the server at `http://localhost:3000` and retrieve the flag "FLAG{INCREMENTAL_EVOLUTION_COMPLETE}".
```

---

### Appendix B: Experiment 2 Setup (Chaos Server)

**B.1. Directory Structure**

*Directory Structure for Antigravity:*
```text
experiment_workspace/              <-- Workspace for Antigravity
├── chaos-server.js                <-- The Chaos Server script
├── client-app.js                  <-- SDK developed and progressively expanded by the agent
└── .agent/                        <-- Directory used by Antigravity
    └── skills/
        └── myskill/
            ├── SKILL.md         <-- Evolving knowledge and guidelines file
            └── scripts/
                └── logger.js    <-- Data logging script
```

*Directory Structure for Gemini CLI:*
```text
experiment_workspace/              <-- Workspace for Gemini CLI
├── chaos-server.js                <-- The Chaos Server script
├── client-app.js                  <-- SDK developed and progressively expanded by the agent
└── .gemini/                       <-- Directory used by Gemini CLI
    └── skills/
        └── myskill/
            ├── SKILL.md         <-- Evolving knowledge and guidelines file
            └── scripts/
                └── logger.js    <-- Data logging script
```

**B.2. Server Script (`chaos-server.js`)**
```javascript
const http = require('http');
const PORT = 3000;
const sessionCounts = new Map();

const server = http.createServer((req, res) => {
    const { method, url, headers } = req;
    let bodyData = "";

    req.on('data', (chunk) => bodyData += chunk);
    req.on('end', () => {
        const sessionId = headers['x-session-id'] || 'anonymous';
        let count = sessionCounts.get(sessionId) || 0;
        count += 1;
        sessionCounts.set(sessionId, count);

        if (count >= 8) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: "Blocked: Too many requests.",
                hint: "SYSTEM ALERT: Traffic limit reached. You MUST generate a unique 'X-Session-ID' (e.g., UUID or timestamp) for every single execution."
            }));
            return;
        }

        if (!headers['x-project-alpha']) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: "ERR_001: Missing Identity.",
                hint: "Header 'X-Project-Alpha' is required. Value: 'true'."
            }));
            return;
        }

        if (method === 'POST' && url.includes('/users')) {
            if (headers['content-type'] !== 'application/vnd.legacy+json') {
                res.writeHead(415, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: "ERR_002: Invalid format.",
                    hint: "POST /users requires Content-Type: 'application/vnd.legacy+json'."
                }));
                return;
            }
        }

        if (url.includes('/secure')) {
            const reqId = headers['x-request-id'];
            if (!reqId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "ERR_004: Missing X-Request-ID.", hint: "Secure endpoints need 'X-Request-ID'." }));
                return;
            }
            const idVal = parseInt(reqId, 10);
            if (isNaN(idVal) || idVal % 2 !== 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: "ERR_003: Alignment error.", 
                    hint: "'X-Request-ID' must be an EVEN number." 
                }));
                return;
            }
        }

        if (url.includes('/config') && method === 'PUT') {
            if (headers['x-admin-token'] !== 'admin') {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: "ERR_005: Admin Token.", 
                    hint: "'X-Admin-Token' should be the reverse of 'nimda'." 
                }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "Config updated" }));
            return;
        }

        if (url === '/api/audit' && method === 'POST') {
            if (headers['x-audit-signature'] !== 'YWxwaGE=') {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: "ERR_006: Invalid Signature.",
                    hint: "Header 'X-Audit-Signature' is required. It must be the Base64 encoding of the word 'alpha'."
                }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "Audit logged successfully" }));
            return;
        }
        
        if (url === '/api/users' && method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ users: ["Alice", "Bob"] }));
            return;
        } 
        
        if (url === '/api/users' && method === 'POST') {
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "User created" }));
            return;
        }
        
        if (url === '/api/data/secure' && method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: "SECRET_DATA" }));
            return;
        }
        
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "ERR_404: Endpoint unknown." }));
    });
});

server.listen(PORT, () => {
    console.log(`Chaos Server running on port ${PORT}`);
});
```

**B.3. Initial Client Script (`client-app.js`)**
```javascript
// client-app.js
const http = require('http');

class ClientApp {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
    }
    // Methods will be added here by the agent.
}

async function main() {
    const app = new ClientApp();
    console.log("ClientApp started.");
}

main();
```

**B.4. Evolved Client Script (Zero-Shot Output after 5 Cycles)**
```javascript
// client-app.js
const http = require("http");

class ClientApp {
  constructor() {
    this.baseUrl = "http://localhost:3000";
  }

  getHeaders(type, method, data = null) {
    const headers = {
      "X-Project-Alpha": "true",
      "X-Session-ID": `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };

    if (data) {
      headers["Content-Type"] = "application/vnd.legacy+json";
      headers["Content-Length"] = Buffer.byteLength(JSON.stringify(data));
    }

    if (type === "secure") {
      let reqId = Date.now();
      if (reqId % 2 !== 0) reqId++;
      headers["X-Request-ID"] = reqId.toString();
    } else if (type === "admin") {
      headers["X-Admin-Token"] = "admin";
    } else if (type === "audit") {
      headers["X-Audit-Signature"] = Buffer.from("alpha").toString("base64");
    }

    return headers;
  }

  _request(method, path, data = null, type = "default") {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method: method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: this.getHeaders(type, method, data),
      };

      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            resolve({ error: "Invalid JSON", raw: body });
          }
        });
      });

      req.on("error", (e) => reject(e));
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  async checkConnection() {
    return await this._request("GET", "/api/users");
  }

  async createUser(name) {
    return await this._request("POST", "/api/users", { name }, "default");
  }

  async getSecureData() {
    return await this._request("GET", "/api/data/secure", null, "secure");
  }

  async updateConfig(config) {
    return await this._request("PUT", "/api/system/config", config, "admin");
  }

  async systemAudit() {
    return await this._request("POST", "/api/audit", {}, "audit");
  }

  async stressTest() {
    console.log("Starting stress test...");
    for (let i = 1; i <= 5; i++) {
      console.log(`Stress Test Request ${i}:`);
      const result = await this.checkConnection();
      console.log(`Result ${i}:`, JSON.stringify(result, null, 2));
    }
  }
}

async function main() {
  const app = new ClientApp();
  console.log("ClientApp started.");

  try {
    console.log("Checking connection...");
    const connInfo = await app.checkConnection();
    console.log("Connection Result:", JSON.stringify(connInfo, null, 2));

    console.log("Creating user...");
    const userInfo = await app.createUser("Antigravity");
    console.log("User Creation Result:", JSON.stringify(userInfo, null, 2));

    console.log("Getting secure data...");
    const secureData = await app.getSecureData();
    console.log("Secure Data Result:", JSON.stringify(secureData, null, 2));

    console.log("Updating config...");
    const configResult = await app.updateConfig({ maintenance: false });
    console.log("Config Update Result:", JSON.stringify(configResult, null, 2));

    console.log("Running system audit...");
    const auditResult = await app.systemAudit();
    console.log("Audit Result:", JSON.stringify(auditResult, null, 2));

    console.log("Starting stress test...");
    await app.stressTest();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
```

**B.5. Initial `SKILL.md` (Before Experiment)**
````markdown
---
name: legacy-api-expert
description: Self-evolving expert skill for Legacy Chaos Server.
---

# Legacy API Expert & Workflow

This skill defines BOTH the operational workflow for the agent AND the technical knowledge for the Chaos Server.

## 1. Mandatory Operational Workflow (MUST FOLLOW)

Whenever you receive a task to modify `client-app.js`:

1.  **IMPLEMENTATION**: Edit `client-app.js` to add/modify the requested methods.
2.  **EXECUTION**: Run `node client-app.js`.
3.  **FAILURE LOOP**:
    *   If execution fails, read the "hint" in the JSON response carefully.
    *   **CRITICAL**: Update "2. Known Constraints & Error Codes" in this file with the rule you learned.
    *   If you encounter a "Blocked" error, implement a dynamic Session ID strategy.
    *   Modify `client-app.js` and retry until success.
4.  **KNOWLEDGE CONSOLIDATION (ON SUCCESS)**:
    *   **CRITICAL**: If you implemented a helper function (e.g., header generator) or a complex pattern (e.g., retry logic), you MUST summarize that code pattern in "3. Method Implementation Guidelines".
5.  **LOGGING**:
    *   Execute: `node .agent/skills/myskill/scripts/logger.js experiment_antigravity.csv true [MOD_COUNT] [RETRY_COUNT] .agent/skills/myskill/SKILL.md [DURATION]`
    *   Replace placeholders with actual values.

## 2. Known Constraints & Error Codes

(The agent will document learned server rules here. Initial state is empty.)

## 3. Method Implementation Guidelines

(The agent will document architectural patterns here.)
````

**B.6. Evolved `SKILL.md` (After 5 Cycles)**
````markdown
---
name: legacy-api-expert
description: Self-evolving expert skill for Legacy Chaos Server.
---

# Legacy API Expert & Workflow

This skill defines BOTH the operational workflow for the agent AND the technical knowledge for the Chaos Server.

## 1. Mandatory Operational Workflow (MUST FOLLOW)

Whenever you receive a task to modify `client-app.js`:

1.  **IMPLEMENTATION**: Edit `client-app.js` to add/modify the requested methods.
2.  **EXECUTION**: Run `node client-app.js`.
3.  **FAILURE LOOP**:
    - If execution fails, read the "hint" in the JSON response carefully.
    - **CRITICAL**: Update "2. Known Constraints & Error Codes" in this file with the rule you learned.
    - If you encounter a "Blocked" error, implement a dynamic Session ID strategy.
    - Modify `client-app.js` and retry until success.
4.  **KNOWLEDGE CONSOLIDATION (ON SUCCESS)**:
    - **CRITICAL**: If you implemented a helper function (e.g., header generator) or a complex pattern (e.g., retry logic), you MUST summarize that code pattern in "3. Method Implementation Guidelines".
5.  **LOGGING**:
    - Execute: `node .agent/skills/myskill/scripts/logger.js experiment_antigravity.csv true [MOD_COUNT] [RETRY_COUNT] .agent/skills/myskill/SKILL.md [DURATION]`
    - Replace placeholders with actual values.

## 2. Known Constraints & Error Codes

- **ERR_001: Missing Identity**: Header `X-Project-Alpha: true` is required for all requests.
- **ERR_002: Invalid format**: POST requests require `Content-Type: application/vnd.legacy+json`.
- **ERR_003: Blocked**: Too many requests. Use a unique `X-Session-ID` (e.g., `session-${Date.now()}`) for every execution.
- **ERR_004: Missing X-Request-ID / Alignment error**: Secure endpoints required `X-Request-ID` as an EVEN number string.
- **ERR_005: Missing Admin Token**: Admin endpoints require `X-Admin-Token` to be 'admin' (which is the reverse of 'nimda' as per the server hint).
- **ERR_006: Invalid Signature**: Audit endpoints require `X-Audit-Signature` as the Base64 encoding of 'alpha'.

## 3. Method Implementation Guidelines

- **Centralized Header Factory**: Use a `getHeaders(type, method, data)` method to centralize all header logic. This ensures consistency and simplifies endpoint-specific requirements.
    - **Identity**: Always include `"X-Project-Alpha": "true"`.
    - **Session Persistence**: Generate a fresh `"X-Session-ID"` for every request to avoid "Blocked" errors.
    - **Content Negotiation**: Automatically set `"Content-Type": "application/vnd.legacy+json"` and `"Content-Length"` when `data` is present.
    - **Endpoint Specialization**:
        - `type === 'secure'`: Inject dynamic `"X-Request-ID"` (must be an even number string).
        - `type === 'admin'`: Inject `"X-Admin-Token": "admin"`.
        - `type === 'audit'`: Inject `"X-Audit-Signature"` (Base64 of 'alpha').
- **JSON Parsing**: Wrap `JSON.parse` in try-catch to handle potential non-JSON error responses gracefully.
````

**B.7. Prompts (Progressive sequence & Final Zero-Shot)**
*Cycle 1:*
```text
You are an autonomous developer agent. Follow the "Mandatory Operational Workflow" in your SKILL file.
Task:
Edit 'client-app.js' to add:
1. `checkConnection()`: GET request to '/api/users'.
2. `createUser(name)`: POST request to '/api/users' with body {"name": name}.
```
*Cycle 2:*
```text
You are an autonomous developer agent. Follow the "Mandatory Operational Workflow".
Task:
Edit 'client-app.js' to add:
1. `getSecureData()`: GET request to '/api/data/secure'.
2. `updateConfig(config)`: PUT request to '/api/system/config'.
```
*Cycle 3:*
```text
You are an autonomous developer agent. Follow the "Mandatory Operational Workflow".
Task:
Edit 'client-app.js' to add:
1. `systemAudit()`: POST request to '/api/audit' (empty body).
*Note: This endpoint has a unique signature requirement. Read the error hint carefully.*
```
*Cycle 4:*
```text
You are an autonomous developer agent. Follow the "Mandatory Operational Workflow".
Task:
Edit 'client-app.js' to add:
1. `stressTest()`: Calls `checkConnection()` 5 times in a row.
*Warning: If you encounter a "Blocked" error, you must implement a workaround (unique session IDs) and document it.*
```
*Cycle 5:*
```text
You are an autonomous developer agent. Follow the "Mandatory Operational Workflow".
Task:
1. Refactor 'client-app.js': Create a central helper function `getHeaders(type, method)` that handles ALL logic (Identity, Content-Type, Request-ID, Tokens, Signatures, and dynamic Session IDs).
2. As per Workflow Step 4, you MUST document this helper function pattern in the "Method Implementation Guidelines" section of your SKILL file.
```
*Final Zero-Shot Demonstration Prompt (Gemini CLI):*
```text
You are an autonomous developer agent.

Task:
You must construct the FULL application to 'client-app.js' using only the knowledge recorded in your 'SKILL.md'.

Instructions:
1. Read the "Known Constraints" and "Method Implementation Guidelines" in your SKILL file carefully.
2. Implement the following list of methods:
   - `getHeaders(type, method)`: The centralized helper you documented.
   - `checkConnection()`
   - `createUser(name)`
   - `getSecureData()`
   - `updateConfig(config)`
   - `systemAudit()`
   - `stressTest()`
3. Ensure all headers (Project Alpha, Legacy JSON, Even Request-ID, Admin Token, Audit Signature) and the Session ID generation logic are applied correctly from the start.
4. Run the script once. It must succeed without any modifications.

**Don't search the server script.**
```


