import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { username, password } = req.body;

  // These should be set as Environment Variables in your Vercel project settings.
  const appUser = process.env.APP_USER;
  const appPassword = process.env.APP_PASSWORD;

  if (!appUser || !appPassword) {
    console.error("Authentication environment variables (APP_USER, APP_PASSWORD) are not set.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  if (username && password && username.toLowerCase() === appUser.toLowerCase() && password === appPassword) {
    // Authentication successful
    // In a real-world scenario, you might generate a session token here.
    // For this app, we'll just confirm success and send back a user object.
    const user = {
      id: 'user-1',
      username: username,
    };
    return res.status(200).json(user);
  } else {
    // Authentication failed
    return res.status(401).json({ error: 'Invalid username or password' });
  }
}
