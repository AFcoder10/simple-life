const userId = "688983124868202496";
const card = document.getElementById('status-card');
let spotifyInterval = null;

// Global variables for preferences
let isCursorEnabled; // No initial value, will be set by loadPreferences
let animateCursor = () => {}; // Placeholder for cursor animation function
let isAnimationEnabled; // No initial value, will be set by loadPreferences
let animationFrameId = null; // For snow animation frame ID

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
        // Before re-rendering, check if the secondary activities are currently visible
        const oldSecondaryContainer = document.getElementById('secondary-activities');
        const wasSecondaryVisible = oldSecondaryContainer && !oldSecondaryContainer.classList.contains('hidden');

        const { discord_user, discord_status, activities, spotify } = data;

        // --- Build Profile Section ---
        const avatarUrl = `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.png?size=128`;
        const statusIconHtml = `<img src="icons/${discord_status}.svg" alt="${discord_status}" class="status-icon">`;

        const profileHtml = `
      <div class="profile">
        <img src="${avatarUrl}" alt="${discord_user.username}'s avatar" class="avatar">
        <div class="user-info">
          <h2>
            ${statusIconHtml}
            ${discord_user.global_name || discord_user.username}
            <span class="discriminator">${discord_user.discriminator !== '0' ? `#${discord_user.discriminator}` : ''}</span>
          </h2>
        </div>
      </div>
    `;

    // --- Build Activities Section ---
    if (spotifyInterval) {
        clearInterval(spotifyInterval);
        spotifyInterval = null;
    }

    const allActivities = [...activities];
    let mainActivity = null;
    let mainActivityHtml = '';
    let secondaryActivities = [];

    // Find main activity: Spotify > Game > Other
    const spotifyIndex = allActivities.findIndex(a => a.id === 'spotify:1');
    if (spotifyIndex !== -1) {
        mainActivity = allActivities.splice(spotifyIndex, 1)[0];
    } else {
        const gameIndex = allActivities.findIndex(a => a.type === 0);
        if (gameIndex !== -1) {
            mainActivity = allActivities.splice(gameIndex, 1)[0];
        } else {
            // Fallback to first non-custom-status activity
            const otherIndex = allActivities.findIndex(a => a.type !== 4);
            if (otherIndex !== -1) {
                mainActivity = allActivities.splice(otherIndex, 1)[0];
            }
        }
    }

    // The rest are secondary
    secondaryActivities = allActivities;

    // Render main activity
    if (mainActivity) {
        mainActivityHtml = renderActivity(mainActivity, spotify);
    }

    // Render secondary activities button and container
    let secondaryActivitiesHtml = '';
    if (secondaryActivities.length > 0) {
        const secondaryHtmlList = secondaryActivities.map(act => renderActivity(act, spotify)).join('');

        const buttonText = wasSecondaryVisible ?
            (secondaryActivities.length === 1 ? 'Hide Activity' : 'Hide Activities') :
            `Show Activity +${secondaryActivities.length}`;

        secondaryActivitiesHtml = `
            <button id="show-more-btn" class="show-more-btn">${buttonText}</button>
            <div id="secondary-activities" class="secondary-activities ${wasSecondaryVisible ? '' : 'hidden'}">
                <div class="secondary-activities-inner">
                    ${secondaryHtmlList}
                </div>
            </div>
        `;
    }

    const allActivitiesHtml = mainActivityHtml + secondaryActivitiesHtml;
    const separatorHtml = allActivitiesHtml ? `<div class="separator"></div>` : '';

    // --- Final Assembly ---
    card.innerHTML = profileHtml + separatorHtml + allActivitiesHtml;

    // If Spotify is present, start its progress bar
    if (mainActivity && mainActivity.id === 'spotify:1') {
        updateSpotifyProgressBar(spotify.timestamps);
    }

    // Add event listener for the new button
    const showMoreBtn = document.getElementById('show-more-btn');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const secondaryContainer = document.getElementById('secondary-activities');
            const isHidden = secondaryContainer.classList.contains('hidden');

            secondaryContainer.classList.toggle('hidden');

            if (isHidden) {
                button.textContent = secondaryActivities.length === 1 ? 'Hide Activity' : 'Hide Activities';
            } else {
                button.textContent = `Show Activity +${secondaryActivities.length}`;
            }
        });
    }
};

// Initial fetch
fetchStatus();

// Poll for status updates every 15 seconds.
setInterval(fetchStatus, 15000);

// Helper function to render a single activity
function renderActivity(activity, spotifyData) {
    // Handle Spotify
    if (activity.id === 'spotify:1' && spotifyData) {
        return `
            <div class="activity-block">
                <div class="activity">
                    <img src="${spotifyData.album_art_url}" alt="Album Art" class="activity-icon">
                    <div class="activity-details">
                        <strong>Listening to Spotify</strong><br>
                        ${spotifyData.song}<br>
                        by ${spotifyData.artist}<br>
                        on ${spotifyData.album}
                    </div>
                </div>
                <div class="progress-container">
                    <span class="time-elapsed">0:00</span>
                    <div class="progress-bar-background">
                        <div class="progress-bar"></div>
                    </div>
                    <span class="time-total">0:00</span>
                </div>
            </div>
        `;
    }

    // Handle Custom Status
    if (activity.type === 4 && activity.state) {
        const emoji = activity.emoji ? activity.emoji.name + ' ' : '';
        return `<div class="status">${emoji}“${activity.state}”</div>`;
    }

    // Handle other activities (Playing, etc.)
    if (activity.type === 0) {
        let iconHtml = '';
        if (activity.assets && activity.assets.large_image) {
            let iconUrl = '';
            if (activity.assets.large_image.startsWith('mp:')) {
                iconUrl = `https://media.discordapp.net/${activity.assets.large_image.substring(3)}`;
            } else if (activity.application_id) {
                iconUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
            }
            if (iconUrl) {
                iconHtml = `<img src="${iconUrl}" alt="${activity.name}" class="activity-icon">`;
            }
        }

        const detailsLine = activity.details ? `${activity.details}<br>` : '';
        const stateLine = activity.state ? `${activity.state}` : '';

        return `
            <div class="activity-block">
                <div class="activity">
                    ${iconHtml}
                    <div class="activity-details">
                        <strong>Playing ${activity.name}</strong><br>
                        ${detailsLine}
                        ${stateLine}
                    </div>
                </div>
            </div>
        `;
    }

    return ''; // Ignore other activity types
}

