let loadedRecordsCache = [];

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    let genre = urlParams.get('genre');

    if (!genre) {
        genre = 'blues';
    }

    const activeLink = document.getElementById(`link-${genre}`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    const cleanTitle = genre.toUpperCase();
    document.title = `Section23 - ${cleanTitle} Archive`;
    document.getElementById('vault-title').innerText = `${cleanTitle} Archive Vault`;

    const jsonUrl = `${genre}.json`; 
    
    fetch(jsonUrl)
        .then(response => {
            if (!response.ok) throw new Error(`File "${jsonUrl}" is missing.`);
            return response.json();
        })
        .then(records => {
            loadedRecordsCache = records;
            
            // 🚀 INJECTION A: Update global telemetry instantly when records load into browser cache
            updateSidebarGlobalCatalogTelemetry(records);

            const container = document.getElementById('catalog');
            container.innerHTML = '';

            if (records.length === 0) {
                container.innerHTML = '<p>This specific vault index layout is empty.</p>';
                return;
            }

            records.forEach(record => {
                const card = document.createElement('div');
                card.className = 'record-card';

                // 🚀 FIXED: Guarantees your Library of Congress URLs pass through flawlessly
                // 🚀 FIXED: Dynamic Multi-Era Resource Bridge
// Checks both potential schema layout keys natively before falling back!
                              // 🚀 FIXED: Captures the correct path across both old and new schema structures natively!
                const targetImg = record.local_image_path_target || record.image_url;

                // 🚀 FIXED: Points to targetImg, and renames the tail token to .jpeg to shield it from legacy filters!
                let rawImagePath = targetImg || 'assets/default.jpg';
                const imagePath = (rawImagePath.includes('default.jpg') && rawImagePath.startsWith('http'))
                    ? rawImagePath.replace('default.jpg', 'default.jpeg')
                    : rawImagePath;

                const sourceUrl = record.unadulterated_source_url || record.compiled_remote_mp3_source_url || "";
                const platform = (record.source_platform || "").toLowerCase();

                let mediaSectionHTML = `<div class="audio-player-unavailable">Preview Clip Unavailable</div>`;

                if (sourceUrl) {
                    if (sourceUrl.toLowerCase().endsWith('.mp3') || platform === "archive") {

                        // 🚀 UPGRADED TICKER-READY MEDIA CONTROLLER ENGINE
                        mediaSectionHTML = `
                            <div class="audio-player-container">
                                <audio controls preload="none" class="archive-audio-player"
                                       onplay='handleAudioPlayerTelemetryStream(${JSON.stringify(record)}, "play")'
                                       onpause='handleAudioPlayerTelemetryStream(${JSON.stringify(record)}, "pause")'
                                       onended='handleAudioPlayerTelemetryStream(${JSON.stringify(record)}, "ended")'>
                                    <source src="${sourceUrl}" type="audio/mpeg">
                                    Your browser does not support the audio element.
                                </audio>
                            </div>`;
                    } else if (platform === "youtube" || sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be")) {
                        let videoId = "";
                        try {
                            if (sourceUrl.includes("v=")) {
                                videoId = sourceUrl.split('v=')[1].split('&')[0];
                            } else if (sourceUrl.includes("youtu.be/")) {
                                videoId = sourceUrl.split('youtu.be/')[1].split('?')[0];
                            }
                        } catch(e) { console.log("Error parsing YouTube ID", e); }

                        if (videoId) {
                            mediaSectionHTML = `
                                <div class="youtube-player-container">
                                    <iframe class="youtube-mini-embed" 
                                        src="https://youtube.com/embed/${videoId}?controls=1&modestbranding=1" 
                                        title="Audio Preview" 
                                        frameborder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen>
                                    </iframe>
                                </div>`;
                        } else {
                            mediaSectionHTML = `<a href="${sourceUrl}" target="_blank" class="source-link-btn button-yt">Listen on YouTube ↗</a>`;
                        }
                    } else {
                        mediaSectionHTML = `<a href="${sourceUrl}" target="_blank" class="source-link-btn">Open Source Platform ↗</a>`;
                    }
                }

                const isFreeArchiveTrack = record.title.includes('(ARCHIVE)');

                const pricingSectionHTML = isFreeArchiveTrack ? '' : `
                    <div style="border-top:1px dashed #333; padding-top:10px; margin-top: 15px; font-family: monospace; font-size: 0.9rem;">
                        <div class="pricing-tier" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Preview MP3:</span> <span class="price-value" style="color: var(--accent);">Free</span></div>
                        <div class="pricing-tier" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>WAV Studio Master:</span> <span class="price-value">£${parseFloat(record.pricing.wav_digital_download || 2.50).toFixed(2)}</span></div>
                        <div class="pricing-tier" style="display:flex; justify-content:space-between;"><span>Physical CD Single:</span> <span class="price-value">£${parseFloat(record.pricing.physical_cd_single_post || 2.50).toFixed(2)}</span></div>
                    </div>
                `;

                const buyButtonHTML = isFreeArchiveTrack ? '' : `
                    <button class="buy-btn" onclick='handleCheckoutModalIntercept(${JSON.stringify(record)})' style="width:100%; margin-top:15px; padding:10px; font-weight:bold; cursor:pointer;">Buy Record Reference</button>
                `;

                card.innerHTML = `
                    <div>
                        <div class="record-image-container">
                            <img class="record-image" src="${imagePath}" alt="${record.title} sleeve" onerror="this.src='assets/default.jpg'">
                        </div>
                        <small style="color:var(--accent); font-family: monospace;">${record.id}</small>
                        <div class="record-title" style="font-weight: bold; margin-top: 5px;">${record.title}</div>
                        <div style="font-style:italic; margin-bottom:12px; color: #aaa;">by ${record.artist || 'Unknown Artist'}</div>
                        <div class="card-audio-wrapper">${mediaSectionHTML}</div>
                    </div>
                    ${pricingSectionHTML}
                    ${buyButtonHTML}
                    <button class="play-btn wav-extractor-action-trigger" onclick="extractSixteenBitWavOnTheFly(this, '${record.title.replace(/'/g, "\\'")}')" style="width: 100%; margin-top: 10px; background: #ff9f1c; color: #000; padding:10px; font-weight:bold; border:none; cursor:pointer;">
                        📥 Extract 16-Bit WAV (Free Crate-Digging Download)
                    </button>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error(error);
            document.getElementById('catalog').innerHTML = `<p style="color:red; font-family:monospace;">Database Error: Could not resolve file "${jsonUrl}"</p>`;
        });
});

/**
 * 🛰️ TELEMETRY INJECTION SUB-LOGIC MODULES
 */
function updateSidebarGlobalCatalogTelemetry(globalTracksArray) {
    if (!Array.isArray(globalTracksArray) || globalTracksArray.length === 0) return;

    const totalTracksCounterNode = document.getElementById('sidebar-meta-total-tracks');
    const eraTimelineSpanNode = document.getElementById('sidebar-meta-era-timeline');

    if (totalTracksCounterNode) {
        totalTracksCounterNode.innerText = globalTracksArray.length;
    }

    if (eraTimelineSpanNode) {
        const validYears = globalTracksArray
            .map(track => parseInt(track.year))
            .filter(year => !isNaN(year));

        if (validYears.length > 0) {
            const oldestYear = Math.min(...validYears);
            const newestYear = Math.max(...validYears);
            eraTimelineSpanNode.innerText = `${oldestYear} - ${newestYear}`;
        }
    }
}

// Intercepts checkout clicks to map asset details straight to sidebar slots
window.handleCheckoutModalIntercept = function(record) {
    if (!record) return;

    const trackIdNode = document.getElementById('sidebar-meta-track-id');
    const speedProfileNode = document.getElementById('sidebar-meta-playback-speed');
    const tagsContainerNode = document.getElementById('sidebar-meta-track-tags');

    if (trackIdNode) trackIdNode.innerText = record.id || "S23-UNKNOWN";

    if (speedProfileNode) {
        const formatText = (record.format || "").toUpperCase();
        if (formatText.includes("78-RPM") || formatText.includes("78 RPM")) {
            speedProfileNode.innerText = "78 RPM / SHELLAC";
        } else if (formatText.includes("45-RPM") || formatText.includes("45 RPM")) {
            speedProfileNode.innerText = "45 RPM / VINYL";
        } else {
            speedProfileNode.innerText = "33 RPM / LP CORE";
        }
    }

    if (tagsContainerNode) {
        if (Array.isArray(record.tags) && record.tags.length > 0) {
            tagsContainerNode.innerText = record.tags.join(" // ").toUpperCase();
        } else {
            tagsContainerNode.innerText = "NONE EXTRACTED";
        }
    }

    if (typeof openCheckoutModal === "function") {
        openCheckoutModal(record);
    }
};

/**
 * 📟 LIVE AUDIO STREAM TICKER TAPE CONTROLLER
 * Toggles status states and animation loops dynamically from active media players
 */
window.handleAudioPlayerTelemetryStream = function(record, eventType) {
    const statusNode = document.getElementById('sidebar-meta-stream-status');
    const tickerTrackNode = document.getElementById('sidebar-audio-ticker-track');

    if (!statusNode || !tickerTrackNode) return;

    const fullTrackIdentifier = `${record.artist || 'UNKNOWN'} - ${record.title}`;

    if (eventType === 'play') {
        statusNode.innerText = "STREAMING LIVE";
        statusNode.style.color = "#00ff00"; 
        tickerTrackNode.innerText = `*** NOW STREAMING FEED: ${fullTrackIdentifier} ***   `;
        tickerTrackNode.style.animationPlayState = "running";

        // Keeps underlying detail data slots completely updated with what is playing
        const trackIdNode = document.getElementById('sidebar-meta-track-id');
        const speedProfileNode = document.getElementById('sidebar-meta-playback-speed');
        const tagsContainerNode = document.getElementById('sidebar-meta-track-tags');

        if (trackIdNode) trackIdNode.innerText = record.id || "S23-UNKNOWN";
        if (speedProfileNode) {
            const formatText = (record.format || "").toUpperCase();
            if (formatText.includes("78-RPM") || formatText.includes("78 RPM")) {
                speedProfileNode.innerText = "78 RPM / SHELLAC";
            } else if (formatText.includes("45-RPM") || formatText.includes("45 RPM")) {
                speedProfileNode.innerText = "45 RPM / VINYL";
            } else {
                speedProfileNode.innerText = "33 RPM / LP CORE";
            }
        }
        if (tagsContainerNode) {
            if (Array.isArray(record.tags) && record.tags.length > 0) {
                tagsContainerNode.innerText = record.tags.join(" // ").toUpperCase();
            } else {
                tagsContainerNode.innerText = "NONE EXTRACTED";
            }
        }

    } else if (eventType === 'pause' || eventType === 'ended') {
        statusNode.innerText = eventType === 'ended' ? "STREAM COMPLETED" : "PAUSED // IDLE";
        statusNode.style.color = "#ff0000"; 
        tickerTrackNode.style.animationPlayState = "paused";
    }
};

