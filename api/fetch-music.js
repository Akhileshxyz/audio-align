// api/fetch-music.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();
    
    const { accessToken } = req.body;
    
    try {
        // CORRECTED: Fetch liked songs
        const likedResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const likedSongs = await likedResponse.json();
        
        const trackIds = likedSongs.items.map(item => item.track.id).join(',');
        
        // CORRECTED: Fetch audio features for each track
        const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const audioFeatures = await featuresResponse.json();
        
        // Also fetch top artists to improve recommendations
        const topArtistsResponse = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const topArtists = await topArtistsResponse.json();

        res.json({
            tracks: likedSongs.items,
            audioFeatures: audioFeatures.audio_features,
            topArtists: topArtists.items
        });
        
    } catch (error) {
        console.error("Fetch music error:", error)
        res.status(500).json({ error: 'Failed to fetch music data' });
    }
}
