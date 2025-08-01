// api/analyze-music.js
export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const { tracks, audioFeatures } = req.body;
    const { GEMINI_API_KEY } = process.env;

    const musicData = tracks.map((track, index) => ({
        name: track.track.name,
        artist: track.track.artists[0].name,
        // Genres are often not available on track objects, so this might be empty
        genres: track.track.artists[0].genres || [], 
        audioFeatures: audioFeatures[index] ? {
            danceability: audioFeatures[index].danceability,
            energy: audioFeatures[index].energy,
            valence: audioFeatures[index].valence,
            tempo: audioFeatures[index].tempo
        } : {}
    }));
    
    try {
        const prompt = `
            Analyze the following list of songs and their audio features from a user's Spotify library.
            Based on this data, create a concise and friendly musical profile for the user.
            
            Music Data (up to 20 songs):
            ${JSON.stringify(musicData.slice(0, 20), null, 2)}
            
            Please provide the analysis in the following format, as if you are speaking directly to the user:
            
            **Primary Genres:** Identify the top 2-3 genres that dominate their listening.
            **Vibe Check:** Describe the overall mood and energy of their music in 1-2 sentences (e.g., "You lean towards upbeat, high-energy tracks perfect for a workout," or "Your taste is more mellow and introspective, great for relaxing.").
            **Artist Style:** Briefly describe the type of artists they prefer (e.g., "You're a fan of modern indie pop artists and classic rock bands.").
            **Musical Signature:** In 2-3 sentences, provide a summary of their unique musical taste, highlighting what makes it distinct.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API Error: ${error.error.message}`);
        }

        const result = await response.json();
        const analysis = result.candidates[0].content.parts[0].text;
        
        res.status(200).json({ analysis });
        
    } catch (error) {
        console.error('AI analysis failed:', error);
        res.status(500).json({ error: 'AI analysis failed. Please try again later.' });
    }
}
