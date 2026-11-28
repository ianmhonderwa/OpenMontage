---
name: token-efficient-tools
description: Cut token use when working with MCP servers, connectors, web pages, spreadsheets or any large tool output. Use at the start of any multi-tool, research, data or file-processing task, and whenever a tool result could be large (documents, tables, logs, search results, API listings). Applies Anthropic's "Code execution with MCP" guidance - progressive disclosure, filtering in code, state in files, saved scripts as skills.
---

# Token-efficient tool use

Source: Anthropic, "Code execution with MCP for efficient agents" (Adam Jones and Conor Kelly, 4 Nov 2025),
https://www.anthropic.com/research/code-execution-with-mcp. The article reports one workflow dropping from about
150,000 to about 2,000 tokens (98.7 %) by loading only the tool definitions needed and filtering data in code.

Two costs to avoid:
1. **Tool definitions** loaded into context up front.
2. **Intermediate results** passed through the model (a document read once and then written out again costs twice).

## Rules (apply in every chat)

1. **Load tools on demand (progressive disclosure).** Do not load every connector's schema. Search for the one tool you
   need (e.g. ToolSearch `select:<name>`, or a server's `search_tools` / library-search with the lowest detail level),
   read its definition, then call it. Prefer "name only" or "compact" detail first; ask for full schemas only for the
   tool you will call.
2. **Never pull a large result into the conversation to filter it by eye.** Fetch it into the execution environment
   (a file in the scratchpad), then filter, aggregate or join it with code (`python`, `jq`, `grep`, `head`, `awk`) and
   print only the answer: counts, the first 5 rows, the fields you need.
3. **Do not copy data between tools through the model.** If B needs A's output, pass a file path or let a script read
   A's output and write B's input. Do not retype long text.
4. **Put loops, polling and conditions in code.** One script that loops, retries or waits beats many tool calls with
   the model deciding each step.
5. **Keep sensitive data out of context.** Process personal data (names, phone numbers, emails, ID numbers) inside
   scripts; log counts or masked tokens such as `[EMAIL_1]`, never the values.
6. **Save state to files.** Write intermediate results to a workspace folder so work can resume after a context reset
   without re-fetching.
7. **Save working code as a skill.** When a script works, keep it in `scripts/` next to a short SKILL.md so later chats
   reuse it instead of re-deriving it.
8. **Delegate bulky reading.** If a large page or many files must be read but only a conclusion is needed, give the
   reading to a subagent or a summarising fetch and keep only its answer.
9. **Read only what you need.** Read file ranges and targeted search hits, not whole files; ask scrapers for main
   content only or for a targeted query answer.

## Quick patterns

Filter a big table instead of reading it:
```bash
python3 scripts/peek_table.py data.xlsx --where "Status=pending" --cols Id,Status,Amount --limit 5
```
Trim any long tool output before it is shown:
```bash
some_command > /tmp/out.json; jq '.items | length' /tmp/out.json; jq '.items[:5] | map({id, name})' /tmp/out.json
```
Mask personal data before printing:
```bash
python3 scripts/mask_pii.py contacts.csv > contacts.masked.csv && head -5 contacts.masked.csv
```

## Building your own agent ("code mode")

When you build an agent (Claude Agent SDK or similar), present each MCP server as a folder of small code files so the
model lists folders and reads only the tools it needs. See `templates/` for the article's TypeScript layout and a
Python equivalent. Code execution needs a sandbox with resource limits and monitoring; weigh that against the savings.

## Checklist before each large step

- Do I need this tool's full schema now, or just its name?
- Will this result be bigger than a screen? Then write it to a file and summarise in code.
- Am I about to paste one tool's output into another? Pass a path instead.
- Does the output contain personal data? Mask it.
- Is there a saved script for this already?
