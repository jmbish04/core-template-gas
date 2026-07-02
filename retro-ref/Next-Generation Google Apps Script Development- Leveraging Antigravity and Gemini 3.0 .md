# Next-Generation Google Apps Script Development: Leveraging Antigravity and Gemini 3.0

![](https://tanaikech.github.io/image-storage/20251121a/fig1.jpg)

## Abstract

This article demonstrates a cutting-edge workflow for Google Apps Script development using Google Antigravity and Gemini 3.0. By integrating `gas-fakes` via the Model Context Protocol (MCP), we establish an environment where autonomous agents can generate, unit-test, and execute cloud-based scripts locally, revolutionizing the standard GAS development lifecycle.

## Introduction

Google Antigravity has officially been released. [Ref](https://antigravity.google/) This is a revolutionary "Agent-first" IDE powered by Gemini 3, designed to empower autonomous AI agents to plan, code, and verify tasks across the Editor, Terminal, and Browser. It is anticipated that this platform will trigger a paradigm shift in how we develop applications and auto-generate comprehensive documentation, moving the industry from simple code completion to fully agentic workflows.

I believe this technology brings a transformative evolution to the development of Google Apps Script (GAS) by finally bridging the gap between local AI agents and the GAS cloud runtime. I have previously published several articles on modernizing GAS development, specifically regarding secure local execution and sandboxing. [Ref](https://medium.com/google-cloud/a-fake-sandbox-for-google-apps-script-a-feasibility-study-on-securely-executing-code-generated-by-cc985ce5dae3) and [Ref](https://medium.com/google-cloud/modern-google-apps-script-workflow-building-on-the-cloud-2255dbd32ac3).

In this article, as a practical test case, I introduce a next-generation development workflow where Google Antigravity's agents utilize the [gas-fakes](https://github.com/brucemcpherson/gas-fakes) and [clasp](https://github.com/google/clasp). This combination allows the AI to autonomously generate, unit-test, and refactor GAS code in a local environment before deployment, solving the historical challenge of local GAS execution.

## Environment Setup

To implement this workflow, we must first establish a communication bridge between the Antigravity IDE and the Google Apps Script runtime.

### 1. Install Google Antigravity

Begin by setting up the IDE. Please check the official release and installation guide at [https://antigravity.google/](https://antigravity.google/).

### 2. Install gas-fakes

We will use `gas-fakes` to emulate the GAS environment locally. Install the CLI tool via `npm`.

```bash
npm -g install @mcpher/gas-fakes
```

### 3. Authorize Access to Google Services

To allow `gas-fakes` to interact with your Google services (Drive, Sheets, etc.) for real-world testing, you must authorize the client.

First, create a `.env` file to store your project configuration. The tool will prompt you for the Project ID (which can be found in your GCP console).

```bash
gas-fakes init
```

Next, run the authorization command. This will guide you through the OAuth flow to log into your Google account and grant the necessary permissions.

```bash
gas-fakes auth
```

Finally, enable the required Google APIs for your project to ensure all necessary services are accessible.

```bash
gas-fakes enableAPIs
```

**Verification:**

Once the setup is complete, run a simple test command to verify that `gas-fakes` is correctly configured. This command uses the tool's sandbox to execute a script that retrieves the name of the root folder in your Google Drive.

```bash
gas-fakes -s "const rootFolder = DriveApp.getRootFolder(); const rootFolderName = rootFolder.getName(); console.log(rootFolderName);"
```

If the command executes without errors and prints your root folder's name, your local environment is ready for development.

### 4. Install Clasp

Install [Clasp](https://github.com/google/clasp), the command-line tool for Google Apps Script:

```bash
npm install -g @google/clasp
```

Authorize Clasp by following the instructions in [the official GitHub repository](https://github.com/google/clasp?tab=readme-ov-file#authorization).

## Integration: Model Context Protocol (MCP)

The core of this workflow is the **Model Context Protocol (MCP)**. The `gas-fakes` and `clasp` CLI functions as an MCP server, allowing the Gemini 3 agents within Antigravity to execute tools and scripts directly. The official documentation for installing MCP servers can be viewed [here](https://antigravity.google/docs/mcp).

For this integration, the MCP server must be manually configured. Open a file named `mcp_config.json` and paste the following configuration:

```json
{
  "mcpServers": {
    "gas-fakes": {
      "command": "gas-fakes",
      "args": [
        "mcp"
      ],
      "disabled": false,
      "disabledTools": []
    },
    "clasp": {
      "command": "clasp",
      "args": [
        "mcp"
      ]
    }
  }
}
```

After saving the file, refresh the MCP server list in Antigravity. When installed correctly, the `gas-fakes` and `clasp` tools will become visible to the AI agent, as shown below:

![](https://tanaikech.github.io/image-storage/20251121a/fig2.jpg)

## Practical Demonstration

With the environment configured, we can now task the Gemini 3 agent with creating and testing Google Apps Scripts. The agent plans the execution, writes the code, and uses the `gas-fakes` tool to verify the output.

### Sample 1: Document Creation

**Prompt:**

```text
Create and run a Google Apps Script that generates a new Google Document named "temp document" containing the paragraph text "sample".
```

**Result:**
The agent successfully calls `DocumentApp` through the local bridge.

![](https://tanaikech.github.io/image-storage/20251121a/fig3.gif)

The generated script is as follows:

```javascript
function createDoc() {
  var doc = DocumentApp.create("temp document");
  var body = doc.getBody();
  body.appendParagraph("sample");
  console.log("Document created: " + doc.getId());
}

createDoc();
```

### Sample 2: Spreadsheet Manipulation

This example tests the agent's ability to retrieve mathematical outputs from Google Sheets created in the script.

**Prompt:**

```text
Create a new Google Spreadsheet by putting a formula `=GOOGLEFINANCE("CURRENCY:USDJPY")` in cell "A1" of the first sheet. Then, get and show the value of cell "A1". (Note: `gas-fakes` has no `getActiveSheet()` method. In this case, use `getSheets()[0]`.)
```

![](https://tanaikech.github.io/image-storage/20251121a/fig4.gif)

**Implementation Plan:**

The Antigravity agent analyzes the request and produces the following plan:

```text
# Create and Read Google Spreadsheet

## Goal Description
Create a new Google Spreadsheet, set the formula `=GOOGLEFINANCE("CURRENCY:USDJPY")` in cell A1, and retrieve the value of that cell using the `gas-fakes` MCP server.

## Proposed Changes
### Script Generation
#### [NEW] [create_sheet.js](file:///temp/workspace/create_sheet.js)
- Create a script that:
    - Creates a new spreadsheet using `SpreadsheetApp.create()`.
    - Gets the first sheet using `getSheets()[0]` (as `getActiveSheet()` is unavailable).
    - Sets the formula in A1.
    - Flushes the spreadsheet.
    - Gets and logs the value of A1.

## Verification Plan
### Automated Tests
- Run the script using `mcp0_run-gas-by-gas-fakes`.
- Check the output for the logged value.
```

**Walkthrough:**

The agent executes the plan and confirms the results.

````text
# Walkthrough - Create and Read Google Spreadsheet

I have successfully created a Google Spreadsheet, set a currency conversion formula, and retrieved the value using `gas-fakes`.

## Execution Results

The script [create_sheet.js](file:///temp/workspace/create_sheet.js) was executed.

```javascript
function createAndReadSheet() {
  var ss = SpreadsheetApp.create("CurrencySheet");
  var sheet = ss.getSheets()[0];
  var cell = sheet.getRange("A1");
  cell.setFormula('=GOOGLEFINANCE("CURRENCY:USDJPY")');
  SpreadsheetApp.flush();
  var value = cell.getValue();
  console.log("Value in A1: " + value);
}
```

### Output
The script outputted the following value for USD/JPY:
```
Value in A1: 157.21
```

## Verification
The value `157.21` confirms that:
1.  The spreadsheet was created.
2.  The formula `=GOOGLEFINANCE("CURRENCY:USDJPY")` was set and calculated.
3.  The value was correctly retrieved and logged.
````

### Sample 3: Push Google Apps Script to Google Drive

This example tests the agent’s ability to push the generated Google Apps Script to Google Drive.

**Prompt:**

```text
Create a new Google Apps Script project in Google Drive and push the script `create_doc.js`.
```

![](https://tanaikech.github.io/image-storage/20251121a/fig5.gif)

**Implementation Plan:**

```text
# Create GAS Project and Push Script

## Goal Description
Create a new Google Apps Script project in the current directory and push the existing [create_doc.js](file:///temp/workspace/create_doc.js) file to it.

## Proposed Changes
### Google Apps Script Project
#### [NEW] [.clasp.json](file:///temp/workspace/.clasp.json)
- Created automatically by `clasp create`.

#### [MODIFY] [create_doc.js](file:///temp/workspace/create_doc.js)
- Will be pushed to the GAS project.

## Verification Plan
### Automated Tests
- Use `mcp0_list_projects` to verify the project exists.
- Use `mcp0_pull_files` to verify the file was pushed (optional, or just trust push output).
```

**Walkthrough:**

```text
# Walkthrough - Create GAS Project and Push Script

I have successfully created a new Google Apps Script project and pushed the [create_doc.js](file:///temp/workspace/create_doc.js) script to it.

## Changes

### Google Apps Script Project

#### [NEW] [.clasp.json](file:///temp/workspace/.clasp.json)
- Created automatically by `clasp create`.

#### [MODIFY] [create_doc.js](file:///temp/workspace/create_doc.js)
- Pushed to the GAS project.

## Verification Results

### Automated Tests
- Verified that the project `create_doc_project` exists using `clasp list`.
- Verified that [create_doc.js](file:///temp/workspace/create_doc.js) was pushed using the output of `clasp push`.
```

## Summary

This article presented a paradigm shift in Google Apps Script (GAS) development by combining the "Agent-first" capabilities of **Google Antigravity** (powered by **Gemini 3.0**) with the local emulation power of **gas-fakes**.

Key takeaways from this next-generation workflow include:

* **The MCP Bridge:** By utilizing the **Model Context Protocol (MCP)**, we successfully transformed the `gas-fakes` CLI and `clasp` into accessible tools for the IDE's AI agents. This creates a seamless bridge between the local development environment and the GAS cloud runtime.
* **Autonomous Lifecycle Management:** We demonstrated that Gemini 3.0 agents can autonomously handle the entire development lifecycle:
    * **Planning:** Analyzing requirements to create implementation strategies.
    * **Coding & Testing:** Writing scripts and verifying logic locally (e.g., handling spreadsheet formulas) without needing to deploy to the cloud first.
    * **Deployment:** Utilizing `clasp` to push verified code to production environments.
* **Self-Healing Workflows:** The workflow allows agents to identify environment limitations (such as the absence of `getActiveSheet()` in the local emulator) and autonomously refactor code to ensure successful execution.

By moving from simple code completion to fully agentic verification and deployment, developers can significantly reduce context switching and accelerate the delivery of robust Google Apps Script solutions.
