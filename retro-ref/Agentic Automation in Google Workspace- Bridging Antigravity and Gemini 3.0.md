# Agentic Automation in Google Workspace: Bridging Antigravity and Gemini 3.0

![](https://tanaikech.github.io/image-storage/20251122a/fig1.jpg)

# Abstract

This article explores automating Google Workspace by integrating Google Antigravity and Gemini 3.0 with Model Context Protocol (MCP) servers. We demonstrate how to overcome tool limits and utilize custom extensions to enable AI agents to securely execute scripts, manage files, and perform RAG-based tasks using private data.

# Introduction

Google Antigravity and Gemini 3.0 are ushering in a new era of "Agent-First" development, transforming how we interact with cloud environments. [Ref](https://antigravity.google/) A key component of this evolution is the integration of Model Context Protocol (MCP) servers. When connected to Antigravity, these servers empower the architecture to resolve complex, multi-step tasks by granting the AI direct, standardized access to external tools and proprietary data.

This article introduces a practical approach to **Google Workspace Automation** using Antigravity and Gemini 3.0. To achieve this, we utilize two specific MCP server extensions:

- [ToolsForMCPServer-extension](https://github.com/tanaikech/ToolsForMCPServer-extension): Utilizes Google Apps Script to enable the agent to securely read and write data across Google Workspace.
- [FileSearchStore-extension](https://github.com/tanaikech/FileSearchStore-extension): Provides a managed Retrieval-Augmented Generation (RAG) system to ground automation in your private local documents.

# Prerequisites

Before proceeding, ensure your environment meets the following requirements:

**Gemini CLI:** Must be installed and authenticated.

**Extensions:** The following Gemini CLI Extensions must be installed and verified as working:

- [ToolsForMCPServer-extension](https://github.com/tanaikech/ToolsForMCPServer-extension)
- [FileSearchStore-extension](https://github.com/tanaikech/FileSearchStore-extension)

This guide assumes that the Gemini CLI allows the use of both extensions simultaneously.

# Environment Setup

To implement this workflow, we must establish a communication bridge between the Google Antigravity and the MCP servers.

## 1. Install Google Antigravity

First, set up the IDE environment. Please refer to the official release and installation guide at [https://antigravity.google/](https://antigravity.google/).

## 2. Automatic Installation of MCP Servers

Since `ToolsForMCPServer-extension` and `FileSearchStore-extension` function as MCP servers, they can be automatically detected and configured within Antigravity using a natural language prompt.

Launch Google Antigravity and input the following command:

```text
Search the MCP servers from the Gemini CLI Extensions in my drive and install them.
```

This prompt triggers an update to the `mcp_config.json` file, registering the extensions as follows:

```json
{
  "mcpServers": {
    "tools-for-mcp-server-extension": {
      "command": "node",
      "args": [
        "/home/tanaike/.gemini/extensions/tools-for-mcp-server-extension/mcp-server/src/tools-for-mcp-server-extension.js"
      ]
    },
    "file-search-store-extension": {
      "command": "node",
      "args": [
        "/home/tanaike/.gemini/extensions/file-search-store-extension/mcp-server/src/file-search-store-extension.js"
      ]
    }
  }
}
```

## 3. Configuration and Tool Limitations

After installation, refreshing the MCP servers panel should display the connected tools.

**Important Note on Tool Limits:**

During initial setup, you may encounter an error similar to:
`Error: adding this instance with 160 enabled tools would exceed max limit of 100.` Also, the buttons for enabling or disabling are locked.

![](https://tanaikech.github.io/image-storage/20251122a/fig2a.jpg)

Currently, Google Antigravity restricts the total number of active tools across all MCP servers. While reducing the count to 80 may clear the error, it might still trigger a performance warning: `Warning: To optimize Agent, we recommend that up to 50 tools are enabled.`

**Recommended Solution:**

To ensure stability, I recommend reducing the number of enabled tools to approximately **25**. As shown below, this configuration removes both errors and warnings. I modified `export const tools = [,,,]` at the bottom of the script of `tools-for-mcp-server-extension/mcp-server/src/tools.js`. I believe that this limitation is expected to be resolved in future updates.

![](https://tanaikech.github.io/image-storage/20251122a/fig2b.jpg)

_Note: If the prompt-based installation does not work in your specific environment, you may need to manually edit the `mcp_config.json` file with the paths shown above._

# Use Cases & Walkthroughs

The following samples demonstrate the capabilities of the integrated environment.

## Sample 1: Basic Query

**Objective:** Retrieve real-time data (Weather).

**Prompt:**

```text
What is the current weather in Tokyo?
```

**Result:**

![](https://tanaikech.github.io/image-storage/20251122a/fig3.gif)

_Observation:_ The MCP server of ToolsForMCPServer-extension successfully accessed external data to provide the answer.

## Sample 2: Workflow Automation (Quiz Generation)

**Objective:** Create a quiz in Markdown and automatically generate a Google Form.

**Prompt:**

```text
Your mission is as follows.

1. Generate a quiz. The quiz will be used to cultivate professional expertise in Google Apps Script. The quiz has 5 questions, and each question has five multiple-choice questions.
2. Create the questions and answers in a Markdown file as a Markdown format.
3. Generate a quiz using Google Forms.
```

**Result:**

![](https://tanaikech.github.io/image-storage/20251122a/fig4a.gif)

**Implementation Plan:**

```text
# Google Apps Script Quiz Creation Plan

## Goal Description
Create a 5-question multiple-choice quiz about Google Apps Script, save it as Markdown, and generate a Google Form.

## Proposed Changes
### Documentation
#### [NEW] [quiz.md](file:///home/tanaike/temp/workspace/quiz.md)
- Contains 5 multiple-choice questions with 5 options each.

### Automation
- Use `mcp1_generate_quiz_with_google_forms` to create the form.

## Verification Plan
### Manual Verification
- Review `quiz.md` for correctness.
- Check the generated Google Form URL to ensure questions are correct.
```

**Walkthrough:**

```text
# Google Apps Script Quiz Walkthrough

I have successfully created the Google Apps Script Professional Expertise Quiz.

## Generated Assets
- **Questions File**: [quiz.md](file:///home/tanaike/temp/workspace/quiz.md)
- **Google Form**:
    - [Edit URL](https://docs.google.com/forms/d/###/edit)
    - [Published URL](https://docs.google.com/forms/d/e/###/viewform)

## Verification
- The form contains 5 multiple-choice questions.
- Each question has 5 options.
- The correct answer is set for each question (index 0 in the provided list, but randomized by Forms if configured, though the tool sets a specific correct index).
```

**quiz.md:**

```text
# Google Apps Script Professional Expertise Quiz

## Question 1
Which method is primarily used to retrieve the currently active sheet within a Google Spreadsheet script?
- [x] SpreadsheetApp.getActiveSheet()
- [ ] SpreadsheetApp.getActiveSpreadsheet()
- [ ] SpreadsheetApp.getSheets()[0]
- [ ] SpreadsheetApp.openActive()
- [ ] SpreadsheetApp.setActiveSheet()

## Question 2
Which method of the GmailApp service is used to send a basic email?
- [x] GmailApp.sendEmail(recipient, subject, body)
- [ ] GmailApp.createDraft(recipient, subject, body)
- [ ] GmailApp.send(recipient, subject, body)
- [ ] GmailApp.compose(recipient, subject, body)
- [ ] GmailApp.mail(recipient, subject, body)

## Question 3
What is the correct method to create a text file in the root of Google Drive using DriveApp?
- [x] DriveApp.createFile(name, content)
- [ ] DriveApp.newFile(name, content)
- [ ] DriveApp.addFile(name, content)
- [ ] DriveApp.upload(name, content)
- [ ] DriveApp.insert(name, content)

## Question 4
Which simple trigger function automatically runs when a user modifies a cell value in a spreadsheet?
- [x] onEdit(e)
- [ ] onChange(e)
- [ ] onOpen(e)
- [ ] onUpdate(e)
- [ ] onModify(e)

## Question 5
Which method is used to perform an HTTP GET request to an external API?
- [x] UrlFetchApp.fetch(url)
- [ ] UrlFetchApp.get(url)
- [ ] UrlFetchApp.request(url)
- [ ] UrlFetchApp.send(url)
- [ ] UrlFetchApp.call(url)
```

Also, the following Google Form was created.

![](https://tanaikech.github.io/image-storage/20251122a/fig4b.jpg)

## Sample 3: Cross-Application Logic

**Objective:** Convert Markdown to Google Docs and email the result.

**Prompt:**

```text
Your new mission is as follows.

1. Convert a file `quiz.md` to Google Docs.
2. Create an email including the converted Google Docs. The title is "sampe email". Think of the email body by understanding the file.
3. Send an email to tanaike@hotmail.com
```

**Result:**

![](https://tanaikech.github.io/image-storage/20251122a/fig5.gif)

The agent successfully bridged DriveApp (file conversion) and GmailApp (sending email). The recipient received a context-aware email containing the link to the newly created Google Doc.

Also, I got an email as follows.

```text
Here is the converted Google Doc for the Google Apps Script
Professional Expertise Quiz.

https://docs.google.com/document/d/###/edit
```

## Sample 4: RAG with File Search Store

**Objective:** Ingest external web content into a local vector store (RAG) and generate a summary.

**Prompt:**

```text
Your mission is as follows.

1. Create a new File Search Store.
2. Get the data from https://tanaikech.github.io/about/
3. Upload the data to the File Search Store.
4. Generate content with a prompt `Who is Kanshi Tanaike?` using the File Search Store.
5. Summarize the result.
```

**Result:**

![](https://tanaikech.github.io/image-storage/20251122a/fig6.gif)

**Implementation Plan:**

```text
# Implementation Plan - File Search Store Operations

## Goal
Create a File Search Store, populate it with data from a specific URL, and use it to answer a question.

## Proposed Changes
No code changes to the codebase. This is an operational task using MCP tools.

## Verification Plan
- Verify File Search Store creation via tool output.
- Verify content retrieval via tool output.
- Verify upload success via tool output.
- Verify generation result matches the expected context (about Kanshi Tanaike).
```

**Walkthrough:**

```text
# Walkthrough - File Search Store Operations

## Overview
This walkthrough documents the creation of a File Search Store, populating it with data from a URL, and generating content based on that data.

## Steps Taken

1.  **Created File Search Store**:
    -   Name: `Tanaike Profile Store`
    -   Resource Name: `fileSearchStores/tanaike-profile-store-v5u0bnofjgi9`

2.  **Retrieved Content**:
    -   Source: `https://tanaikech.github.io/about/`
    -   Content fetched and combined from "About Me", "History", and "Activities" sections.

3.  **Uploaded Content**:
    -   Uploaded as text media to the store.

4.  **Generated Content**:
    -   Prompt: "Who is Kanshi Tanaike?"
    -   Result:
        > Kanshi Tanaike is a Japanese scientist who holds a Ph.D. in Physics. He is recognized as a Google Developer Expert (GDE) in Google Workspace and achieved first place in the Outstanding GDE Award on September 26, 2025.
        >
        > His background includes:
        > *   Becoming a Google Developer Expert (Google Workspace) on May 4, 2020.
        > *   Being named a Google Cloud Champion Innovator (Google Workspace) on October 5, 2021.
        > *   The Google Cloud Champion Innovators program merging with the Google Developer Experts program on March 22, 2025.
        >
        > Kanshi Tanaike is driven by a strong curiosity to explore physics and create new solutions, some of which have found practical uses in fields like electronics, industrial machinery, architecture, and aerospace. He is active online, with presences on platforms such as GitHub, Gists, his personal homepage, Qiita (for tips in Japanese), Stackoverflow, and X (formerly Twitter).

## Verification
-   The File Search Store was successfully created.
-   Content was successfully retrieved and uploaded.
-   The generated response accurately reflects the information from the source URL.
```

# Summary

- **Agent-First Architecture:** Google Antigravity combined with Gemini 3.0 allows for complex, autonomous task execution rather than simple command processing.
- **MCP Integration:** The Model Context Protocol enables seamless connectivity between the AI agent and local tools or custom scripts.
- **Performance Optimization:** Currently, limiting the number of active tools (approx. 25) is crucial for maintaining stability and avoiding error limits in Antigravity.
- **Workspace Automation:** Through `ToolsForMCPServer-extension`, agents can control Google Apps Script to automate Forms, Docs, and Gmail workflows.
- **Private RAG Capability:** The `FileSearchStore-extension` allows agents to build on-the-fly knowledge bases from private files or URLs for grounded content generation.
