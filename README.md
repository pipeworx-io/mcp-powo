# mcp-powo

POWO (Plants of the World Online, by the Royal Botanic Gardens, Kew) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_plants` | Search POWO (Plants of the World Online, by Kew) — the authoritative global plant taxonomy database — for accepted plant names and synonyms by scientific or common name. Returns matching taxa with their family, rank, whether the name is accepted, and a POWO fqId you can pass to get_taxon. Keyless. Complements GBIF/iNaturalist with curated botanical taxonomy. |
| `get_taxon` | Fetch a full POWO (Plants of the World Online, by Kew) taxon record by its fqId (e.g. "urn:lsid:ipni.org:names:304293-2", obtained from search_plants). Returns the taxon's classification, family/genus, taxonomic status, native distribution (TDWG region codes), accepted-name resolution (for synonyms), and synonym count. Keyless authoritative botanical taxonomy. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "powo": {
      "url": "https://gateway.pipeworx.io/powo/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Powo data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
