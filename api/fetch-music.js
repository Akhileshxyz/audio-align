// api/fetch-music.js

// Helper function to fetch tracks from a playlist URL
async function fetchPlaylistTracks(url, accessToken) {
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) return []; // Silently fail for a single playlist
    const data = await response.json();
    // The track object is nested inside 'items' and then 'track'
    return data.items.map(item => item.track).filter(track => track); // Filter out any null tracks
}


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
        // --- Fetch Liked Songs (as before) ---
        const likedResponse = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!likedResponse.ok) throw new Error('Failed to fetch liked songs');
        const likedSongsData = await likedResponse.json();
        // The track object is nested inside 'item' for liked songs
        let allTracks = likedSongsData.items;

        // --- Fetch User's Playlists ---
        const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=5', { // Get first 5 playlists
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (playlistsResponse.ok) {
            const playlistsData = await playlistsResponse.json();
            // Fetch tracks for each playlist concurrently
            const playlistTrackPromises = playlistsData.items.map(playlist => 
                fetchPlaylistTracks(playlist.tracks.href, accessToken)
            );
            const playlistTracksArray = await Promise.all(playlistTrackPromises);
            
            // Flatten the array of arrays into a single array of tracks
            // And format it to match the structure of liked songs
            const formattedPlaylistTracks = playlistTracksArray.flat().map(track => ({ track }));
            allTracks = allTracks.concat(formattedPlaylistTracks);
        }

        // --- Remove Duplicates ---
        // Create a unique list of tracks based on track ID
        const uniqueTracks = Array.from(new Map(allTracks.map(item => [item.track.id, item])).values());

        if (uniqueTracks.length === 0) {
            return res.status(200).json({ tracks: [], audioFeatures: [], topArtists: [] });
        }

        const trackIds = uniqueTracks.map(item => item.track.id).join(',');
        
        // --- Fetch Audio Features and Top Artists (as before) ---
        const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!featuresResponse.ok) throw new Error('Failed to fetch audio features');
        const audioFeatures = await featuresResponse.json();
        
        const topArtistsResponse = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=medium_term', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!topArtistsResponse.ok) throw new Error('Failed to fetch top artists');
        const topArtists = await topArtistsResponse.json();

        res.status(200).json({
            tracks: uniqueTracks,
            audioFeatures: audioFeatures.audio_features,
            topArtists: topArtists.items
        });
        
    } catch (error) {
        console.error("Fetch music error:", error);
        res.status(500).json({ error: 'Failed to fetch music data from Spotify.' });
    }
}