// --- Custom Cursor Logic ---
const setupCursor = () => {
    const cursor = document.getElementById('custom-cursor');
    let mouseX = -100,
        mouseY = -100;
    let cursorX = -100,
        cursorY = -100;
    const easing = 0.1;

    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    animateCursor = () => {
        if (!isCursorEnabled) return;
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        cursorX += dx * easing;
        cursorY += dy * easing;
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
        requestAnimationFrame(animateCursor);
    };
};

// --- Hero Text 3D Effect ---
const heroText = document.getElementById('hero-text');
const heroContainer = document.querySelector('.hero-container');

function handleInteraction(x, y) {
    const {
        left,
        top,
        width,
        height
    } = heroContainer.getBoundingClientRect();
    const relativeX = x - left;
    const relativeY = y - top;

    // Calculate rotation values. Range from -15 to 15 degrees.
    const rotateY = 15 * ((relativeX / width) - 0.5) * 2;
    const rotateX = -15 * ((relativeY / height) - 0.5) * 2;

    heroText.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

// Mouse interaction
if (window.matchMedia("(pointer: fine)").matches) {
    heroContainer.addEventListener('mousemove', (e) => {
        handleInteraction(e.clientX, e.clientY);
    });
    heroContainer.addEventListener('mouseleave', () => {
        heroText.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
}

// Touch interaction
heroContainer.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling while dragging on the text
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

heroContainer.addEventListener('touchend', () => {
    heroText.style.transform = 'rotateX(0deg) rotateY(0deg)';
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

aboutBtn.addEventListener('click', () => {
    openPopup();
});
closeBtn.addEventListener('click', closePopup);

// --- Sidebar Menu Logic ---
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar-menu');

const openSidebar = () => {
    sidebar.classList.add('visible');
    overlay.classList.add('visible');
};

const closeSidebar = () => {
    sidebar.classList.remove('visible');
    // Only hide overlay if popup is also not visible
    if (!popup.classList.contains('visible')) {
        overlay.classList.remove('visible');
    }
};

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent click from closing it immediately
    if (sidebar.classList.contains('visible')) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

overlay.addEventListener('click', () => {
    closePopup();
    closeSidebar();
});

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") closeSidebar();
});

// --- Time Display Logic ---
const timeWidget = document.getElementById('time-widget');
const timeDetailsContent = document.querySelector('#time-details-content');

function updateTime() {
    const now = new Date();
    // Options to get a 12-hour format with seconds for the IST timezone (GMT+5:30)
    const options = {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    };
    const timeString = now.toLocaleString('en-US', options);

    // Get 24-hour format to determine time of day
    const hour24 = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }), 10);

    let greeting = '';
    if (hour24 >= 6 && hour24 < 12) { // 6 AM to 11:59 AM
        greeting = 'Morning';
    } else if (hour24 >= 12 && hour24 < 17) { // 12 PM to 4:59 PM
        greeting = 'Noon';
    } else if (hour24 >= 17 && hour24 < 21) { // 5 PM to 8:59 PM
        greeting = 'Evening';
    } else if (hour24 >= 21) { // 9 PM to 11:59 PM
        greeting = 'Night';
    } else { // 12 AM to 5:59 AM
        greeting = 'Midnight';
    }

    timeDetailsContent.innerHTML = `
        <div id="time-string">${timeString} (IST)</div>
        <div id="time-greeting">${greeting}</div>
    `;
}

