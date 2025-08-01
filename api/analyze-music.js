// api/analyze-music.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();
    
    const { tracks, audioFeatures } = req.body;
    
    // Prepare data for AI analysis
    const musicData = tracks.map((track, index) => ({
        name: track.track.name,
        artist: track.track.artists[0].name,
        genres: track.track.artists[0].genres || [],
        audioFeatures: audioFeatures[index]
    }));
    
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + process.env.GEMINI_API_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Analyze this music data and create a musical profile:
                        ${JSON.stringify(musicData.slice(0, 20))} // Limit to 20 songs to avoid token limits
                        
                        Provide analysis in this exact format:
                        Genre: [primary genres]
                        Artists: [top artists style]
                        Language: [detected language]  
                        Instruments: [common instruments]
                        Musical Sense: [2-3 sentences about their taste]`
                    }]
                }]
            })
        });
        
        const result = await response.json();
        const analysis = result.candidates[0].content.parts[0].text;
        
        res.json({ analysis });
        
    } catch (error) {
        res.status(500).json({ error: 'AI analysis failed' });
    }
}
