/**
 * 🎹 SECTION23 // PERFORMANCE PHRASE SAMPLER MODULE
 * Standalone Audio Capture & Overlay Trigger Engine Extension
 */

(function () {
    // Isolated local script memory pointers
    let capturedSampleBuffer = null; 
    let isRecordingSample = false;  

    // Inject styles automatically to handle the sampler button visual stages
    const style = document.createElement('style');
    style.innerHTML = `
        .sampler-armed { border-color: #00ffff !important; color: #00ffff !important; }
        .sampler-recording { border-color: #ff3333 !important; color: #ff3333 !important; animation: pulseMatrix 1s infinite; }
        .sampler-ready { border-color: #00ff00 !important; color: #00ff00 !important; font-weight: bold; }
        @keyframes pulseMatrix { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
    `;
    document.head.appendChild(style);

    // Monitor core audio context shutdown loops to wipe sample memory cleanly
    function checkAndResetSamplerOnStop() {
        // If lab-core has closed the audio context, wipe the performance buffer
        if (!window.audioCtx || window.audioCtx.state === "closed") {
            capturedSampleBuffer = null;
            isRecordingSample = false;
            const btn = document.getElementById('btn-run-sampler');
            if (btn) {
                btn.className = "tactical-btn sampler-armed";
                btn.innerText = "🔴 RECORD 3S SAMPLE";
            }
        }
    }

    // Main execution sequence loop
    function executeLiveSamplerRoutine() {
        if (!window.sourceAudioBuffer || !window.audioCtx) {
            return alert("❌ Operational Block: Stream must be active to capture or trigger a live sample.");
        }

        const btn = document.getElementById('btn-run-sampler');
        if (!btn) return;

        // 🔴 MODE A: NO BUFFER RECORDED -> RECORD NEXT 3 SECONDS OF MASTER TRACK
        if (!capturedSampleBuffer) {
            if (isRecordingSample) return;
            isRecordingSample = true;
            
            btn.className = "tactical-btn sampler-recording";
            btn.innerText = "⏳ RECORDING PHRASE...";
            
            if (typeof window.printLabLog === "function") {
                window.printLabLog("🔴 Live Sampler active: Grabbing a 3-second snapshot of the master audio stream array...");
            }

            const sampleRate = window.sourceAudioBuffer.sampleRate;
            const numChannels = window.sourceAudioBuffer.numberOfChannels;
            const sampleLengthInSamples = sampleRate * 3; // 3 seconds baseline chunk allocation
            
            // Extract the playhead offset pointer directly from current AudioContext timing
            const playbackStartOffset = Math.floor(window.audioCtx.currentTime * sampleRate);
            const outputBuffer = window.audioCtx.createBuffer(numChannels, sampleLengthInSamples, sampleRate);

            // Copy raw audio arrays float blocks directly inside background memory
            for (let channel = 0; channel < numChannels; channel++) {
                const sourceData = window.sourceAudioBuffer.getChannelData(channel);
                const channelDataAllocation = outputBuffer.getChannelData(channel);
                
                for (let i = 0; i < sampleLengthInSamples; i++) {
                    const sourceIndex = playbackStartOffset + i;
                    if (sourceIndex < sourceData.length) {
                        channelDataAllocation[i] = sourceData[sourceIndex];
                    } else {
                        channelDataAllocation[i] = 0; // Padding silence if track ends early
                    }
                }
            }

            // Lock sample payload down to memory array after 3 seconds finish line
            setTimeout(() => {
                capturedSampleBuffer = outputBuffer;
                isRecordingSample = false;
                btn.className = "tactical-btn sampler-ready";
                btn.innerText = "🎹 PLAY 3S SAMPLE LOOP";
                
                if (typeof window.printLabLog === "function") {
                    window.printLabLog("🏆 Success! 3-Second live performance phrase captured. Sampler locked and armed.");
                }
            }, 3000);
            
            return;
        }

        // 🎹 MODE B: BUFFER CONTAINS RECORDING -> FIRE PHRASE TRIGGER OVERLAY
        if (typeof window.printLabLog === "function") {
            window.printLabLog("🎹 Sampler Trigger: Firing live 3-second captured performance snapshot over audio mix bus.");
        }

        const samplePlaybackSource = window.audioCtx.createBufferSource();
        samplePlaybackSource.buffer = capturedSampleBuffer;

        const sampleGainNode = window.audioCtx.createGain();
        sampleGainNode.gain.setValueAtTime(0.75, window.audioCtx.currentTime); // Safety leveling mix print dampener

        samplePlaybackSource.connect(sampleGainNode);

        // Smart routing via visual telemetry lines to animate neon green radar graph
        if (window.analyserNode) {
            sampleGainNode.connect(window.analyserNode);
        } else {
            sampleGainNode.connect(window.audioCtx.destination);
        }

        samplePlaybackSource.start(0);
    }

    // Attach event listeners safely when document initializes
    document.addEventListener("DOMContentLoaded", () => {
        const samplerBtn = document.getElementById('btn-run-sampler');
        if (samplerBtn) {
            samplerBtn.className = "tactical-btn sampler-armed";
            samplerBtn.addEventListener('click', executeLiveSamplerRoutine);
        }

        // Keep tabs on main file feed playback switches to reset memory on shutdown cuts
        const monitorBtn = document.getElementById('btn-play-engine');
        if (monitorBtn) {
            monitorBtn.addEventListener('click', () => {
                // Short safety timeout allows lab-core context state arrays to clean up first
                setTimeout(checkAndResetSamplerOnStop, 150);
            });
        }
    });
})();