timeWidget.addEventListener('click', () => {
    timeWidget.classList.toggle('expanded');
});

// Update the time immediately and then every second
updateTime();
setInterval(updateTime, 1000);

// Disable the default browser context menu
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

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

         flake.y += gravityY * flake.speed;
         flake.x += gravityX * flake.speed + flake.drift;

         // Reset snowflake if it goes off-screen
         const isOutOfBounds = flake.y > canvas.height + flake.radius ||
             flake.y < -flake.radius ||
             flake.x > canvas.width + flake.radius ||
             flake.x < -flake.radius;

         if (isOutOfBounds) {
             // If it's out of bounds, reset it to the "top" relative to gravity
             if (Math.abs(gravityX) > Math.abs(gravityY)) {
                 // More horizontal than vertical
                 if (gravityX > 0) { // Moving right
                     flake.x = -flake.radius;
                     flake.y = Math.random() * canvas.height;
                 } else { // Moving left
                     flake.x = canvas.width + flake.radius;
                     flake.y = Math.random() * canvas.height;
                 }
             } else {
                 // More vertical than horizontal (or equal)
                 if (gravityY >= 0) { // Moving down
                     flake.x = Math.random() * canvas.width;
                     flake.y = -flake.radius;
                 } else { // Moving up
                     flake.x = Math.random() * canvas.width;
                     flake.y = canvas.height + flake.radius;
                 }
             }
         }
     }
}

function animateSnow() {
    if (!isAnimationEnabled) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animationFrameId = null;
        return;
    }
    updateSnowflakes();
    drawSnowflakes();
    animationFrameId = requestAnimationFrame(animateSnow);
}

// --- Snowfall Animation ---
const canvas = document.getElementById('snow-canvas');
const ctx = canvas.getContext('2d');
const numFlakes = 250; // Number of snowflakes
let snowflakes = [];
let gravityX = 0;
let gravityY = 1;

function stopSnow() {
    isAnimationEnabled = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

const handleOrientation = (event) => {
    if (event.gamma === null || event.beta === null) return;

    // Normalize gamma from [-90, 90] to [-1, 1] for X-axis gravity
    const newGravityX = Math.max(-1, Math.min(1, event.gamma / 90));
    // Normalize beta from [-90, 90] to [-1, 1] for Y-axis gravity
    const newGravityY = Math.max(-1, Math.min(1, event.beta / 90));

    // Use a low-pass filter to smooth out the gravity changes
    const smoothingFactor = 0.1;
    gravityX = gravityX * (1 - smoothingFactor) + newGravityX * smoothingFactor;
    gravityY = gravityY * (1 - smoothingFactor) + newGravityY * smoothingFactor;
};

function initDeviceOrientation() {
    if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires user permission
            document.body.addEventListener('click', function requestPermission() {
                DeviceOrientationEvent.requestPermission()
                    .then(state => {
                        if (state === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation);
                        }
                    }).catch(console.error);
                document.body.removeEventListener('click', requestPermission);
            });
        } else {
            // Non-iOS browsers
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }
}

// Initialize
window.addEventListener('resize', resizeCanvas);

// --- Sidebar Toggles Logic ---
const cursorToggle = document.getElementById('cursor-toggle');
const animationToggle = document.getElementById('animation-toggle');

// Function to load preferences from localStorage
const loadPreferences = () => {
    // Cursor preference
    const savedCursorPref = localStorage.getItem('cursorEnabled');
    // Default to true if no preference is saved
    isCursorEnabled = savedCursorPref !== null ? savedCursorPref === 'true' : true;
    if (cursorToggle) {
        cursorToggle.checked = isCursorEnabled;
    }

    // Animation preference
    const savedAnimationPref = localStorage.getItem('animationEnabled');
    // Default to true if no preference is saved
    isAnimationEnabled = savedAnimationPref !== null ? savedAnimationPref === 'true' : true;
    if (animationToggle) {
        animationToggle.checked = isAnimationEnabled;
    }
};

