interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * POWO (Plants of the World Online, by the Royal Botanic Gardens, Kew) MCP.
 *
 * The authoritative global plant taxonomy & distribution database. Keyless.
 */


const BASE = 'https://powo.science.kew.org/api/2';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_plants',
    description:
      'Search POWO (Plants of the World Online, by Kew) — the authoritative global plant taxonomy database — for accepted plant names and synonyms by scientific or common name. Returns matching taxa with their family, rank, whether the name is accepted, and a POWO fqId you can pass to get_taxon. Keyless. Complements GBIF/iNaturalist with curated botanical taxonomy.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Scientific or common plant name, e.g. "Quercus robur" or "English oak".' },
        limit: { type: 'number', description: 'Max results to return (default 15).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_taxon',
    description:
      'Fetch a full POWO (Plants of the World Online, by Kew) taxon record by its fqId (e.g. "urn:lsid:ipni.org:names:304293-2", obtained from search_plants). Returns the taxon\'s classification, family/genus, taxonomic status, native distribution (TDWG region codes), accepted-name resolution (for synonyms), and synonym count. Keyless authoritative botanical taxonomy.',
    inputSchema: {
      type: 'object',
      properties: {
        fq_id: {
          type: 'string',
          description: 'A POWO fqId like "urn:lsid:ipni.org:names:304293-2" (from search_plants results).',
        },
      },
      required: ['fq_id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_plants':
        return await searchPlants(args);
      case 'get_taxon':
        return await getTaxon(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function searchPlants(args: Record<string, unknown>): Promise<unknown> {
  const query = reqStr(args, 'query');
  const limit = typeof args.limit === 'number' && args.limit > 0 ? Math.floor(args.limit) : 15;

  const url = `${BASE}/search?q=${encodeURIComponent(query)}&perPage=${encodeURIComponent(String(limit))}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) return { error: `POWO: ${res.status} ${(await res.text()).slice(0, 200)}` };

  const data = (await res.json()) as {
    totalResults?: number;
    results?: Array<Record<string, unknown>>;
  };
  const raw = Array.isArray(data.results) ? data.results : [];
  const results = raw.map((r) => {
    const out: Record<string, unknown> = {
      name: r.name,
      author: r.author,
      rank: r.rank,
      accepted: r.accepted,
      fqId: r.fqId,
    };
    if (r.family != null) out.family = r.family;
    if (r.url != null) out.url = r.url;
    return out;
  });

  return { total: data.totalResults ?? raw.length, count: results.length, results };
}

async function getTaxon(args: Record<string, unknown>): Promise<unknown> {
  const fqId = reqStr(args, 'fq_id');
  const url = `${BASE}/taxon/${encodeURIComponent(fqId)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });

  if (res.status === 404) return { error: 'taxon not found', fq_id: fqId };
  if (!res.ok) return { error: `POWO: ${res.status} ${(await res.text()).slice(0, 200)}` };

  const t = (await res.json()) as Record<string, unknown>;
  // POWO returns {"error": "Not Found"} bodies in some not-found cases too.
  if (t && typeof t === 'object' && typeof (t as { error?: unknown }).error === 'string' && t.name == null) {
    return { error: 'taxon not found', fq_id: fqId };
  }

  const out: Record<string, unknown> = {
    fq_id: fqId,
    name: t.name,
    authors: t.authors,
    rank: t.rank,
    status: t.taxonomicStatus,
  };

  const accepted = t.accepted as { name?: unknown } | undefined;
  if (accepted && typeof accepted === 'object' && accepted.name != null) {
    out.accepted_name = accepted.name;
  }

  if (t.family != null) out.family = t.family;
  if (t.genus != null) out.genus = t.genus;

  const classification = t.classification;
  if (Array.isArray(classification)) {
    out.classification = classification.map((c) => {
      const cc = c as Record<string, unknown>;
      return { name: cc.name, rank: cc.rank };
    });
  }

  // POWO exposes native distribution as a flat list of TDWG region codes under `locations`
  // (present on accepted taxa; absent/null on synonyms). There is no `distribution.natives` object.
  if (Array.isArray(t.locations)) {
    out.distribution_native = t.locations;
  }

  if (Array.isArray(t.synonyms)) out.synonyms_count = t.synonyms.length;

  return out;
}

function reqStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing or empty.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
