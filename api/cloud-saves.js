export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const repoOwner = process.env.GITHUB_OWNER || 'dsytamc';
    const repoName = process.env.GITHUB_REPO || 'harmonogramcube';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;

    const { locationId, file } = req.query || {};

    if (locationId && file) {
      // Pobieranie pojedynczego pliku z GitHub
      const filePath = `chmura_zapisy/${locationId}/${file}`;
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'HarmonogramCube-CloudSave'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const fileRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`, {
        headers
      });

      if (!fileRes.ok) {
        return res.status(fileRes.status).json({ error: 'Plik nie został znaleziony' });
      }

      const fileInfo = await fileRes.json();
      const content = Buffer.from(fileInfo.content, 'base64').toString('utf8');
      return res.status(200).json(JSON.parse(content));
    }

    // Pobieranie indeksu
    const indexPath = 'chmura_zapisy/index.json';
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'HarmonogramCube-CloudSave'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const indexRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${indexPath}?ref=${branch}`, {
      headers
    });

    if (indexRes.ok) {
      const indexInfo = await indexRes.json();
      const content = Buffer.from(indexInfo.content, 'base64').toString('utf8');
      return res.status(200).json(JSON.parse(content));
    }

    // Fallback: pobierz z raw github
    const rawRes = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/chmura_zapisy/index.json`);
    if (rawRes.ok) {
      const json = await rawRes.json();
      return res.status(200).json(json);
    }

    return res.status(404).json({ error: 'Indeks chmury niedostępny' });
  } catch (err) {
    console.error('Błąd pobierania danych chmury:', err);
    return res.status(500).json({ error: err.message });
  }
}
