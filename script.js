const userId = "688983124868202496";
const card = document.getElementById('status-card');

const LANYARD_API = `https://api.lanyard.rest/v1/users/${userId}`;

const fetchStatus = async() => {
    try {
        const response = await fetch(LANYARD_API);
        if (!response.ok) {
            throw new Error(`Lanyard API returned ${response.status}`);
        }
        const { data } = await response.json();

        if (!data) {
            card.innerHTML = `<p class="loading">Could not fetch Discord status. The user might not be in the Lanyard Discord server or is offline with no cached data.</p>`;
            return;
        }

        updateCard(data);
    } catch (error) {
        console.error("Failed to fetch Discord status:", error);
        card.innerHTML = `<p class="loading">Failed to fetch Discord status. Ensure user is in the Lanyard Discord server.</p>`;
    }
};

const updateCard = (data) => {
        const { discord_user, discord_status, activities, listening_to_spotify } = data;

        const avatarUrl = `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.png?size=128`;

        // 1. Custom Status (e.g., "Chilling")
        const customStatusActivity = activities.find(act => act.type === 4);
        const statusHtml = customStatusActivity ?
            `<div class="status">${customStatusActivity.emoji ? customStatusActivity.emoji.name + ' ' : ''}“${customStatusActivity.state}”</div>` :
            '';

        // 2. Main Activity (Spotify, Game, etc.)
        let activityHtml = '';
        // Prioritize Spotify
        if (listening_to_spotify) {
            activityHtml = `
            <div class="activity">
                <img src="${listening_to_spotify.album_art_url}" alt="Album Art" class="activity-icon">
                <div class="activity-details">
                    <strong>Listening to Spotify</strong><br>
                    ${listening_to_spotify.song}<br>
                    by ${listening_to_spotify.artist}
                </div>
            </div>
        `;
        } else {
            // Find other primary activities (Playing, Watching, etc.)
            const mainActivity = activities.find(act => act.type === 0 || act.type === 2 || act.type === 3);
            if (mainActivity) {
                let iconHtml = '';
                if (mainActivity.assets && mainActivity.assets.large_image) {
                    // Handle both standard assets and proxied media player assets
                    const iconUrl = mainActivity.assets.large_image.startsWith('mp:') ?
                        `https://media.discordapp.net/${mainActivity.assets.large_image.substring(3)}` :
                        `https://cdn.discordapp.com/app-assets/${mainActivity.application_id}/${mainActivity.assets.large_image}.png`;
                    iconHtml = `<img src="${iconUrl}" alt="${mainActivity.name}" class="activity-icon">`;
                }

                const activityPrefix = {
                    0: 'Playing',
                    2: 'Listening to',
                    3: 'Watching'
                }[mainActivity.type] || 'Playing';

                activityHtml = `
          <div class="activity">
            ${iconHtml}
            <div class="activity-details">
              <strong>${activityPrefix} ${mainActivity.name}</strong><br>
              ${mainActivity.details || ''}<br>
              ${mainActivity.state || ''}
            </div>
          </div>
        `;
            }
        }

        card.innerHTML = `
      <div class="profile">
        <img src="${avatarUrl}" alt="${discord_user.username}'s avatar" class="avatar ${discord_status}">
        <div class="user-info">
          <h2>
            ${discord_user.global_name || discord_user.username}
            <span class="discriminator">${discord_user.discriminator !== '0' ? `#${discord_user.discriminator}` : ''}</span>
          </h2>
        </div>
      </div>
      ${statusHtml}
      ${activityHtml}
    `;
};

// Initial fetch
fetchStatus();

// Poll for status updates every 15 seconds.
setInterval(fetchStatus, 15000);

// --- Custom Cursor Logic ---
const cursor = document.getElementById('custom-cursor');

// Store target and current positions
let mouseX = -100; // Start off-screen
let mouseY = -100;
let cursorX = -100;
let cursorY = -100;

// Easing factor (lower value = smoother/slower)
const easing = 0.1;

// Update target position on mouse move
window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Animation loop for smooth movement
const animateCursor = () => {
    // Calculate the distance to move
    const dx = mouseX - cursorX;
    const dy = mouseY - cursorY;

    // Update current position with easing
    cursorX += dx * easing;
    cursorY += dy * easing;

    // Apply the new position
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    // Continue the loop
    requestAnimationFrame(animateCursor);
};

// Start the animation
animateCursor();

// Fade cursor on window leave/enter
document.body.addEventListener('mouseleave', () => {
    cursor.style.opacity = 0;
});
document.body.addEventListener('mouseenter', () => {
    cursor.style.opacity = 1;
});

// --- Popup Logic ---
const aboutBtn = document.getElementById('about-me-btn');
const closeBtn = document.getElementById('close-popup-btn');
const popup = document.getElementById('about-me-popup');
const overlay = document.getElementById('popup-overlay');

const openPopup = () => {
    popup.classList.add('visible');
    overlay.classList.add('visible');
};

const closePopup = () => {
    popup.classList.remove('visible');
    overlay.classList.remove('visible');
};

aboutBtn.addEventListener('click', openPopup);
closeBtn.addEventListener('click', closePopup);
overlay.addEventListener('click', closePopup);

// --- Snowfall Animation ---
const canvas = document.getElementById('snow-canvas');
const ctx = canvas.getContext('2d');

let snowflakes = [];
const numFlakes = 250; // Number of snowflakes

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createSnowflakes() {
    snowflakes = [];
    for (let i = 0; i < numFlakes; i++) {
        snowflakes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1, // radius between 1 and 4
            speed: Math.random() * 2 + 0.5, // speed between 0.5 and 2.5
            drift: Math.random() * 2 - 1, // horizontal drift between -1 and 1
            opacity: Math.random() * 0.5 + 0.3 // opacity between 0.3 and 0.8
        });
    }
}

function drawSnowflakes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    for (let i = 0; i < snowflakes.length; i++) {
        const flake = snowflakes[i];

        ctx.globalAlpha = flake.opacity;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1; // Reset global alpha
}

function updateSnowflakes() {
    for (let i = 0; i < snowflakes.length; i++) {
        const flake = snowflakes[i];

        flake.y += flake.speed;
        flake.x += flake.drift;

        // Reset snowflake if it goes off the bottom of the screen
        if (flake.y > canvas.height + flake.radius) {
            flake.x = Math.random() * canvas.width;
            flake.y = 0 - flake.radius; // Start just above the screen
        }
    }
}

function animateSnow() {
    updateSnowflakes();
    drawSnowflakes();
    requestAnimationFrame(animateSnow);
}

// Initialize
window.addEventListener('resize', resizeCanvas);

resizeCanvas();
createSnowflakes();
animateSnow();