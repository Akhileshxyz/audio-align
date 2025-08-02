// public/app.js

class AudioAlign {
    constructor() {
        this.API_BASE = '/api';
        this.SPOTIFY_CLIENT_ID = 'fd0e05deea6a41a793a62417b19d9312';
        // Make sure to replace 'YOUR_USERNAME' with your actual GitHub username
        this.REDIRECT_URI = 'https://akhileshxyz.github.io/audio-align/';
        this.init();
    }

    init() {
        document.getElementById('spotify-login').addEventListener('click', this.login.bind(this));
        this.checkForCallback();
        this.loadStoredProfile();
    }

    login() {
        // *** THIS IS THE UPDATED LINE ***
        // We've added 'playlist-read-private' to get access to the user's playlists.
        const SCOPES = 'user-library-read user-top-read playlist-read-private';

        const authUrl = `https://accounts.spotify.com/authorize?` +
            `client_id=${this.SPOTIFY_CLIENT_ID}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&` +
            `scope=${encodeURIComponent(SCOPES)}`;

        window.location.href = authUrl;
    }

    async checkForCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            window.history.replaceState({}, document.title, window.location.pathname);
            await this.processSpotifyCallback(code);
        }
    }

    async processSpotifyCallback(code) {
        try {
            this.showLoading('Connecting to Spotify...');

            const tokenResponse = await fetch(`${this.API_BASE}/spotify-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (!tokenResponse.ok) throw new Error('Token exchange failed');
            const { access_token } = await tokenResponse.json();

            this.showLoading('Fetching your music library...');

            const musicResponse = await fetch(`${this.API_BASE}/fetch-music`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: access_token })
            });

            if (!musicResponse.ok) throw new Error('Failed to fetch music data');
            const musicData = await musicResponse.json();

            this.showLoading('Analyzing your musical taste...');

            const analysisResponse = await fetch(`${this.API_BASE}/analyze-music`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(musicData)
            });

            if (!analysisResponse.ok) throw new Error('Analysis failed');
            const { analysis } = await analysisResponse.json();

            this.showLoading('Getting personalized recommendations...');

            const recsResponse = await fetch(`${this.API_BASE}/get-recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessToken: access_token,
                    topArtists: musicData.topArtists,
                    audioFeatures: musicData.audioFeatures
                })
            });

            const recommendations = recsResponse.ok ? await recsResponse.json() : null;

            const profile = {
                analysis,
                recommendations: recommendations?.recommendations || [],
                timestamp: Date.now()
            };

            localStorage.setItem('audioAlignProfile', JSON.stringify(profile));
            this.displayResults(profile);

        } catch (error) {
            console.error('Process failed:', error);
            this.showError(`Analysis failed: ${error.message}`);
        }
    }

    loadStoredProfile() {
        const stored = localStorage.getItem('audioAlignProfile');
        if (stored) {
            const profile = JSON.parse(stored);
            if (Date.now() - profile.timestamp < 24 * 60 * 60 * 1000) {
                this.displayResults(profile);
            }
        }
    }

    showLoading(message) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('analysis-section').style.display = 'block';
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        document.querySelector('#loading p').textContent = message;
    }

    displayResults(profile) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('analysis-section').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').style.display = 'block';

        document.getElementById('profile-results').innerHTML = `
            <div class="profile-card">
                <h2>🎵 Your Musical DNA</h2>
                <div class="analysis-content">
                    ${profile.analysis.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;

        if (profile.recommendations && profile.recommendations.length > 0) {
            const recsHtml = profile.recommendations.map(track => `
                <div class="recommendation-item">
                    <div>
                        <strong>${track.name}</strong><br>
                        <span style="opacity: 0.8;">${track.artists[0].name}</span>
                    </div>
                </div>
            `).join('');

            document.getElementById('recommendations-list').innerHTML = recsHtml;
            document.getElementById('recommendations-section').style.display = 'block';
        } else {
            document.getElementById('recommendations-section').style.display = 'none';
        }
    }

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        const errorSection = document.getElementById('error-section');
        errorSection.style.display = 'block';
        errorSection.textContent = message;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new AudioAlign();
});
