// public/app.js

class AudioAlign {
    constructor() {
        // Use a relative path for API calls. This works for both local dev and Vercel deployment.
        this.API_BASE = '/api';
        // This public client ID is safe to expose.
        this.SPOTIFY_CLIENT_ID = 'fd0e05deea6a41a793a62417b19d9312';
        // The redirect URI should be the exact URL of your deployed frontend.
        this.REDIRECT_URI = window.location.origin + window.location.pathname;
        this.init();
    }

    init() {
        this.loginButton = document.getElementById('spotify-login');
        this.startOverButton = document.getElementById('start-over-btn');
        
        this.loginButton.addEventListener('click', this.login.bind(this));
        this.startOverButton.addEventListener('click', this.resetApp.bind(this));

        this.checkForCallback();
        this.loadStoredProfile();
    }

    login() {
        const SCOPES = 'user-library-read playlist-read-private user-top-read';
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
            // Clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            await this.processSpotifyCallback(code);
        }
    }

    async processSpotifyCallback(code) {
        try {
            this.showLoading('Connecting to Spotify...');
            const tokenResponse = await this.apiCall('/spotify-auth', { code });
            const { access_token } = await tokenResponse.json();

            this.showLoading('Fetching your music data...');
            const musicResponse = await this.apiCall('/fetch-music', { accessToken: access_token });
            const musicData = await musicResponse.json();
            
            if (!musicData.tracks || musicData.tracks.length === 0) {
                this.showError("We couldn't find any liked songs in your Spotify library. Please like some songs and try again!");
                return;
            }

            this.showLoading('Analyzing your musical taste with AI...');
            const analysisResponse = await this.apiCall('/analyze-music', musicData);
            const { analysis } = await analysisResponse.json();

            this.showLoading('Getting personalized recommendations...');
            const recsResponse = await this.apiCall('/get-recommendations', {
                accessToken: access_token,
                topArtists: musicData.topArtists,
                audioFeatures: musicData.audioFeatures
            });
            const recommendationsData = recsResponse.ok ? await recsResponse.json() : null;

            const profile = {
                analysis,
                recommendations: recommendationsData?.recommendations || [],
                timestamp: Date.now()
            };

            localStorage.setItem('audioAlignProfile', JSON.stringify(profile));
            this.displayResults(profile);

        } catch (error) {
            console.error('Processing failed:', error);
            this.showError(`An error occurred during analysis: ${error.message}. Please try again.`);
        }
    }
    
    async apiCall(endpoint, body) {
        const response = await fetch(`${this.API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API call failed');
        }
        return response;
    }

    loadStoredProfile() {
        const stored = localStorage.getItem('audioAlignProfile');
        if (stored) {
            const profile = JSON.parse(stored);
            // Cache for 24 hours
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
        document.getElementById('error-section').style.display = 'none';
        document.getElementById('start-over-btn').style.display = 'none';
        document.getElementById('loading-message').textContent = message;
    }

    displayResults(profile) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('analysis-section').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('results').style.display = 'block';
        document.getElementById('start-over-btn').style.display = 'inline-flex';

        document.getElementById('profile-results').innerHTML = `
            <h2>🎵 Your Musical DNA</h2>
            <div class="analysis-content">${profile.analysis.replace(/\n/g, '<br>')}</div>
        `;

        if (profile.recommendations && profile.recommendations.length > 0) {
            const recsHtml = profile.recommendations.map(track => `
                <div class="recommendation-item">
                    <img src="${track.album.images[2]?.url || 'https://placehold.co/64x64/191414/ffffff?text=?'}" alt="${track.album.name}">
                    <div class="track-info">
                        <strong>${track.name}</strong>
                        <span>${track.artists[0].name}</span>
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
        document.getElementById('start-over-btn').style.display = 'inline-flex';
    }
    
    resetApp() {
        localStorage.removeItem('audioAlignProfile');
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('analysis-section').style.display = 'none';
        document.getElementById('error-section').style.display = 'none';
    }
}

// Initialize the app once the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    new AudioAlign();
});
