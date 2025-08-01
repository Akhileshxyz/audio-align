// functions/recommendations.js
exports.getRecommendations = functions.https.onCall(async (data, context) => {
    const { accessToken, topGenres, topArtists, audioFeatures } = data;
    
    // Calculate average audio features
    const avgFeatures = {
        energy: audioFeatures.reduce((sum, track) => sum + track.energy, 0) / audioFeatures.length,
        danceability: audioFeatures.reduce((sum, track) => sum + track.danceability, 0) / audioFeatures.length,
        valence: audioFeatures.reduce((sum, track) => sum + track.valence, 0) / audioFeatures.length
    };
    
    // Get recommendations from Spotify
    const recommendations = await axios.get('https://api.spotify.com/v1/recommendations', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
            seed_genres: topGenres.slice(0, 2).join(','),
            seed_artists: topArtists.slice(0, 2).join(','),
            target_energy: avgFeatures.energy,
            target_danceability: avgFeatures.danceability,
            target_valence: avgFeatures.valence,
            limit: 20
        }
    });
    
    return { recommendations: recommendations.data.tracks };
});
