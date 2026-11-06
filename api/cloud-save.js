export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { locationId, filename, data, title, author } = req.body || {};

    if (!locationId || !filename || !data) {
      return res.status(400).json({ error: 'Brak wymaganych parametrów: locationId, filename, data' });
    }

    const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
    const repoOwner = process.env.GITHUB_OWNER || 'dsytamc';
    const repoName = process.env.GITHUB_REPO || 'harmonogramcube';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return res.status(200).json({
        success: true,
        savedLocally: true,
        message: 'Zapisano pomyślnie w pamięci podręcznej (GITHUB_TOKEN nie jest skonfigurowany na serwerze)'
      });
    }

    const filePath = `chmura_zapisy/${locationId}/${cleanFilename}`;
    const fileContentStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const contentBase64 = Buffer.from(fileContentStr, 'utf8').toString('base64');

    // 1. Sprawdź czy plik istnieje w GitHub, aby pobrać SHA
    let existingSha = null;
    try {
      const getFileRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HarmonogramCube-CloudSave'
        }
      });
      if (getFileRes.ok) {
        const fileInfo = await getFileRes.json();
        existingSha = fileInfo.sha;
      }
    } catch (e) {
      console.warn('Błąd sprawdzania SHA pliku:', e.message);
    }

    // 2. Commit pliku do GitHub
    const commitPayload = {
      message: `Zapis grafiku chmury: ${title || cleanFilename} [${locationId}]`,
      content: contentBase64,
      branch: branch
    };
    if (existingSha) {
      commitPayload.sha = existingSha;
    }

    const commitRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'HarmonogramCube-CloudSave'
      },
      body: JSON.stringify(commitPayload)
    });

    if (!commitRes.ok) {
      const errText = await commitRes.text();
      throw new Error(`GitHub API commit error: ${commitRes.status} ${errText}`);
    }

    const commitData = await commitRes.json();

    // 3. Zaktualizuj chmura_zapisy/index.json w GitHub
    try {
      const indexPath = 'chmura_zapisy/index.json';
      let indexSha = null;
      let currentIndexData = null;

      const getIndexRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${indexPath}?ref=${branch}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HarmonogramCube-CloudSave'
        }
      });

      if (getIndexRes.ok) {
        const indexFileInfo = await getIndexRes.json();
        indexSha = indexFileInfo.sha;
        const decodedIndex = Buffer.from(indexFileInfo.content, 'base64').toString('utf8');
        currentIndexData = JSON.parse(decodedIndex);
      }

      if (currentIndexData && Array.isArray(currentIndexData.locations)) {
        const loc = currentIndexData.locations.find(l => l.id === locationId);
        if (loc) {
          if (!Array.isArray(loc.saves)) loc.saves = [];
          const existingSaveIndex = loc.saves.findIndex(s => s.filename === cleanFilename);
          const saveEntry = {
            id: cleanFilename.replace(/\.json$/, ''),
            filename: cleanFilename,
            name: title || cleanFilename,
            updatedAt: new Date().toISOString(),
            size: Buffer.byteLength(fileContentStr, 'utf8')
          };

          if (existingSaveIndex >= 0) {
            loc.saves[existingSaveIndex] = saveEntry;
          } else {
            loc.saves.push(saveEntry);
          }

          currentIndexData.updatedAt = new Date().toISOString();

          const updatedIndexBase64 = Buffer.from(JSON.stringify(currentIndexData, null, 2), 'utf8').toString('base64');
          await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${indexPath}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'HarmonogramCube-CloudSave'
            },
            body: JSON.stringify({
              message: `Aktualizacja indeksu chmury: ${title || cleanFilename}`,
              content: updatedIndexBase64,
              sha: indexSha,
              branch: branch
            })
          });
        }
      }
    } catch (indexErr) {
      console.warn('Ostrzeżenie: Nie udało się zaktualizować indeksu GitHub:', indexErr.message);
    }

    return res.status(200).json({
      success: true,
      githubSynced: true,
      commit: commitData.commit?.html_url || null,
      message: 'Zapisano pomyślnie w chmurze GitHub'
    });

  } catch (error) {
    console.error('Błąd zapisu w chmurze:', error);
    return res.status(500).json({ error: error.message || 'Błąd wewnętrzny serwera' });
  }
}