// Load preferences immediately after toggle elements are available
loadPreferences();

// Apply initial states based on loaded preferences
// Custom Cursor Initialization
if (window.matchMedia("(pointer: fine)").matches) {
    setupCursor(); // Always setup cursor event listeners and define animateCursor

    const customCursor = document.getElementById('custom-cursor');
    if (isCursorEnabled) {
        document.body.classList.add('custom-cursor-enabled');
        animateCursor(); // Start animation only if enabled
    } else {
        document.body.classList.remove('custom-cursor-enabled');
        if (customCursor) customCursor.style.display = 'none';
    }

    // Fade cursor on window leave/enter
    document.body.addEventListener('mouseleave', () => {
        if (customCursor) customCursor.style.opacity = 0;
    });
    document.body.addEventListener('mouseenter', () => {
        if (isCursorEnabled && customCursor) { // Only show if currently enabled
            customCursor.style.opacity = 1;
        }
    });
} else {
    // If not a fine pointer device, ensure custom cursor is disabled
    isCursorEnabled = false; // Force disable for coarse pointers
    if (cursorToggle) {
        cursorToggle.checked = false;
        cursorToggle.disabled = true; // Disable the toggle itself
    }
    document.body.classList.remove('custom-cursor-enabled'); // Ensure no custom cursor class
    const customCursor = document.getElementById('custom-cursor');
    if (customCursor) customCursor.style.display = 'none';
}

// Snowfall Animation Initialization
resizeCanvas();
createSnowflakes();
if (isAnimationEnabled) {
    animateSnow();
} else {
    stopSnow(); // Ensure animation is stopped and canvas cleared if preference is off
}

initDeviceOrientation();

cursorToggle.addEventListener('change', (e) => {
    isCursorEnabled = e.target.checked;
    localStorage.setItem('cursorEnabled', isCursorEnabled); // Save preference
    document.body.classList.toggle('custom-cursor-enabled', isCursorEnabled);

    const customCursor = document.getElementById('custom-cursor');
    if (isCursorEnabled) {
        customCursor.style.display = 'block';
        // Restart animation if it was stopped
        if (window.matchMedia("(pointer: fine)").matches) {
            animateCursor();
        }
    } else {
        customCursor.style.display = 'none';
    }
});

animationToggle.addEventListener('change', (e) => {
    isAnimationEnabled = e.target.checked;
    localStorage.setItem('animationEnabled', isAnimationEnabled); // Save preference
    if (isAnimationEnabled && !animationFrameId) {
        animateSnow(); // Restart animation
    } else if (!isAnimationEnabled) {
        stopSnow(); // Stop animation and clear canvas
    }
});

const formatTime = (ms) => {
    if (isNaN(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

function updateSpotifyProgressBar(timestamps) {
    if (spotifyInterval) clearInterval(spotifyInterval);

    const progressBar = document.querySelector('.progress-bar');
    const timeElapsedEl = document.querySelector('.time-elapsed');
    const timeTotalEl = document.querySelector('.time-total');

    if (!progressBar || !timeElapsedEl || !timeTotalEl) return;

    const { start, end } = timestamps;
    const duration = end - start;

    timeTotalEl.textContent = formatTime(duration);

    const update = () => {
        const elapsed = Date.now() - start;

        if (elapsed >= duration) {
            timeElapsedEl.textContent = formatTime(duration);
            progressBar.style.width = '100%';
            if (spotifyInterval) clearInterval(spotifyInterval);
            spotifyInterval = null;
            return;
        }

        const progressPercent = (elapsed / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
        timeElapsedEl.textContent = formatTime(elapsed);
    };

    update(); // Initial call
    spotifyInterval = setInterval(update, 1000);
}

// --- Simulated Viewer Count ---
const viewerCountEl = document.getElementById('viewer-count');
let currentViewers = 1;

function simulateViewerCount() {
    // Fluctuate the number by -1, 0, or 1
    const fluctuation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    currentViewers += fluctuation;

    // Ensure the count doesn't drop below 1
    if (currentViewers < 1) {
        currentViewers = 1;
    }

    if (viewerCountEl) {
        viewerCountEl.textContent = currentViewers;
    }
}

simulateViewerCount(); // Initial call
setInterval(simulateViewerCount, 4000); // Update every 4 seconds