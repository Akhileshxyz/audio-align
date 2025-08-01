// api/fetch-music.js
export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access Token is missing' });

    try {
        // Fetch liked songs
        const likedResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!likedResponse.ok) throw new Error('Failed to fetch liked songs');
        const likedSongs = await likedResponse.json();

        if (!likedSongs.items || likedSongs.items.length === 0) {
            return res.status(200).json({ tracks: [], audioFeatures: [], topArtists: [] });
        }
        
        const trackIds = likedSongs.items.map(item => item.track.id).join(',');
        
        // Fetch audio features for the tracks
        const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!featuresResponse.ok) throw new Error('Failed to fetch audio features');
        const audioFeatures = await featuresResponse.json();
        
        // Fetch user's top artists
        const topArtistsResponse = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=medium_term', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!topArtistsResponse.ok) throw new Error('Failed to fetch top artists');
        const topArtists = await topArtistsResponse.json();

        res.status(200).json({
            tracks: likedSongs.items,
            audioFeatures: audioFeatures.audio_features,
            topArtists: topArtists.items
        });
        
    } catch (error) {
        console.error("Fetch music error:", error);
        res.status(500).json({ error: 'Failed to fetch music data from Spotify.' });
    }
}
