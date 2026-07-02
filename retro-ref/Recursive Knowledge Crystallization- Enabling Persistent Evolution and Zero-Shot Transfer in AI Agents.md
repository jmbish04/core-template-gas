# Recursive Knowledge Crystallization: Enabling Persistent Evolution and Zero-Shot Transfer in AI Agents

![fig1a](https://tanaikech.github.io/image-storage/20260402a/fig1a.jpg)

# Abstract

This paper presents a self-evolving framework, **Recursive Knowledge Crystallization (RKC)**, designed to overcome the "Catastrophic Forgetting" inherent in autonomous AI agents. By persisting evolved technical insights into a universally readable `SKILL.md` file based on the [Agent skills](https://agentskills.io/home) specification, this approach establishes long-term memory and cross-platform portability. The framework was empirically validated through the development of [gas-fakes](https://github.com/brucemcpherson/gas-fakes), a highly complex Node.js-to-Google Apps Script (GAS) emulation library. The results demonstrate that agents can autonomously internalize project-specific architectural patterns and environmental nuances. Consequently, the framework achieves **Zero-Shot Knowledge Transfer** across distinct toolchains (Google Antigravity and the Gemini CLI) while maintaining absolute 1:1 behavioral parity with the live GAS environment.

# 1. Introduction

In recent years, the automation of software development by autonomous AI agents powered by Large Language Models (LLMs) has advanced rapidly. However, a critical barrier to the practical deployment of such agents is the absence of a "Persistence of Learning." Constrained by LLM context windows and session fragmentation, agents frequently suffer from "Catastrophic Forgetting," losing vital insights acquired during previous interactions. While memory-augmentation frameworks like Reflexion (Shinn et al., 2023) and MemGPT (Packer et al., 2023) have been proposed, they heavily rely on in-memory contexts, dedicated vector databases, or internal virtual memory abstractions. As a result, the acquired knowledge remains locked within specific agent instances, rendering it difficult to port across environments and nearly impossible for human developers to directly audit or manage.

While this limitation might remain latent in small-scale "greenfield" projects, it emerges as a fatal bottleneck when applying Generative AI to large, complex, and deeply constrained legacy projects. The[gas-fakes](https://github.com/brucemcpherson/gas-fakes) project, the subject of this empirical study, encountered this exact limitation. This project serves as a foundational library for converting various Google APIs into mock classes and methods compatible with the Google Apps Script (GAS) environment using Node.js. As the codebase and conversion rules grew in complexity, traditional prompting and standard GenAI approaches frequently resulted in "rule violations"—instances where the AI bypassed strict, project-specific coding conventions to force task completion. Despite repeated trial-and-error iterations and manual context adjustments, the success rate remained insufficient for practical use.

To fundamentally resolve this challenge, this paper introduces a self-evolving framework based on the [Agent skills](https://agentskills.io/home) specification and its dynamic evolution model:[Recursive Knowledge Crystallization (RKC)](https://medium.com/google-cloud/recursive-knowledge-crystallization-a-framework-for-persistent-autonomous-agent-self-evolution-8243b3697471). The defining innovation of this framework is the **"Physical Knowledge Persistence"** of the agent's operational guidelines and technical expertise. This knowledge is crystallized as a universally readable Markdown file (`SKILL.md`) directly onto the local file system.

![RKC Framework Architecture](https://tanaikech.github.io/image-storage/20260402a/fig1b.jpg)

By integrating Gemini 3 and 3.1 with next-generation toolchains—Google Antigravity and the Gemini CLI—we established the development process of `gas-fakes` itself as the agent's continuous learning environment. Specifically, whenever an error occurred during the implementation of new classes or when human developers provided corrective feedback, the agent was issued a single meta-instruction: "Extract insights from the failure and recovery process, and autonomously update your Agent skill (`SKILL.md`, sample scripts, and templates) by adding, deleting, or modifying content."

Through this iterative trial-and-error cycle, the agent accomplished more than merely avoiding local errors; it decoded the implicit rules and complex constraints inherent in the Node.js-to-GAS conversion, eventually internalizing and formalizing the project’s overarching architectural patterns. This evolutionary process extended beyond the `SKILL.md` text to include the refinement of helper scripts, templates, and technical specifications.

As the RKC progressed and the Agent skill reached a state of convergence, the agent fully internalized the complex operational logic of `gas-fakes`. This enabled accurate, rapid development strictly compliant with all project standards. Furthermore, by utilizing the standard file format, this method facilitates **"Zero-Shot Knowledge Transfer"**: implicit knowledge acquired in one environment (e.g., Google Antigravity) can be seamlessly ported to an entirely clean environment (e.g., Gemini CLI) to generate flawless code on the first attempt. Simultaneously, persisting knowledge on a standard file system realizes a **"True Human-AI Collaborative Paradigm,"** empowering human developers to fully visualize, audit, and guide the agent's cognitive evolution.

# 2. Workflow

The development of `gas-fakes` follows an iterative evolution of Agent skills, leveraging both Google Antigravity and the Gemini CLI. This process integrates a continuous feedback loop and culminates in Zero-Shot Knowledge Transfer through the physical persistence of evolved skills. The operational flow, visualized in **Figure 2a**, is defined by the following seven stages:

1.  **Task Initiation**: A development task is assigned via a prompt to either Google Antigravity or the Gemini CLI, specifying the Google Apps Script (GAS) classes and methods to be emulated in the Node.js environment.
2.  **Autonomous Implementation**: Utilizing the current Agent skill (`gas-fakes-dev`), the agent generates the corresponding Node.js classes and methods. Simultaneously, a test suite is authored by strictly adhering to the architectural patterns defined within the `SKILL.md`.
3.  **Local Environment Validation**: The generated test scripts are executed in the local Node.js environment. If runtime errors or logic discrepancies occur, the AI autonomously refactors the implementation and the test code until local stability is achieved.
4.  **Cross-Platform Synchronization**: Following local success, the implementation is deployed to the Google-side script editor (GAS environment). This ensures that the emulation maintains 1:1 parity with the live GAS engine.
5.  **Remote Feedback & Refinement**: If the test suite encounters environment-specific errors in the GAS script editor (e.g., subtle differences in string output formatting or synchronous execution behavior), these errors are fed back to the AI for immediate remediation.
6.  **Knowledge Crystallization**: Once the implementation passes in both local and remote environments, the task is flagged as complete. At this juncture, the AI performs a self-audit to extract critical insights—such as previously undocumented GAS constraints or reusable design patterns—and autonomously updates the Agent skill (`SKILL.md`, helper scripts, and templates).
7.  **Recursive Evolution Loop**: Stages 1 through 6 are continuously cycled. As the `SKILL.md` matures, it transitions from a set of generalized instructions to a highly specialized, project-aware expert system, enabling the agent to resolve increasingly complex architectural challenges with minimal human intervention.

![Workflow](https://tanaikech.github.io/image-storage/20260402a/fig2a.jpg)

Fig 2a: The 7-stage operational workflow of Recursive Knowledge Crystallization.

# 3. Methodology: Environment Setup and Initialization

In this article, it is assumed that Node.js, Google Antigravity, and Gemini CLI have already been installed. To establish the baseline for developing `gas-fakes`, the repository is cloned as follows:

```bash
git clone https://github.com/brucemcpherson/gas-fakes
cd gas-fakes
```

In this empirical study, Google Antigravity and Gemini CLI were utilized in tandem to evolve the agent skill. First, the initial agent skill was established. The directory structure is outlined below. To ensure both agent environments utilized the exact same skill base (`gas-fakes-dev`), they were synchronized using a symbolic link.

```text
gas-fakes/
├── .agent/
│   └── skills/
│       └── gas-fakes-dev/
│           └── SKILL.md
└── .gemini/
    └── skills -> ../.agent/skills/  (symbolic link)
        └── gas-fakes-dev/
            └── SKILL.md
```

Alternatively, to avoid manual linking between the `.agents` and `.gemini` directories, the `gemini.md` configuration file can be utilized to instruct the Gemini CLI to consistently reference the `.agents/workloads` and `.agents/skills` folders. This ensures seamless resource sharing between the CLI and Google Antigravity. Furthermore, including a directive to automatically activate the `gas-fakes-dev` skill within this configuration streamlines the entire initialization process.

The baseline `SKILL.md` was formulated as a generic directive. During the development of `gas-fakes`, this specific skill file served as the target for continuous evolution.

```text
---
name: gas-fakes-dev
description: Develop and implement the 'gas-fakes' project, emulating Google Apps Script (GAS) functionality using Node.js.
tags:[nodejs, google-apps-script, google-cloud-api, testing, mock]
version: "1.0.0"
---

## Summary
This skill enables the agent to assist in the development of the `gas-fakes` project. The primary objective is to emulate Google Apps Script (GAS) behavior using Node.js and Google APIs, allowing Apps Script code to run in a local Node.js environment.

## Usage
- When you need to implement fake/mock functionality for GAS classes or methods.
- When creating test scripts to verify the implemented functionalities.
- When assisting a human developer with Node.js and Google APIs integration.

## Workflow

### 1. Context and Specification Check
Before implementing, verify the specifications of the target Google Apps Script classes and methods. Ensure that the functionality you are about to build aligns with real GAS behavior.

### 2. Implementation
Generate Node.js code that maps GAS methods to the corresponding Google Cloud APIs.
- Refer to the existing codebase in the `src/` directory to understand the current architecture.
- Ensure the code runs correctly in the Node.js environment.

### 3. Testing
You must verify your implementation by writing and executing test scripts.
- Place your test scripts in the `test/` directory.
- Execute the tests to ensure there are no errors and the behavior matches expectations.

### 4. Holistic/Targeted Skill Evolution (Self-Updating SKILL)
**[CRITICAL INSTRUCTION]**
The `gas-fakes` project is complex, and bridging Node.js with GAS involves many hidden constraints, specific architectural patterns, and potential errors. You are required to continuously learn and autonomously evolve this SKILL.

- **Trigger:** Whenever you encounter an error during implementation or testing, or when you receive correction feedback/prompts from the human developer.
- **Action:** You MUST extract the lessons learned from the failure and recovery process. Identify the underlying rules, technical constraints, or coding patterns that caused the issue.
- **Update:** Immediately update this `SKILL.md` file (by adding, deleting, or modifying content) to document the newly acquired knowledge. If necessary, also create or update sample scripts, helper templates, or explanatory Markdown files in the project.
- **Goal:** Transform your localized, temporary learnings into permanent, universally readable knowledge to prevent repeating the same mistakes and to handle the complexities of the project autonomously.

## Delivery
- Output the complete code for modified or newly created service classes and test scripts.
- **ALWAYS output the updated `SKILL.md`** when new knowledge is extracted and crystallized.
```

**Also, please install Model Context Protocol (MCP) servers for Google Workspace development. [Ref](https://developers.google.com/workspace/guides/developer-tools#mcp) This MCP server is used from this agent skill.**

**When a command `/gas-fakes-dev` is put into the chat, this skill can be activated.**

Because `gas-fakes` emulates Google Apps Script using Node.js, generated test scripts are strictly required to function flawlessly in both the local Node.js environment and the cloud-based Google Apps Script editor. Utilizing the initial, generic skill often resulted in scripts that passed locally but failed in the cloud environment. This discrepancy served as the primary catalyst for triggering the agent's evolutionary loop.

# 4. Crystallization of Knowledge: The Evolved Agent Skill

After extensive trial and error implementing various GAS classes and methods, the agent dynamically restructured and expanded its own skill set.

![Agent Skill Evolution Comparison](https://tanaikech.github.io/image-storage/20260402a/fig2b.jpg)

The evolved repository structure incorporated new templates, examples, and scripts generated by the agent to support its new architectural insights. You can see the details of this agent skill from [https://github.com/tanaikech/agent-skill-for-developing-gas-fakes](https://github.com/tanaikech/agent-skill-for-developing-gas-fakes).

```text
gas-fakes/
├── .agent/
│   └── skills/
│       └── gas-fakes-dev/
│           ├── examples/
│           │   ├── batch_update_pattern.js
│           │   └── proxy_guard_pattern.js
│           ├── resources/
│           │   ├── class_template.js
│           │   ├── sync_mechanism.md
│           │   └── test_template.js
│           ├── scripts/
│           │   ├── run_target_test.js
│           │   └── scaffold_service.js
│           └── SKILL.md
└── .gemini/
    └── skills -> ../.agent/skills/  (symbolic link)
        └── gas-fakes-dev/
            ├── examples/
            ├── resources/
            ├── scripts/
            └── SKILL.md
```

The resultant, highly complex `SKILL.md` (Version 2.0.0) evolved into a comprehensive system architecture document as follows. [Ref](https://github.com/tanaikech/agent-skill-for-developing-gas-fakes/blob/master/gas-fakes-dev/SKILL.md)

````text
---
name: gas-fakes-dev
description: Develop, implement, and test the 'gas-fakes' project, emulating ALL Google Apps Script (GAS) functionality using Node.js and Google APIs.
tags: [nodejs, google-apps-script, google-cloud-api, testing, mock, simulation]
version: "2.0.0"
---

## Summary
This skill enables the agent to act as a Senior Expert proficient in Node.js, Google Cloud, and Shell Scripting to assist in the development of the `gas-fakes` project.
The ultimate objective is to **emulate the behavior of live Google Apps Script exactly** by mapping classes and methods to their fake equivalents. This allows Apps Script to run anywhere Node runs.
This is achieved using a **worker mechanism** to handle the conversion from synchronous (Apps Script) to asynchronous (Google APIs) operations, returning the results synchronously. Ultimately, all Apps Script classes and methods will be available via `gas-fakes`. For a deep dive into this mechanism, see the [Sync-to-Async Bridge Guide](./resources/sync_mechanism.md).

## Usage
- When you need to implement or modify mock functionality for specific GAS classes or methods.
- When creating logic that reproduces GAS behavior using Google APIs and the worker mechanism.
- When adding new service classes to fit the existing `gas-fakes` project structure.
- When creating test scripts and registering them for local execution within the `test/` directory.
- When executing generated Apps Script files locally.
- When technical advice or debugging assistance based on GAS specifications is required.

## Configuration
`gas-fakes` relies on an `.env` file (maintained by `gas-fakes init` and `auth`) to properly authenticate and run.

### Authentication Methods
- **DWD (Domain Wide Delegation) - *Preferred***: Uses a service account to impersonate a user logged into gcloud. The service account name must be specified in the `.env` file. This is **required** if restricted/sensitive scopes are needed, or if running `gas-fakes` on Google Cloud Run.
- **ADC (Application Default Credentials)**: If no `.env` file is provided, `gas-fakes` falls back to ADC. This is usually fine for local development as standard `cloud_platform` and `drive` scopes are automatically assigned during auth.

Ensure your `.env` is properly loaded (e.g., using `node --env-file <env-file>` or `gas-fakes -e <env-file>`) to ensure DWD is used when necessary.
- **`TEST_SPREADSHEET_ID`**: (Optional) Spreadsheet ID for real-environment testing.

## Workflow

### 1. Context, Specification, and Dependency Check
Before starting implementation, you must understand the full scope and style of the project.

- **Restricted Directories**:
  * **NEVER modify any files located in the `progress` directory** during the development of `gas-fakes`. This directory is strictly off-limits.

- **Mandatory Existence Verification**:
  When adding or updating ANY class or method, you must **ALWAYS use the `workspace-developer` MCP server** (if available) or search official documentation to verify the existence and specification of the target and ALL related classes/methods.
  *   **NEVER create classes or methods that do not exist in the actual Google Apps Script environment.**
  *   Do not guess. Confirm exact names, parameter structures, and return types.
  *   *Example*: If implementing `Sheet.getCharts()`, check what object it returns (`EmbeddedChart` vs `Chart`) and verify the methods available on that returned object.

- **Strict Enum Verification**:
  **Do not invent Enums.** Before using or creating an Enum, verify if it actually exists in Google Apps Script.
  *   **Note on `ChartType`**: In Google Apps Script, `ChartType` is a property of the `Charts` service (`Charts.ChartType`), not `SpreadsheetApp`.

- **Reference Existing Code**:
  Check the `src` and `test` directories to understand the existing coding style and architecture. Apply these patterns to new classes and methods.

- **Identify Dependencies**:
  Identify and implement **all related classes and methods** required for the target feature. (e.g., if `newChart()` returns `EmbeddedChartBuilder`, verify/implement that builder class too).

### 2. Scaffolding
Do not create service files manually. Use the provided helper script.

- **Command**:
  ```bash
  node .agent/skills/gas-fakes-dev/scripts/scaffold_service.js --service=<ServiceName> --class=<ClassName>
  ```

### 3. Implementation
Generate code based on Node.js best practices, adhering to these rules to maintain environmental consistency with live Apps Script:

- **Comprehensive Implementation**: Implement the target feature and its dependencies together.
- **Cross-Environment Compatibility**: Scripts must be designed to run on both Node.js (local) and GAS Script Editor with identical results.
- `toString()` Accuracy: The `toString()` method must return the **exact GAS class name or specific string output** (e.g., `"Sheet"` or `"[Document:  ...]"`). Pay extreme attention to whitespace; GAS output can contain double spaces (e.g., after a colon).
- **Dynamic Resources and Caching Pattern**:
  *   **The `__resource` property**: Always access the underlying API state via the dynamic `__resource` getter (tracing back to the parent element or a synchronized cache).
  *   **Stale State Prevention**: NEVER store API resources directly in class instance variables. They will become stale when the cache is cleared.
  *   **Cache Invalidation**: Every time a destructive API call is made, the cache is cleared. Dynamically accessing `__resource` ensures you get the most up-to-date state from the API or the fresh cache.
- **Implementation Patterns**:
  1. Use `signatureArgs` or `is.*` utilities.
  2. Construct the request object.
  3. Execute via `this.__batchUpdate` (or helper).
  4. Return `this` for chaining.

- **Coding Patterns**:
  *   **Naming**: Internal implementation classes should be prefixed with `Fake` (e.g., `FakeSheet`, `FakeEmbeddedChart`).
  *   **Lazy Loading**: New top-level services must be registered using the `lazyLoaderApp` pattern in their respective `app.js` to ensure they are only instantiated when accessed.
  *   **Singleton Pattern**: Service entry points usually export a "maker" function (e.g., `newFakeSpreadsheetApp`) that return the singleton instance.

- **Specific Technical Nuances**:
  *   **Sync-to-Async Bridge**: Always use the worker bridge for external API calls to maintain synchronous Apps Script behavior. Follow the pattern: `Fake Class` -> `Syncit (fx*)` -> `callSync` -> `Worker Loop` -> `sx* Function` -> `sxRetry`. See [detailed guide](./resources/sync_mechanism.md) for implementation steps.
  *   **Charts**: When retrieving a chart's title, use `getOptions().get("title")` instead of internal specs.
  *   **EmbeddedChart**: To get the type of an existing chart, use `modify().getChartType()` instead of a non-existent `getType()` method.
  *   **GridRange to FakeRange Conversion**: When mapping an API `GridRange` to a `FakeSheetRange`:
    *   Indices in the API are 0-indexed and the end index is **exclusive**.
    *   GAS methods (like `getRange(row, col, numRows, numCols)`) use 1-indexed start positions and row/column counts.
    *   If `endRowIndex` or `endColumnIndex` is undefined in the API response, it means the range extends to the boundary of the sheet. Use `sheet.getMaxRows()` and `sheet.getMaxColumns()` as fallbacks to calculate `numRows` and `numCols`.
  *   **ContainerInfo**: This class is used by `EmbeddedChart`, `Slicer`, and `Drawing`.
    *   Map `getAnchorRow()` and `getAnchorColumn()` to 0-indexed API fields `anchorCell.rowIndex + 1` and `anchorCell.columnIndex + 1`.
    *   Map `getOffsetX()` and `getOffsetY()` directly to `offsetXPixels` and `offsetYPixels`.
  *   **XmlService**:
    *   `Element.getName()` returns the **local name** (no prefix).
    *   `Document.toString()` output is very specific: `[Document:  No DOCTYPE declaration, Root is [Element: <rootName/>]]` (note the double space after `Document:`).
    *   Namespace-aware methods (like `getChild(name, namespace)`) require mapping prefixes and URIs correctly.

### 4. Testing
You must ensure every implementation is verified by tests that precisely emulate Google Apps Script behavior.

- **Mandatory Feature Coverage**:
  - **Every new class or method MUST have a corresponding test.**
  - If you implement multiple methods, create a test script that exercises all of them.
  - Test only implemented features; do not include placeholders for future work.

- **Edge Case Capturing**:
  - **Capture and verify boundary conditions, invalid inputs, and error states.**
  - Use `t.rxMatch(t.threw(() => ...).message, /regex/)` to verify that methods throw expected GAS error messages when given invalid arguments.
  - Test with `null`, `undefined`, empty strings, and out-of-bounds values where applicable to ensure robust emulation.

- **GAS Compatibility Requirement**:
  - Test logic (inside `unit.section`) must be compatible with the **Google Apps Script script editor**.
  - Avoid Node.js-specific modules (e.g., `fs`, `path`) inside the test logic.
  - Use `ScriptApp.isFake` or `xxxApp.isFake` to toggle environment-specific logging or assertions.

- **Test Script Structure**:
  - **Imports**: standard test scripts import `@mcpher/gas-fakes`, `@sindresorhus/is`, and helpers from `./testinit.js` and `./testassist.js`.
  - **Export Pattern**: Export a named function (e.g., `export const testService = (pack) => { ... }`) to allow integration into the main test suite.
  - **Execution Hook**: Always include `wrapupTest(testService);` at the end of the file for standalone execution.
  - **Sections**: Use `unit.section("description", (t) => { ... })` to group tests.

- **Resource Lifecycle and Cleanup**:
  - **The `toTrash` pattern**: Maintain a `toTrash` array within your test function. Push any created resources (files, folders, sheets) into this array.
  - **Automatic Cleanup**: Use `trasher(toTrash)` at the end of the test function (usually triggered if `fixes.CLEAN` is true) to ensure the test environment remains pristine.

- **Naming Convention**:
  - **Google Sheets**: `testsheets{class name}.js` (e.g., `testsheetsrange.js`)
  - **Google Docs**: `testdocs{class name}.js`
  - **Google Slides**: `testslides{class name}.js`
  - **General/Other**: `test{service}{class name}.js`

- **Registration**:
  1. Create the file in `test/`.
  2. Add to `test/test.js`.
  3. Add a script entry in `test/package.json`.

- **Execution**:
  > [!IMPORTANT]
  > **Run tests from the `test/` directory.**
  > `cd test && node test{filename}.js execute` (or `npm run <script-name>`).

- **Clasp Verification**:
  Use `testongas/test/` to verify against a real GAS project via `clasp`.

### 5. Executing Generated Scripts
You can execute any generated Apps Script file using `gas-fakes` in a local sandbox.

- **Testing the Local Branch (Preferred for Dev)**:
  Use the local `.env` file and run the local `gas-fakes` implementation.
  ```bash
  node --env-file ./.env gas-fakes -f myscript.js
  ```
- **Testing Global Installation**:
  ```bash
  npx gas-fakes -f myscript.js
  ```
  *(Sandbox flags can be added as requested by the user to control the environment)*

### 6. Refinement & Continuous Evolution (Self-Updating SKILL)
To ensure the `gas-fakes` project and this SKILL continuously evolve and improve efficiently, you **MUST** actively refine and update the SKILL definition (`SKILL.md`) and its associated resources based on the outcomes of your development processes.

#### 6.1 Skill Audit Criteria
At the conclusion of every task, perform a "Self-Audit" by answering:
1. **New Pattern?** Did I implement a new mapping logic (e.g., API-to-GAS index shifts) or a reusable architectural pattern?
2. **Missing Nuance?** Did I encounter a technical detail (like a specific `toString()` format or Enum location) that wasn't documented?
3. **Corrected Assumption?** Did a test failure or user hint reveal that a rule in this SKILL was incomplete or incorrect?
4. **New Service?** Did I add a new class that requires a dedicated section in the "Technical Nuances" list?

#### 6.2 Prompt for Update Mandate
If any criteria in the "Skill Audit" are met, you MUST:
- **Analyze the New Knowledge**: Determine what core knowledge, rule, constraint, or pattern was derived from the success or resolution.
- **Identify the Change**: Specifically state what needs to be added, modified, or deleted in `SKILL.md`.
- **Propose the Edit**: Present the specific Markdown block intended for the update.
- **Ask for Confirmation**: Explicitly ask the user: *"Based on this task, I recommend updating the SKILL.md with the following [nuance/pattern]. Should I apply this change?"*
- **Update Associated Assets**: If the new knowledge involves a reusable code structure or boilerplate, add or update files in the `examples/`, `resources/`, or `scripts/` directories to reflect the new best practice.

### 7. Delivery
- **Output**: Full content of modified or newly created files (Service class, Node.js test, etc.).
- **Skill Audit**: Provide a brief (1-2 sentence) summary of your Self-Audit results.
- **Update Prompt**: If any audit criteria were met, issue the "Prompt for Update" as defined in section 6.2.
- **Finality**: Conclude with a concise summary of the task results.
````

### Key Milestones in the Agent's Evolution:

- **Role and Expertise Reclassification**: The agent's persona autonomously shifted from a general "assistant" to a "Senior Expert" with specific cross-domain mastery in Node.js, Google Cloud, and Shell Scripting.
- **Architectural Specification (Sync-to-Async Bridge)**: The evolved skill introduced a sophisticated "worker mechanism" and "Syncit" pattern. This addressed the core technical challenge of mapping asynchronous Node.js/Google APIs to the synchronous execution model of Google Apps Script.
- **Strict Verification & Grounding**: New mandates required the use of the `workspace-developer` MCP server and official documentation. This systematically eliminated "hallucinated" methods, ensuring absolute 1:1 parity with the live GAS environment.
- **Technical Nuance Crystallization**: Highly specific, undocumented "gotchas" discovered during the failure/recovery loops were codified. This included 0-indexed vs. 1-indexed coordinate conversions, exact string matching for `toString()` (including hidden whitespace), and specific Enum locations.
- **Self-Evolution Logic (Crystallization Loop)**: The trigger for skill updates shifted from a reactive "whenever an error occurs" (v1) to a proactive, structured "Self-Audit" protocol (v2). The agent learned to analyze patterns, propose edits to the human developer, and automatically update associated boilerplate assets.

# 5. Empirical Evaluation: Cross-Environment Knowledge Transfer

To validate the efficacy of the RKC framework, practical development tasks were executed utilizing the actively evolving agent skill across two distinct interfaces: Google Antigravity and the Gemini CLI.

## 5.1 Evaluation in Google Antigravity

### Sample 1: Architectural Refinement via Self-Audit

**Prompt1:**

```text
Add the method `insertTextBox(String,Number,Number,Number,Number)` of Class Slide. This method should be included in the file `src/services/slidesapp/fakeslide.js`.
```

**Prompt2:**

```text
Add the method `insertTable(Table)` of Class Slide. This method should be included in the file `src/services/slidesapp/fakeslide.js`.
```

![Result on the agent manager](https://tanaikech.github.io/image-storage/20260402a/fig3a.jpg)

Fig. 3a: Agent executing implementation and autonomously applying the Dynamic Resources Pattern.

To evaluate continuous learning, we tasked the agent with implementing `insertTextBox` and `insertTable`. The task required creating underlying architectural dependencies, such as `FakeTable`, `FakeTableRow`, and `FakeTableCell`. Initially, the agent generated functional code. However, as shown in **Figure 3a**, the true strength of the framework was demonstrated during the self-evolution phase. The agent autonomously identified a potential flaw regarding resource management. It proactively refactored the classes to adhere to a newly conceptualized "Dynamic Resources Pattern," replacing static constructor assignments with dynamic getters to ensure robust state synchronization. Crucially, the agent updated `SKILL.md` with this rule, ensuring future compliance. Following this refinement, all 23 test cases passed with 100% accuracy.

### Sample 2: Internalization of Design Philosophy

**Prompt:**

```text
Add the method `getTables()` of Class Slide. This method should be included in the file `src/services/slidesapp/fakeslide.js`.
Add the method `getShapes()` of Class Slide. This method should be included in the file `src/services/slidesapp/fakeslide.js`.
```

![Result on the agent manager](https://tanaikech.github.io/image-storage/20260402a/fig3b.jpg)

Fig. 3b: Agent applying functional programming patterns to dynamically cast page elements.

In this experiment (see **Figure 3b**), the agent demonstrated a deep internalization of the project's design philosophy. Instead of implementing redundant storage logic for arrays of specific shapes, it autonomously utilized the generic `getPageElements()` method, applying `.filter()` and `.map()` to dynamically cast elements. This approach perfectly adhered to the "Dynamic Resources Pattern" crystallized in the previous task. All 28 assertions in the subsequent test suite passed flawlessly.

### Sample 3: Bridging Environmental Discrepancies

**Prompt 1 & 2 (Summarized):**

```text
Add a Class XmlService and a method `parse`...
When `test/testxmlservice.js` is run with the script editor of Google Apps Script, the error occurred. Update the scripts.
```

![Result on the agent manager](https://tanaikech.github.io/image-storage/20260402a/fig3c.jpg)

Fig. 3c: Agent resolving GAS-specific formatting rules through remote feedback.

This task required bridging the gap between Node.js simulation and actual GAS behavior for XML parsing. While the initial code passed local Node.js tests, execution in the GAS editor revealed critical discrepancies, such as unique double-space formatting in `toString()` outputs (`[Document:  No DOCTYPE...]`) and precise namespace handling. Upon receiving this remote error feedback (see **Figure 3c**), the agent performed a systemic refactoring. Following the RKC framework, it updated the `SKILL.md`, formally persisting these "hidden" GAS-specific formatting rules as permanent constraints.

### Sample 4: Achieving Environment-Aware Precision

**Prompts 1, 2 & 3 (Summarized):**

```text
Add the `getPrettyFormat` and `getRawFormat` methods to the `XmlService` class.
Resolve issues regarding \r\n line breaks appearing in raw format tests on GAS...
```

![Result on the agent manager](https://tanaikech.github.io/image-storage/20260402a/fig3d.jpg)

Fig. 3d: Agent crystallizing nuanced serialization behaviors into persistent memory.

This experiment focused on achieving high-fidelity parity with GAS’s unique XML serialization. Through iterative feedback, the agent discovered that GAS consistently injects a line separator (`\r\n`) after the XML declaration and at the document's end, even in "raw" format. As captured in **Figure 3d**, the agent refactored the `FakeFormat` class and crystallized these insights into `SKILL.md`. Final verification yielded a 100% success rate across 21 test cases, proving the framework's capacity for "Environment-Aware Precision."

## 5.2 Zero-Shot Knowledge Transfer via Gemini CLI

### Sample 1: Cross-Platform Environment Porting

**Prompt:**

```text
Implement the following methods for the `ContainerInfo` class within the `EmbeddedChart` class hierarchy of Google Sheets: `getAnchorColumn()`, `getAnchorRow()`, `getOffsetX()`, and `getOffsetY()`.

Please follow these operational guidelines:
1. **Skill Declaration**: Explicitly state the agent skills or tools being utilized before proceeding.
2. **Task Execution & Summary**: Provide the implemented code/definitions and conclude with a concise summary of the task results.
```

![Result on the Gemini CLI](https://tanaikech.github.io/image-storage/20260402a/fig3e.jpg)

Fig. 3e: Gemini CLI agent achieving Zero-Shot Knowledge Transfer utilizing the shared SKILL.md.

This experiment validated the "Zero-Shot Knowledge Transfer" capability by transitioning the execution environment entirely from Google Antigravity to the Gemini CLI. By referencing the highly evolved `SKILL.md` persisted on the local file system, the CLI-based agent immediately understood the complex architectural patterns (see **Figure 3e**). It autonomously implemented `FakeContainerInfo` using the project-specific `Proxies.guard` pattern. The generated code strictly followed naming conventions and correctly converted 0-based API indices to 1-based GAS indices on its very first attempt, passing all 11 tests with 100% accuracy.

### Sample 2: Agents as Architectural Contributors

**Prompt:**

```text
Implement the `getRanges()` method for the `EmbeddedChart` class in the Google Sheets service.

Please follow these operational guidelines:
1. **Skill Declaration**: Explicitly state the agent skills or tools being utilized before proceeding.
2. **Task Execution & Summary**: Provide the implemented code/definitions and conclude with a concise summary of the task results.
```

![Result on the Gemini CLI](https://tanaikech.github.io/image-storage/20260402a/fig3f.jpg)

Fig. 3f: Gemini CLI agent performing a Self-Audit and proposing architectural updates.

Focusing on the `getRanges()` method, the CLI agent transformed nested API `GridRange` structures into GAS `Range` instances. It elegantly handled discrepancies between exclusive 0-based API bounds and inclusive 1-based GAS boundaries. Most significantly, as shown in **Figure 3f**, the agent autonomously triggered its "Skill Audit" protocol upon completion. It identified a recurring logic pattern for `GridRange` conversions and proactively recommended a structural update to the `SKILL.md`. This illustrates that the RKC framework enables agents to transcend basic execution, allowing them to act as proactive "Architectural Contributors."

# 6. Conclusion

Through the empirical development of the `gas-fakes` emulation library, this research validates the profound efficacy of the Recursive Knowledge Crystallization (RKC) framework. Key findings include:

- **Physical Knowledge Persistence**: By crystallizing an agent's evolving technical expertise into universally readable, local Markdown files (`SKILL.md`), the framework successfully mitigates "Catastrophic Forgetting" and establishes an auditable, persistent memory layer.
- **Recursive Evolution Loop**: The implementation of an autonomous "Self-Audit" protocol enabled the agent to systematically extract architectural insights from failure/recovery cycles, thereby refining its own operational directives.
- **Environment-Aware Precision**: The agent successfully codified highly obscure, undocumented system constraints (e.g., hidden string formatting and complex coordinate mapping logic) directly into its skill set, guaranteeing high-fidelity behavioral emulation.
- **Zero-Shot Knowledge Transfer**: The study empirically proved that evolved, highly specialized skills can be seamlessly and instantaneously ported across entirely distinct environments (from Google Antigravity to Gemini CLI), enabling the generation of structurally perfect code on the first attempt.
- **Human-AI Collaboration**: The framework realizes a novel development paradigm where the AI agent operates not merely as a localized code generator, but as an active, persistent "Architectural Contributor" capable of scaling and maintaining deeply constrained codebases.

# Note

It should be noted that the "Agent skill" development methodology and the self-evolution process introduced in this paper do not necessarily represent a state where evolution has reached full saturation. As AI technology and its surrounding ecosystems continue to advance, there remains significant untapped potential in the structures through which agents define themselves and "crystallize" their knowledge.

By further pushing the boundaries of this development framework, we anticipate that even greater evolutionary leaps will occur. Such progress will likely lead to even higher levels of development efficiency, transcending current expectations and moving toward a more sophisticated phase of software automation and human-agent synergy.

