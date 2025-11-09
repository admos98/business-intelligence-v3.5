// /api/data.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FILENAME = 'mehrnoosh_cafe_db.json';

// This function will be deployed as a Vercel Serverless Function.
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!GIST_ID || !GITHUB_TOKEN) {
    return res.status(500).json({ error: "Server configuration error: Gist credentials not set." });
  }

  const GIST_API_URL = `https://api.github.com/gists/${GIST_ID}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    if (req.method === 'GET') {
      const gistResponse = await fetch(GIST_API_URL, { method: 'GET', headers });

      if (!gistResponse.ok) {
        throw new Error(`GitHub API error: ${gistResponse.status} ${gistResponse.statusText}`);
      }

      const gistData = await gistResponse.json();
      const file = gistData.files[FILENAME];

      if (!file) {
        // This is not an error; it just means no data has been saved yet.
        return res.status(204).send('No content');
      }

      // Return the file content directly
      return res.status(200).json({ content: file.content });

    } else if (req.method === 'POST') {
      const { content } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ error: "Request body must contain 'content' as a string." });
      }

      const patchResponse = await fetch(GIST_API_URL, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: {
            [FILENAME]: {
              content: content,
            },
          },
        }),
      });

      if (!patchResponse.ok) {
        const errorBody = await patchResponse.text();
        throw new Error(`GitHub API error on PATCH: ${patchResponse.status} ${patchResponse.statusText} - ${errorBody}`);
      }

      return res.status(200).json({ success: true, message: "Data saved successfully." });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error("Error in Gist data handler:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({ error: errorMessage });
  }
}
