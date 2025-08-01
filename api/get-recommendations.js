// api/get-recommendations.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { accessToken, topArtists, audioFeatures } = req.body;

    if (!accessToken || !topArtists || !audioFeatures) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const seed_artists = topArtists.slice(0, 2).map(artist => artist.id).join(',');
        const seed_tracks = audioFeatures.slice(0, 3).map(feature => feature.id).join(',');
        
        const recommendationsResponse = await fetch(`https://api.spotify.com/v1/recommendations?limit=20&seed_artists=${seed_artists}&seed_tracks=${seed_tracks}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!recommendationsResponse.ok) {
            const errorData = await recommendationsResponse.json();
            throw new Error(errorData.error.message || 'Failed to fetch recommendations');
        }

        const recommendations = await recommendationsResponse.json();
        res.json({ recommendations: recommendations.tracks });

    } catch (error) {
        console.error('Recommendation fetch error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
