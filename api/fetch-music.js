// api/fetch-music.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();
    
    const { accessToken } = req.body;
    
    try {
        // Get liked songs
        const likedResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const likedSongs = await likedResponse.json();
        
        // Get audio features for each track
        const trackIds = likedSongs.items.map(item => item.track.id).join(',');
        
        const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const audioFeatures = await featuresResponse.json();
        
        res.json({
            tracks: likedSongs.items,
            audioFeatures: audioFeatures.audio_features
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch music data' });
    }
}
