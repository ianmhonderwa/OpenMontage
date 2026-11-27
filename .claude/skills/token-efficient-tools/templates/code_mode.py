"""Python equivalent: generate one small module per MCP tool so an agent can list and read only what it needs.
Uses the official `mcp` Python SDK (pip install mcp). Run once per server: python code_mode.py <server command...>"""
import asyncio, json, keyword, re, sys
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

def ident(name):
    s = re.sub(r"\W", "_", name)
    return s + "_" if keyword.iskeyword(s) else s

async def main(cmd, args, out="servers"):
    async with stdio_client(StdioServerParameters(command=cmd, args=args)) as (r, w):
        async with ClientSession(r, w) as s:
            init = await s.initialize()
            name = ident(init.serverInfo.name)
            d = Path(out) / name; d.mkdir(parents=True, exist_ok=True)
            index = []
            for t in (await s.list_tools()).tools:
                fn = ident(t.name); index.append(f"{fn}: {(t.description or '').splitlines()[0][:100] if t.description else ''}")
                (d / f"{fn}.py").write_text(
                    f'"""{t.description or ""}\n\nInput schema:\n{json.dumps(t.inputSchema, indent=1)}"""\n'
                    f"from client import call_mcp_tool\n\nasync def {fn}(**kw):\n"
                    f"    return await call_mcp_tool({name!r}, {t.name!r}, kw)\n")
            (d / "INDEX.txt").write_text("\n".join(index))  # one line per tool: cheap to read first

if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2:]))
