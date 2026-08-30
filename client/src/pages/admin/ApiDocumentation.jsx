import React, { useState, useEffect } from 'react';
import { Search, Filter, Moon, Sun, ChevronDown, ChevronRight, Copy, Download, Code, Play, Terminal, Box, FileJson, CheckCircle2, RefreshCcw } from 'lucide-react';
import api from '../../services/api';

const SnippetGenerator = {
  curl: (method, path, headers, body) => `curl -X ${method} "http://localhost:5001${path}" \\
  -H "Accept: application/json" \\
${headers.map(h => `  -H "${h.key}: ${h.type === 'string' ? 'value' : '...'}" \\`).join('\n')}
${['POST', 'PUT', 'PATCH'].includes(method) ? `  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body || {}, null, 2)}'` : ''}`,

  fetch: (method, path, headers, body) => `fetch("http://localhost:5001${path}", {
  method: "${method}",
  headers: {
    "Accept": "application/json",
${['POST', 'PUT', 'PATCH'].includes(method) ? '    "Content-Type": "application/json",' : ''}
${headers.map(h => `    "${h.key}": "value",`).join('\n')}
  },
${['POST', 'PUT', 'PATCH'].includes(method) ? `  body: JSON.stringify(${JSON.stringify(body || {}, null, 2).replace(/\n/g, '\n  ')})` : ''}
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error("Error:", error));`,

  axios: (method, path, headers, body) => `import axios from 'axios';

axios({
  method: '${method.toLowerCase()}',
  url: 'http://localhost:5001${path}',
  headers: {
${headers.map(h => `    '${h.key}': 'value',`).join('\n')}
  },
${['POST', 'PUT', 'PATCH'].includes(method) ? `  data: ${JSON.stringify(body || {}, null, 2).replace(/\n/g, '\n  ')}` : ''}
})
.then(response => {
  console.log(response.data);
})
.catch(error => {
  console.error(error);
});`,

  node: (method, path, headers, body) => `const https = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '${path}',
  method: '${method}',
  headers: {
    'Accept': 'application/json',
${['POST', 'PUT', 'PATCH'].includes(method) ? "    'Content-Type': 'application/json'," : ''}
${headers.map(h => `    '${h.key}': 'value',`).join('\n')}
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(JSON.parse(data)); });
});

req.on('error', (error) => { console.error(error); });
${['POST', 'PUT', 'PATCH'].includes(method) ? `req.write(JSON.stringify(${JSON.stringify(body || {}, null, 2)}));` : ''}
req.end();`,

  react: (method, path, headers, body) => `import React, { useState, useEffect } from 'react';

const ApiComponent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const callApi = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001${path}", {
        method: "${method}",
        headers: {
          "Accept": "application/json",
${['POST', 'PUT', 'PATCH'].includes(method) ? '          "Content-Type": "application/json",' : ''}
${headers.map(h => `          "${h.key}": "value",`).join('\n')}
        },
${['POST', 'PUT', 'PATCH'].includes(method) ? `        body: JSON.stringify(${JSON.stringify(body || {}, null, 2).replace(/\n/g, '\n        ')})` : ''}
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={callApi}>Call API</button>
      {loading ? <p>Loading...</p> : <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};
export default ApiComponent;`
};

