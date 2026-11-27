# Code mode for MCP (TypeScript layout from the Anthropic article)

```
servers
├── google-drive
│   ├── getDocument.ts
│   └── index.ts
├── salesforce
│   ├── updateRecord.ts
│   └── index.ts
```

```ts
// ./servers/google-drive/getDocument.ts
import { callMCPTool } from "../../../client.js";
interface GetDocumentInput { documentId: string; }
interface GetDocumentResponse { content: string; }
/* Read a document from Google Drive */
export async function getDocument(input: GetDocumentInput): Promise<GetDocumentResponse> {
  return callMCPTool<GetDocumentResponse>('google_drive__get_document', input);
}
```

```ts
// The transcript goes Drive -> Salesforce without passing through the model
import * as gdrive from './servers/google-drive';
import * as salesforce from './servers/salesforce';
const transcript = (await gdrive.getDocument({ documentId: 'abc123' })).content;
await salesforce.updateRecord({ objectType: 'SalesMeeting', recordId: '00Q5f000001abcXYZ', data: { Notes: transcript } });
```

```ts
// Filter in the execution environment
const allRows = await gdrive.getSheet({ sheetId: 'abc123' });
const pendingOrders = allRows.filter(row => row["Status"] === 'pending');
console.log(`Found ${pendingOrders.length} pending orders`);
console.log(pendingOrders.slice(0, 5));
```

```ts
// Control flow in code instead of repeated tool calls
let found = false;
while (!found) {
  const messages = await slack.getChannelHistory({ channel: 'C123456' });
  found = messages.some(m => m.text.includes('deployment complete'));
  if (!found) await new Promise(r => setTimeout(r, 5000));
}
```

```ts
// State persistence and saved skills
const leads = await salesforce.query({ query: 'SELECT Id, Email FROM Lead LIMIT 1000' });
await fs.writeFile('./workspace/leads.csv', leads.map(l => `${l.Id},${l.Email}`).join('\n'));

// ./skills/save-sheet-as-csv.ts
export async function saveSheetAsCsv(sheetId: string) {
  const data = await gdrive.getSheet({ sheetId });
  await fs.writeFile(`./workspace/sheet-${sheetId}.csv`, data.map(row => row.join(',')).join('\n'));
  return `./workspace/sheet-${sheetId}.csv`;
}
```

Also give the server a `search_tools(query, detail: "name" | "description" | "full")` tool so agents fetch only what
they need. Run generated code in a sandbox with resource limits and monitoring.