const ApiDocumentation = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedEndpoints, setExpandedEndpoints] = useState(new Set());
  const [activeSnippet, setActiveSnippet] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/docs');
      setRoutes(res.data.routes || []);
    } catch (error) {
      console.error('Failed to fetch API documentation', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(routes.map(r => r.category))];

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || route.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleEndpoint = (id) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedEndpoints(newExpanded);
  };

  const expandAll = () => setExpandedEndpoints(new Set(filteredRoutes.map(r => `${r.method}-${r.path}`)));
  const collapseAll = () => setExpandedEndpoints(new Set());

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadYAML = () => {
    let yaml = `openapi: 3.0.0\ninfo:\n  title: Enterprise API\n  version: 1.0.0\npaths:\n`;

    // Group by path
    const paths = {};
    routes.forEach(route => {
      const pathWithBraces = route.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
      if (!paths[pathWithBraces]) paths[pathWithBraces] = {};

      paths[pathWithBraces][route.method.toLowerCase()] = {
        summary: `Endpoint for ${route.path}`,
        tags: [route.category],
        parameters: route.queryParams.map(p => ({
          name: p.replace(':', ''),
          in: 'path',
          required: true,
          schema: { type: 'string' }
        })),
        responses: {
          '200': { description: 'Successful response' },
          '400': { description: 'Bad request' },
          '500': { description: 'Server error' }
        }
      };
    });

    for (const [path, methods] of Object.entries(paths)) {
      yaml += `  ${path}:\n`;
      for (const [method, details] of Object.entries(methods)) {
        yaml += `    ${method}:\n`;
        yaml += `      summary: ${details.summary}\n`;
        yaml += `      tags:\n        - ${details.tags[0]}\n`;
        if (details.parameters.length > 0) {
          yaml += `      parameters:\n`;
          details.parameters.forEach(p => {
            yaml += `        - name: ${p.name}\n          in: ${p.in}\n          required: ${p.required}\n          schema:\n            type: ${p.schema.type}\n`;
          });
        }
        yaml += `      responses:\n`;
        for (const [code, resp] of Object.entries(details.responses)) {
          yaml += `        '${code}':\n          description: ${resp.description}\n`;
        }
      }
    }

    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'swagger.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return darkMode ? 'bg-blue-900/50 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200';
      case 'POST': return darkMode ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PUT': return darkMode ? 'bg-orange-900/50 text-orange-400 border-orange-800' : 'bg-orange-100 text-orange-700 border-orange-200';
      case 'DELETE': return darkMode ? 'bg-red-900/50 text-red-400 border-red-800' : 'bg-red-100 text-red-700 border-red-200';
      case 'PATCH': return darkMode ? 'bg-purple-900/50 text-purple-400 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200';
      default: return darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) return <div className="p-12 text-center flex justify-center text-primary"><RefreshCcw className="animate-spin w-8 h-8" /></div>;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#0d1117] text-gray-300' : 'bg-gray-50 text-gray-800'}`}>
      <div className="w-full p-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className={`text-3xl font-black flex items-center gap-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Code size={32} className="text-blue-500" />
              API Documentation
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Interactive enterprise-grade REST API reference.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={downloadYAML} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
              <Download size={16} /> Swagger YAML
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg transition-colors border ${darkMode ? 'bg-gray-800 border-gray-700 text-yellow-400' : 'bg-white border-gray-200 text-gray-600 shadow-sm'}`}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Controls Panel */}
        <div className={`p-4 rounded-xl border mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className={`pl-10 pr-8 py-2 text-sm rounded-lg border outline-none appearance-none cursor-pointer transition-colors ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={expandAll} className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Expand All</button>
            <button onClick={collapseAll} className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Collapse All</button>
          </div>
        </div>

        {/* Endpoints List */}
        <div className="space-y-4">
          {filteredRoutes.map(route => {
            const id = `${route.method}-${route.path}`;
            const isExpanded = expandedEndpoints.has(id);
            const snippetLang = activeSnippet[id] || 'cURL';

            return (
              <div key={id} className={`rounded-xl border overflow-hidden transition-all duration-300 ${darkMode ? 'border-gray-800 bg-gray-900 shadow-lg' : 'border-gray-200 bg-white shadow-sm'}`}>

                {/* Endpoint Header */}
                <div
                  onClick={() => toggleEndpoint(id)}
                  className={`p-4 cursor-pointer flex items-center justify-between transition-colors ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <ChevronRight size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={`w-20 text-center text-xs font-black px-2 py-1.5 rounded border ${getMethodColor(route.method)}`}>
                      {route.method}
                    </span>
                    <span className={`font-mono text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {route.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {route.authentication !== 'None' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 hidden md:block">
                        Protected
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                      {route.category}
                    </span>
                  </div>
                </div>

                {/* Endpoint Details */}
                {isExpanded && (
                  <div className={`border-t p-6 flex flex-col xl:flex-row gap-8 ${darkMode ? 'border-gray-800 bg-[#161b22]' : 'border-gray-100 bg-white'}`}>

                    {/* Left Column: Docs */}
                    <div className="flex-1 space-y-8">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        This endpoint allows you to access {route.category.toLowerCase()} resources at <code className={`font-mono text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{route.path}</code>.
                      </p>

                      {/* Path Params */}
                      {route.queryParams && route.queryParams.length > 0 && (
                        <div>
                          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Path Parameters</h4>
                          <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            <table className="w-full text-left text-sm">
                              <thead className={`${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                <tr><th className="px-4 py-2 font-semibold">Name</th><th className="px-4 py-2 font-semibold">Type</th><th className="px-4 py-2 font-semibold">Required</th></tr>
                              </thead>
                              <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {route.queryParams.map((p, i) => (
                                  <tr key={i}>
                                    <td className="px-4 py-3 font-mono font-bold text-blue-500">{p.replace(':', '')}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-orange-500">string</td>
                                    <td className="px-4 py-3 text-green-500 font-bold">Yes</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Headers */}
                      <div>
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Headers</h4>
                        <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                          <table className="w-full text-left text-sm">
                            <thead className={`${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                              <tr><th className="px-4 py-2 font-semibold">Key</th><th className="px-4 py-2 font-semibold">Value / Type</th><th className="px-4 py-2 font-semibold">Required</th></tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                              {route.headers.map((h, i) => (
                                <tr key={i}>
                                  <td className="px-4 py-3 font-mono font-bold">{h.key}</td>
                                  <td className="px-4 py-3 font-mono text-xs text-orange-500">{h.key === 'Authorization' ? 'Bearer <token>' : h.type}</td>
                                  <td className={`px-4 py-3 font-bold ${h.required ? 'text-green-500' : 'text-gray-400'}`}>{h.required ? 'Yes' : 'No'}</td>
                                </tr>
                              ))}
                              {['POST', 'PUT', 'PATCH'].includes(route.method) && (
                                <tr>
                                  <td className="px-4 py-3 font-mono font-bold">Content-Type</td>
                                  <td className="px-4 py-3 font-mono text-xs text-orange-500">application/json</td>
                                  <td className="px-4 py-3 font-bold text-green-500">Yes</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Responses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-green-500">Success Response (200 OK)</h4>
                          <div className="relative group">
                            <pre className={`p-4 rounded-lg text-xs font-mono overflow-x-auto ${darkMode ? 'bg-gray-900 text-green-400 border border-gray-800' : 'bg-green-50 text-green-800 border border-green-100'}`}>
                              {JSON.stringify(route.successResponse, null, 2)}
                            </pre>
                            <button onClick={() => handleCopy(JSON.stringify(route.successResponse, null, 2), `${id}-res-ok`)} className={`absolute top-2 right-2 p-1.5 rounded transition-opacity opacity-0 group-hover:opacity-100 ${darkMode ? 'bg-gray-800 text-gray-300 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-800 shadow-sm'}`}>
                              {copiedId === `${id}-res-ok` ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-red-500">Error Response (400/500)</h4>
                          <div className="relative group">
                            <pre className={`p-4 rounded-lg text-xs font-mono overflow-x-auto ${darkMode ? 'bg-gray-900 text-red-400 border border-gray-800' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                              {JSON.stringify(route.errorResponse, null, 2)}
                            </pre>
                            <button onClick={() => handleCopy(JSON.stringify(route.errorResponse, null, 2), `${id}-res-err`)} className={`absolute top-2 right-2 p-1.5 rounded transition-opacity opacity-0 group-hover:opacity-100 ${darkMode ? 'bg-gray-800 text-gray-300 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-800 shadow-sm'}`}>
                              {copiedId === `${id}-res-err` ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Code Snippets */}
                    <div className="xl:w-[450px] flex flex-col">
                      <div className={`flex rounded-t-lg overflow-hidden border-b-0 border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-800 border-gray-800'}`}>
                        {['cURL', 'fetch', 'axios', 'Node', 'React'].map(lang => (
                          <button
                            key={lang}
                            onClick={() => setActiveSnippet({ ...activeSnippet, [id]: lang })}
                            className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${snippetLang === lang ? 'bg-[#0d1117] text-white border-t-2 border-blue-500' : 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-t-2 border-transparent'}`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>

                      <div className="relative flex-1 group">
                        <pre className={`h-full p-4 text-xs font-mono overflow-auto rounded-b-lg border border-t-0 ${darkMode ? 'bg-[#0d1117] text-gray-300 border-gray-800' : 'bg-[#0d1117] text-gray-300 border-gray-800'}`}>
                          <code>
                            {(SnippetGenerator[snippetLang.toLowerCase()] || SnippetGenerator.curl)(route.method, route.path, route.headers, route.requestBody?.example)}
                          </code>
                        </pre>

                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 rounded text-xs font-bold transition-colors"
                            onClick={() => alert('API Playground coming soon!')}
                          >
                            <Play size={12} /> Try
                          </button>
                          <button
                            onClick={() => handleCopy((SnippetGenerator[snippetLang.toLowerCase()] || SnippetGenerator.curl)(route.method, route.path, route.headers, route.requestBody?.example), `${id}-snippet`)}
                            className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded transition-colors"
                            title="Copy code"
                          >
                            {copiedId === `${id}-snippet` ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredRoutes.length === 0 && (
          <div className="py-20 text-center">
            <Terminal size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-800' : 'text-gray-200'}`} />
            <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No endpoints found</h3>
            <p className="text-gray-500 mt-1 text-sm">Try adjusting your search or category filter.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ApiDocumentation;
