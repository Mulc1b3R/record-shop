/**
 * 🏛️ SECTION23 // MULTI-TRACK AUDIO LABORATORY PROCESSING CORE
 * Native Web Audio API Implementation of the Boiling Frog Master Console
 */

window.audioCtx = null;
window.sourceAudioBuffer = null;


// Active Audio Playback Node Pointer
let activeSourceNode = null;
let analyserNode = null;
let isMonitoring = false;

// 🎛️ SURGICAL FILTER & RAMP PARAMETERS (Calibrated directly from your specs)
const CONFIG = {
    target_sr: 44100,
    bass_lowpass_hz: 300,
    vocal_lowpass_hz: 8500,
    drum_lowpass_hz: 7000,
    room_delay_ms: 18,
    room_decay: 0.15,
    room_blend: 0.10,
    lathe_threshold: -3
};

// Initialize listeners when DOM loads
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('btn-play-engine').addEventListener('click', toggleMonitorFeed);
    document.getElementById('btn-run-ramp').addEventListener('click', activateBoilingRampEngine);
    
    // SAFE BINDING: Fully restores the master WAV printing trigger interaction
    const exportBtn = document.getElementById('btn-export-remaster');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            printStudioMasterWav();
        });
    }
    
    setupOscilloscopeRadarCanvas();
});


/**
 * 📥 STAGE 1: CORE DECODER HOOK (Accepts the single file variable instantly)
 */
window.handleUploadedLabFile = function(file) {
    if (!file) return;
    
    document.getElementById('loaded-file-indicator').innerText = file.name.toUpperCase();
    
    if (typeof printLabLog === "function") {
        printLabLog(`Intake payload verified: "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB). Preparing array...`);
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        
        // Spawn a temporary decoding context box strictly to parse the file bytes
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const tempCtx = new AudioContextClass({ sampleRate: CONFIG.target_sr });
        
        if (typeof printLabLog === "function") {
            printLabLog("⏳ Decoding raw audio binary container bytes into float arrays...");
        }
        
        tempCtx.decodeAudioData(arrayBuffer, (decodedBuffer) => {
            sourceAudioBuffer = decodedBuffer;
            
            if (typeof printLabLog === "function") {
                printLabLog(`🏆 Success! Matrix decoded cleanly. Duration: ${decodedBuffer.duration.toFixed(2)}s`);
            }
            
            // Arm control console button triggers safely (Demucs split button references completely removed)
            ['btn-play-engine', 'btn-run-ramp', 'btn-export-remaster'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = false;
            });
            
            tempCtx.close(); // Safely dispose of decoder context
        }, (err) => {
            if (typeof printLabLog === "function") {
                printLabLog(`❌ Critical Decoding Error: ${err.message}`, true);
            }
            tempCtx.close();
        });
    };
    reader.readAsArrayBuffer(file);
};

/**
 * 🎛️ STAGE 2: UNIFIED PATCH-BAY ROUTING GRID (Baseline Full Mix Configuration)
 */
function buildMasterDSPGraph() {
    if (!audioCtx || !sourceAudioBuffer) return;
    const duration = sourceAudioBuffer.duration;
    
    // 1. Setup Master Telemetry Analyser
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;
    
    // 2. Setup Limiter
    let compressorNode = audioCtx.createDynamicsCompressor();
    if (document.getElementById('chk-softener').checked) {
        compressorNode.threshold.setValueAtTime(CONFIG.lathe_threshold, audioCtx.currentTime);
        compressorNode.knee.setValueAtTime(10, audioCtx.currentTime);
        compressorNode.ratio.setValueAtTime(4, audioCtx.currentTime);
        compressorNode.attack.setValueAtTime(0.001, audioCtx.currentTime);
        compressorNode.release.setValueAtTime(0.050, audioCtx.currentTime);
    } else {
        compressorNode.threshold.setValueAtTime(0, audioCtx.currentTime);
    }

    // 3. Setup Room Glue Acoustics
    let roomGlueNode = audioCtx.createGain();
    if (document.getElementById('chk-room-glue').checked) {
        const delayNode = audioCtx.createDelay();
        const feedbackGain = audioCtx.createGain();
        const dryGain = audioCtx.createGain();
        const wetGain = audioCtx.createGain();

        delayNode.delayTime.setValueAtTime(CONFIG.room_delay_ms / 1000, audioCtx.currentTime);
        feedbackGain.gain.setValueAtTime(CONFIG.room_decay, audioCtx.currentTime);
        dryGain.gain.setValueAtTime(1.0 - CONFIG.room_blend, audioCtx.currentTime);
        wetGain.gain.setValueAtTime(CONFIG.room_blend, audioCtx.currentTime);

        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        
        roomGlueNode.connect(dryGain);
        roomGlueNode.connect(delayNode);
        delayNode.connect(wetGain);

        dryGain.connect(compressorNode);
        wetGain.connect(compressorNode);
    } else {
        roomGlueNode.connect(compressorNode);
    }

    compressorNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);

    // 4. Spawn Singular Synchronized Master Playback Thread
    const stemSource = audioCtx.createBufferSource();
    stemSource.buffer = sourceAudioBuffer;
    
    const masterMixGain = audioCtx.createGain();
    // Default to 'fader-other' as the global master track slider baseline
    const masterFaderVolume = parseFloat(document.getElementById('fader-other').value) / 100;
    masterMixGain.gain.setValueAtTime(masterFaderVolume, audioCtx.currentTime);

    let finalNodeInChain = masterMixGain;

    // Apply Surgical Ribbon Filter
    if (document.getElementById('chk-ribbon').checked) {
        const lpFilter = audioCtx.createBiquadFilter();
        lpFilter.type = "lowpass";
        lpFilter.frequency.setValueAtTime(CONFIG.vocal_lowpass_hz, audioCtx.currentTime);
        finalNodeInChain.connect(lpFilter);
        finalNodeInChain = lpFilter;
    }

    // Apply Boiling Frog Timeline Saturation Ramps
    const isRampEnabled = document.getElementById('btn-run-ramp').classList.contains('active-solo');
    if (isRampEnabled) {
        const shaperNode = audioCtx.createWaveShaper();
        shaperNode.curve = generateAsymmetricTubeDistortionCurve();
        
        const shaperGainNode = audioCtx.createGain();
        shaperGainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        shaperGainNode.gain.exponentialRampToValueAtTime(2.2, audioCtx.currentTime + duration);

        finalNodeInChain.connect(shaperGainNode);
        shaperGainNode.connect(shaperNode);
        finalNodeInChain = shaperNode;
    }

    finalNodeInChain.connect(roomGlueNode);
    
    // Map main node reference to window.mixNodes to allow live HTML slider modifications
    window.mixNodes = {
        drums: masterMixGain,
        bass: masterMixGain,
        vocals: masterMixGain,
        other: masterMixGain
    };

    // Inject Synthetic 78 Groove Noise
    if (document.getElementById('chk-crackle').checked) {
        injectSyntheticGrooveNoise();
    }

    activeSourceNode = stemSource;
    stemSource.connect(masterMixGain); // Direct audio content through processing channel chain first
    stemSource.start(0);
}

function generateAsymmetricTubeDistortionCurve() {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        if (x > 0) curve[i] = Math.tanh(x * 2.5);
        else curve[i] = Math.tanh(x * 2.0) * 0.95;
    }
    return curve;
}

function injectSyntheticGrooveNoise() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        output[i] = white * 0.012; 
        if (Math.random() > 0.9997) output[i] += (Math.random() > 0.5 ? 1 : -1) * 0.3;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    noiseSource.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noiseSource.start(0);
}

/**
 * 📡 MONITOR FEED RE-ROUTING TOGGLES
 */
function toggleMonitorFeed() {
    if (!sourceAudioBuffer) return;
    
    const btn = document.getElementById('btn-play-engine');
    if (!isMonitoring) {
        isMonitoring = true;
        btn.innerText = "🛑 BLOCK PROCESSING STREAM";
        btn.style.borderColor = "var(--critical-red)";
        btn.style.color = "var(--critical-red)";
        
        document.getElementById('scope-status').innerText = "STREAMING METRICS LIVE";
        document.getElementById('scope-status').style.color = "var(--matrix-green)";
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass({ sampleRate: CONFIG.target_sr });
        
        buildMasterDSPGraph();
        printLabLog("🔊 Live processing stream routing context directed to master output monitor speakers.");
    } else {
        isMonitoring = false;
        btn.innerText = "🔊 MONITOR PROCESSING FEED";
        btn.style.borderColor = "var(--caution-orange)";
        btn.style.color = "var(--caution-orange)";
        
        document.getElementById('scope-status').innerText = "IDLE";
        document.getElementById('scope-status').style.color = "var(--dim-green)";
        
                if (activeSourceNode) {
            try { activeSourceNode.stop(); } catch(e) {}
            activeSourceNode = null;
        }
        if (audioCtx) {
            try { audioCtx.close(); } catch(e) {}
            audioCtx = null;
        }
        printLabLog("🛑 Monitoring processing feed suspended. Signal streams locked down safely.");
    }
}

function activateBoilingRampEngine() {
    const btn = document.getElementById('btn-run-ramp');
    btn.classList.toggle('active-solo');
    if (btn.classList.contains('active-solo')) {
        btn.innerText = "⚡ BOILING RAMP ACTIVE";
        printLabLog("🐸 Boiling Frog Exponential saturation matrix active! Timeline growth curves armed.");
    } else {
        btn.innerText = "🐸 INSTIGATE BOILING RAMP";
        printLabLog("♻️ Boiling Frog parameter state returned to raw linear bypass values.");
    }
    
    if (isMonitoring) {
        if (activeSourceNode) { try { activeSourceNode.stop(); } catch(e) {} }
        if (audioCtx) { try { audioCtx.close(); } catch(e) {} }
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass({ sampleRate: CONFIG.target_sr });
        buildMasterDSPGraph();
    }
}

/**
 * 📟 VISUAL TELEMETRY: GLOWING GREEN TERMINAL OSCILLOSCOPE RADAR LINE
 */
function setupOscilloscopeRadarCanvas() {
    const canvas = document.getElementById('oscilloscope-canvas');
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    
    canvas.width = 600; 
    canvas.height = 120;
    
    function drawRadarScope() {
        requestAnimationFrame(drawRadarScope);
        
        // 1. Draw the retro terminal background matrix
        canvasCtx.fillStyle = '#020202';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 2. Fetch the current hardware stream array if audio is playing
        let bufferLength = 0;
        let dataArray = null;
        
        if (isMonitoring && analyserNode) {
            bufferLength = analyserNode.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            analyserNode.getByteTimeDomainData(dataArray);
        }
        
        // 3. Configure the neon matrix line style
        canvasCtx.strokeStyle = '#00ff00';
        canvasCtx.shadowBlur = 4;
        canvasCtx.shadowColor = '#00ff00';
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();
        
        // 4. Render either the live moving wave or a steady baseline
        if (bufferLength > 0 && dataArray) {
            let sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                let v = dataArray[i] / 128.0;
                let y = v * canvas.height / 2;
                
                if (i === 0) canvasCtx.moveTo(x, y);
                else canvasCtx.lineTo(x, y);
                
                x += sliceWidth;
            }
        } else {
            // Flat baseline fallback if sound is muted/stopped
            canvasCtx.moveTo(0, canvas.height / 2);
            canvasCtx.lineTo(canvas.width, canvas.height / 2);
        }
        
        canvasCtx.stroke();
        // Reset shadow effects to protect browser UI performance
        canvasCtx.shadowBlur = 0; 
    }
    drawRadarScope();
}


async function printStudioMasterWav() {
    if (!sourceAudioBuffer) {
        return alert("❌ Operational Block: Please load a source master audio file before running a master print.");
    }
    
    if (typeof printLabLog === "function") {
        printLabLog("💎 Commencing production rendering pass for 24-bit linear PCM master export stream...");
        printLabLog("⏳ Allocating high-speed OfflineAudioContext for background matrix printing...");
    }

    const numOfChannels = sourceAudioBuffer.numberOfChannels;
    const sampleRate = CONFIG.target_sr;
    const duration = sourceAudioBuffer.duration;
    
    // 1. Initialize an ultra-fast background renderer
    const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offlineCtx = new OfflineContextClass(numOfChannels, sampleRate * duration, sampleRate);
    
    // 2. Re-create the exact DSP chain for the export copy
    const stemSource = offlineCtx.createBufferSource();
    stemSource.buffer = sourceAudioBuffer;
    
    const masterMixGain = offlineCtx.createGain();
    const masterFaderVolume = parseFloat(document.getElementById('fader-other').value) / 100;
    masterMixGain.gain.setValueAtTime(masterFaderVolume, 0);
    
    let finalNodeInChain = masterMixGain;

    // Apply Ribbon Filter if checked
    if (document.getElementById('chk-ribbon').checked) {
        const lpFilter = offlineCtx.createBiquadFilter();
        lpFilter.type = "lowpass";
        lpFilter.frequency.setValueAtTime(CONFIG.vocal_lowpass_hz, 0);
        finalNodeInChain.connect(lpFilter);
        finalNodeInChain = lpFilter;
    }

    // Apply Boiling Frog Timeline Saturation Ramps if checked
    const isRampEnabled = document.getElementById('btn-run-ramp').classList.contains('active-solo');
    if (isRampEnabled) {
        const shaperNode = offlineCtx.createWaveShaper();
        shaperNode.curve = generateAsymmetricTubeDistortionCurve();
        
        const shaperGainNode = offlineCtx.createGain();
        shaperGainNode.gain.setValueAtTime(0.5, 0);
        shaperGainNode.gain.exponentialRampToValueAtTime(2.2, duration);

        finalNodeInChain.connect(shaperGainNode);
        shaperGainNode.connect(shaperNode);
        finalNodeInChain = shaperNode;
    }

    // Setup Room Glue Acoustics if checked
    let compressorNode = offlineCtx.createDynamicsCompressor();
    if (document.getElementById('chk-softener').checked) {
        compressorNode.threshold.setValueAtTime(CONFIG.lathe_threshold, 0);
        compressorNode.knee.setValueAtTime(10, 0);
        compressorNode.ratio.setValueAtTime(4, 0);
        compressorNode.attack.setValueAtTime(0.001, 0);
        compressorNode.release.setValueAtTime(0.050, 0);
    } else {
        compressorNode.threshold.setValueAtTime(0, 0);
    }

    let roomGlueNode = offlineCtx.createGain();
    if (document.getElementById('chk-room-glue').checked) {
        const delayNode = offlineCtx.createDelay();
        const feedbackGain = offlineCtx.createGain();
        const dryGain = offlineCtx.createGain();
        const wetGain = offlineCtx.createGain();

        delayNode.delayTime.setValueAtTime(CONFIG.room_delay_ms / 1000, 0);
        feedbackGain.gain.setValueAtTime(CONFIG.room_decay, 0);
        dryGain.gain.setValueAtTime(1.0 - CONFIG.room_blend, 0);
        wetGain.gain.setValueAtTime(CONFIG.room_blend, 0);

        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        
        roomGlueNode.connect(dryGain);
        roomGlueNode.connect(delayNode);
        delayNode.connect(wetGain);

        dryGain.connect(compressorNode);
        wetGain.connect(compressorNode);
    } else {
        roomGlueNode.connect(compressorNode);
    }

    // Connect nodes out to the final file destination
    finalNodeInChain.connect(roomGlueNode);
    compressorNode.connect(offlineCtx.destination);
    
    // Inject Synthetic 78 Groove Noise if checked
    if (document.getElementById('chk-crackle').checked) {
        const bufferSize = sampleRate * 2;
        const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            output[i] = white * 0.012; 
            if (Math.random() > 0.9997) output[i] += (Math.random() > 0.5 ? 1 : -1) * 0.3;
        }
        const noiseSource = offlineCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        const noiseGain = offlineCtx.createGain();
        noiseGain.gain.setValueAtTime(0.06, 0);
        noiseSource.connect(noiseGain);
        noiseGain.connect(offlineCtx.destination);
        noiseSource.start(0);
    }

    stemSource.connect(masterMixGain);
    stemSource.start(0);

    try {
        // 3. Render the processed audio array out at computer processing speeds
        const renderedBuffer = await offlineCtx.startRendering();
        
        if (typeof printLabLog === "function") {
            printLabLog("📦 Processing complete. Compiling raw 24-bit PCM WAV container headers...");
        }

        // 4. Encode float data array directly to a hard binary WAV file format
        const wavBlob = encodeWav24Bit(renderedBuffer);

        // 5. Force the web browser to trigger an instant file download window
        const downloadUrl = URL.createObjectURL(wavBlob);
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = "SECTION23_REMASTER_STUDIO_24BIT.wav";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(downloadUrl);

        if (typeof printLabLog === "function") {
            printLabLog("🏆 Success! Studio master file generated and dispatched to hard drive storage.");
        }
    } catch (err) {
        if (typeof printLabLog === "function") {
            printLabLog(`❌ Print Error: ${err.message}`, true);
        }
    }
}

/**
 * 🛠️ BINARY HELPER ENGINE: Formats audio buffers directly to 24-Bit Linear PCM WAV files
 */
/**
 * 🛠️ BINARY FORMATTER ENGINE: Writes 24-bit PCM arrays + injects an industry-standard RIFF INFO list block
 * This forces VLC Player and other audio software to extract and display the cover artwork natively.
 */
/**
 * 🛠️ BINARY FORMATTER ENGINE: Writes 24-bit PCM arrays + injects an ID3v2 APIC artwork chunk inside WAV format standard
 * This version places the ID3 block at the front of the file with perfect header padding calculations.
 */
/**
 * 🛠️ BINARY FORMATTER ENGINE: Writes 24-bit PCM arrays + injects an ID3v2 APIC artwork chunk inside WAV format standard
 * This version uses corrected index positioning arrays to write the ID3 signature blocks.
 */
/**
 * 🛠️ BINARY FORMATTER ENGINE: Writes 24-bit PCM arrays + injects an ID3v2 APIC artwork chunk inside WAV format standard
 * This version uses strict index positioning arrays to write a flawless ID3 signature chunk.
 */
/**
 * 🛠️ THE COMPILER: Injects a flawless ID3v2.3 header at offset 0, followed by the RIFF WAV trunk.
 * Fully compliant with Mutagen/VLC parsing specifications for uncompressed audio master containers.
 */
/**
 * 🛠️ THE BINARY ARCHITECT: Compiles pristine 24-bit linear PCM arrays, calculates 
 * exact byte block paddings, and wraps your artwork cleanly inside an industry-standard 
 * lowercase RIFF "id3 " subchunk at the trailing tail edge.
 */
function encodeWav24BitWithArtwork(audioBuffer, imageArrayBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numSamples = audioBuffer.length;
    const bytesPerSample = 3;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    
    // 🧱 STAGE 1: COMPILE THE NATIVE ID3 TAG CONTEXT PAYLOAD
    let id3BlockSize = 0;
    let id3ChunkBuffer = null;
    
    if (imageArrayBuffer) {
        const imgBytes = new Uint8Array(imageArrayBuffer);
        const mimeString = "image/jpeg";
        const descString = "Front Cover";
        
        // Compute standard inner sub-component layout allocation frames
        const apicFrameContentSize = 1 + mimeString.length + 1 + 1 + descString.length + 1 + imgBytes.length;
        id3BlockSize = 10 + 10 + apicFrameContentSize; // ID3 Global Header (10) + APIC Frame Header (10) + Data payload
        
        // Force word alignment padding if uneven bytes
        if (id3BlockSize % 2 !== 0) id3BlockSize += 1;
        
        id3ChunkBuffer = new ArrayBuffer(id3BlockSize);
        const id3View = new DataView(id3ChunkBuffer);
        const id3Bytes = new Uint8Array(id3ChunkBuffer);
        
        // Write standard ID3 signature tags
        id3Bytes[0] = 0x49; // 'I'
        id3Bytes[1] = 0x44; // 'D'
        id3Bytes[2] = 0x33; // '3'
        id3Bytes[3] = 0x03; // Major version 3 (ID3v2.3)
        id3Bytes[4] = 0x00; // Revision version 0
        id3Bytes[5] = 0x00; // Flags
        
        // Calculate standard 4-byte Synchsafe integer size blocks
        const sizeToEncode = id3BlockSize - 10;
        id3Bytes[6] = (sizeToEncode >> 21) & 0x7F;
        id3Bytes[7] = (sizeToEncode >> 14) & 0x7F;
        id3Bytes[8] = (sizeToEncode >> 7) & 0x7F;
        id3Bytes[9] = sizeToEncode & 0x7F;
        
        // Write standard APIC picture indicator tags
        let offset = 10;
        id3Bytes[offset + 0] = 0x41; // 'A'
        id3Bytes[offset + 1] = 0x50; // 'P'
        id3Bytes[offset + 2] = 0x49; // 'I'
        id3Bytes[offset + 3] = 0x43; // 'C'
        
        id3View.setUint32(offset + 4, apicFrameContentSize, false);
        id3Bytes[offset + 8] = 0; 
        id3Bytes[offset + 9] = 0; // Flags
        
        offset += 10;
        id3Bytes[offset] = 3; // Text type string encoding = UTF-8 baseline mapping flag
        offset += 1;
        
        for (let i = 0; i < mimeString.length; i++) id3Bytes[offset++] = mimeString.charCodeAt(i);
        id3Bytes[offset++] = 0; // Separator split null byte
        
        id3Bytes[offset++] = 3; // Cover art location structure mapping marker = Front Cover
        
        for (let i = 0; i < descString.length; i++) id3Bytes[offset++] = descString.charCodeAt(i);
        id3Bytes[offset++] = 0; // Separator split null byte
        
        // Pass original image binary data blocks into final payload area block array
        id3Bytes.set(imgBytes, offset);
    }

    // 🧱 STAGE 2: CALCULATE STRUCTURAL RIFF ALIGNMENTS
    const headerSize = 44; 
    
    // Add extra space for the lowercase RIFF metadata block wrapper: 'id3 ' (4) + [Size] (4) + ID3 payload space
    let riffId3SubchunkSize = id3BlockSize > 0 ? 8 + id3BlockSize : 0;
    const totalSize = headerSize + dataSize + riffId3SubchunkSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const outBytes = new Uint8Array(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // 🧱 STAGE 3: CONSTRUCT LEGAL Microsoft/IBM RIFF CONTAINER
    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true); // Declares structural total size to protect media player syncing loops
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 24, true); // CD Standard Premium depth bit allocation = 24 bits linear standard
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // 🧱 STAGE 4: MAP RAW SOUND SAMPLE STREAM ARRAYS
    let globalOffset = 44;
    for (let i = 0; i < numSamples; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            let sample = audioBuffer.getChannelData(channel)[i];
            if (sample > 1.0) sample = 1.0;
            else if (sample < -1.0) sample = -1.0;

            const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF;
            view.setUint8(globalOffset, intSample & 0xFF);
            view.setUint8(globalOffset + 1, (intSample >> 8) & 0xFF);
            view.setUint8(globalOffset + 2, (intSample >> 16) & 0xFF);
            globalOffset += 3;
        }
    }

    // 🧱 STAGE 5: APPEND CLEAN LOWERCASE "id3 " RIFF MASTER CHUNK
    if (riffId3SubchunkSize > 0 && id3ChunkBuffer) {
        // Write subchunk signature string with standard trailing blank padding space character layout
        writeString(globalOffset, 'id3 ');
        view.setUint32(globalOffset + 4, id3BlockSize, true); // Size indicator bits mapped cleanly
        
        globalOffset += 8;
        
        // Direct inject the ID3 buffer array block directly onto the absolute final tracking edge
        outBytes.set(new Uint8Array(id3ChunkBuffer), globalOffset);
    }

    return new Blob([buffer], { type: 'audio/wav' });
}





/**
 * 💎 STAGE 3: MULTI-BAND 24-BIT HIGH-SPEED OFFLINE WAV EXPORTER
 * Unified Audio Saturation & Artwork Header Burner Core
 */
async function printStudioMasterWav() {
    if (!window.sourceAudioBuffer) {
        return alert("❌ Operational Block: Please load a source master audio file before running a master print.");
    }
    
    // 1. Grab the raw uppercase file string text from the loader panel
    const rawFileText = document.getElementById('loaded-file-indicator').innerText;
    
    if (typeof printLabLog === "function") {
        printLabLog("💎 Commencing production rendering pass for 24-bit linear PCM master export stream...");
        printLabLog("⏳ Running clean string transformation matrix to strip dot formats...");
    }

    // 🚀 THE DOT-STRIPPER CORE: Converts dots to spaces and fixes spacing
    let cleanKey = rawFileText
        .replace(/\.(MP3|WAV)$/i, '')  // Wipe trailing audio extensions
        .replace(/\./g, ' ')           // Replace every dot with a space
        .replace(/\s+/g, ' ')          // Collapse double spaces down to single spaces
        .trim();                       // Trim edges

    // Convert only the first character of words to handle Title Case matching safely
    cleanKey = cleanKey.toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase());

    // Fix hyphen formatting spacing syntax to match your "Artist - Songname" pattern
    if (cleanKey.includes(" -")) {
        cleanKey = cleanKey.replace(/\s*-\s*/g, ' - ');
    }

    // 2. Build your target destination artwork path matching your folder configuration
    const artworkUrl = `./assets/${cleanKey}.jpg`;
    
    if (typeof printLabLog === "function") {
        printLabLog(`🎯 Destination target mapped: "${artworkUrl}"`);
    }

    let artworkArrayBuffer = null;

    // 3. Fetch the file byte array allocation directly from your assets folder
    try {
        const response = await fetch(artworkUrl);
        if (response.ok) {
            artworkArrayBuffer = await response.arrayBuffer();
            if (typeof printLabLog === "function") {
                printLabLog("🔥 Success! Image data binary allocation array captured.");
            }
        } else {
            // Fallback: If title case fails on Netlify, try a flat lowercase version check
            const fallbackUrl = `./assets/${cleanKey.toLowerCase()}.jpg`;
            const fallbackResponse = await fetch(fallbackUrl);
            
            if (fallbackResponse.ok) {
                artworkArrayBuffer = await fallbackResponse.arrayBuffer();
                if (typeof printLabLog === "function") {
                    printLabLog("🔥 Success! Lowercase match found and image data array captured.");
                }
            } else {
                if (typeof printLabLog === "function") {
                    printLabLog(`⚠️ Image Fetch Dropped: Could not find "${cleanKey}.jpg" inside assets folder. Exporting raw.`, true);
                }
            }
        }
    } catch (fetchErr) {
        console.warn("Artwork bridge skipped:", fetchErr);
    }

    // ... (The rest of your existing OfflineAudioContext rendering and binary WAV compilation loop blocks stay exactly the same!)

    const numChannels = window.sourceAudioBuffer.numberOfChannels;
    const sampleRate = CONFIG.target_sr;
    const duration = window.sourceAudioBuffer.duration;
    
    const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offlineCtx = new OfflineContextClass(numChannels, sampleRate * duration, sampleRate);
    
    const masterSaturationGain = offlineCtx.createGain();
    let finalNodeInChain = masterSaturationGain;

    if (document.getElementById('chk-ribbon').checked) {
        const lpFilter = offlineCtx.createBiquadFilter();
        lpFilter.type = "lowpass";
        lpFilter.frequency.setValueAtTime(8500, 0);
        finalNodeInChain.connect(lpFilter);
        finalNodeInChain = lpFilter;
    }

    // 🐸 THE BOILING FROG ENGINE (Audio Saturation Pipeline)
    const isRampEnabled = document.getElementById('btn-run-ramp').classList.contains('active-solo');
    if (isRampEnabled) {
        const shaperNode = offlineCtx.createWaveShaper();
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            if (x > 0) curve[i] = Math.tanh(x * 2.5);
            else curve[i] = Math.tanh(x * 2.0) * 0.95;
        }
        shaperNode.curve = curve;
        
        const shaperGainNode = offlineCtx.createGain();
        shaperGainNode.gain.setValueAtTime(0.5, 0);
        shaperGainNode.gain.exponentialRampToValueAtTime(2.2, duration);

        finalNodeInChain.connect(shaperGainNode);
        shaperGainNode.connect(shaperNode);
        finalNodeInChain = shaperNode;
    }

    let compressorNode = offlineCtx.createDynamicsCompressor();
    if (document.getElementById('chk-softener').checked) {
        compressorNode.threshold.setValueAtTime(CONFIG.lathe_threshold, 0);
        compressorNode.knee.setValueAtTime(10, 0);
        compressorNode.ratio.setValueAtTime(4, 0);
        compressorNode.attack.setValueAtTime(0.001, 0);
        compressorNode.release.setValueAtTime(0.050, 0);
    } else {
        compressorNode.threshold.setValueAtTime(0, 0);
    }

    let roomGlueNode = offlineCtx.createGain();
    if (document.getElementById('chk-room-glue').checked) {
        const delayNode = offlineCtx.createDelay();
        const feedbackGain = offlineCtx.createGain();
        const dryGain = offlineCtx.createGain();
        const wetGain = offlineCtx.createGain();

        delayNode.delayTime.setValueAtTime(CONFIG.room_delay_ms / 1000, 0);
        feedbackGain.gain.setValueAtTime(CONFIG.room_decay, 0);
        dryGain.gain.setValueAtTime(1.0 - CONFIG.room_blend, 0);
        wetGain.gain.setValueAtTime(CONFIG.room_blend, 0);

        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        
        roomGlueNode.connect(dryGain);
        roomGlueNode.connect(delayNode);
        delayNode.connect(wetGain);

        dryGain.connect(compressorNode);
        wetGain.connect(compressorNode);
    } else {
        roomGlueNode.connect(compressorNode);
    }

    finalNodeInChain.connect(roomGlueNode);
    compressorNode.connect(offlineCtx.destination);
    
    if (document.getElementById('chk-crackle').checked) {
        const bufferSize = sampleRate * 2;
        const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            output[i] = white * 0.012; 
            if (Math.random() > 0.9997) output[i] += (Math.random() > 0.5 ? 1 : -1) * 0.3;
        }
        const noiseSource = offlineCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        const noiseGain = offlineCtx.createGain();
        noiseGain.gain.setValueAtTime(0.06, 0);
        noiseSource.connect(noiseGain);
        noiseGain.connect(offlineCtx.destination);
        noiseSource.start(0);
    }

    const stemSource = offlineCtx.createBufferSource();
    stemSource.buffer = window.sourceAudioBuffer;
    stemSource.connect(masterSaturationGain);
    stemSource.start(0);

    try {
        const renderedBuffer = await offlineCtx.startRendering();
        if (typeof printLabLog === "function") {
            printLabLog("📦 Processing complete. Compiling multi-band 24-bit PCM WAV headers + ID3 Artwork Tags...");
        }

        // Pass the image bytes down into our binary file formatter engine
        const wavBlob = encodeWav24BitWithArtwork(renderedBuffer, artworkArrayBuffer);
        const downloadUrl = URL.createObjectURL(wavBlob);
        
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = `${rawFileText.replace(/\.(MP3|WAV)$/i, '')}_MASTER_24BIT.wav`;

        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(downloadUrl);

        if (typeof printLabLog === "function") {
            printLabLog("🏆 Success! Studio master file with embedded artwork generated and saved safely.");
        }
    } catch (err) {
        if (typeof printLabLog === "function") {
            printLabLog(`❌ Print Error: ${err.message}`, true);
        }
    }
}

/**
 * 🛠️ BINARY FORMATTER ENGINE: Writes 24-bit PCM arrays + injects an ID3v2 APIC artwork chunk inside WAV format standard
 */
function encodeWav24BitWithArtwork(audioBuffer, imageArrayBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numSamples = audioBuffer.length;
    const bytesPerSample = 3;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    
    // 🧱 BUILD ID3 ARTWORK CHUNK IF IMAGE FOUND
    let id3Size = 0;
    let id3Buffer = null;
    
    if (imageArrayBuffer) {
        const imgBytes = new Uint8Array(imageArrayBuffer);
        const mimeString = "image/jpeg";
        const descString = "Front Cover";
        
        // Calculate the sizes for the inner APIC header components
        const apicFrameContentSize = 1 + mimeString.length + 1 + 1 + descString.length + 1 + imgBytes.length;
        id3Size = 10 + 10 + apicFrameContentSize; // ID3 Header + APIC Frame Header + Content
        
        id3Buffer = new ArrayBuffer(id3Size);
        const id3View = new DataView(id3Buffer);
        const id3Bytes = new Uint8Array(id3Buffer);
        
        // Write global ID3 signature header metadata standard fields
        id3Bytes[0] = 73; id3Bytes[1] = 68; id3Bytes[2] = 51; // "ID3"
        id3Bytes[3] = 3;  id3Bytes[4] = 0;                  // ID3v2.3
        id3Bytes[5] = 0;                                    // Flags
        
        // Encode total size as an ID3 standard 4-byte Synchsafe integer array profile
        const sizeToEncode = id3Size - 10;
        id3Bytes[6] = (sizeToEncode >> 21) & 0x7F;
        id3Bytes[7] = (sizeToEncode >> 14) & 0x7F;
        id3Bytes[8] = (sizeToEncode >> 7) & 0x7F;
        id3Bytes[9] = sizeToEncode & 0x7F;
        
        // Write inner APIC image frame frame header info layout fields
        let offset = 10;
        id3Bytes[offset] = 65; id3Bytes[offset+1] = 80; id3Bytes[offset+2] = 73; id3Bytes[offset+3] = 67; // "APIC"
        
        // APIC chunk frame content frame sizing definitions data tracking
        id3View.setUint32(offset + 4, apicFrameContentSize, false);
        id3Bytes[offset + 8] = 0; id3Bytes[offset + 9] = 0; // Flags
        
        offset += 10;
        id3Bytes[offset] = 3; // Text encoding flag = UTF-8 baseline mapping marker
        offset += 1;
        
                for (let i = 0; i < mimeString.length; i++) id3Bytes[offset++] = mimeString.charCodeAt(i);
        id3Bytes[offset++] = 0; // Mime string terminal marker separation null byte
        
        id3Bytes[offset++] = 3; // Picture type structure standard configuration = Cover (front)
        
        for (let i = 0; i < descString.length; i++) id3Bytes[offset++] = descString.charCodeAt(i);
        id3Bytes[offset++] = 0; // Description separation null byte terminal line
        
        // Copy original image file byte chunk array into the inner payload area block
        id3Bytes.set(imgBytes, offset);
    }

    const headerSize = 44;
    const totalSize = headerSize + dataSize + id3Size;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const outBytes = new Uint8Array(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // Construct standard WAV RIFF headers layout
    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 24, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Map raw interleaved float sound arrays to 24-bit hardware depth standards
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            let sample = audioBuffer.getChannelData(channel)[i];
            if (sample > 1.0) sample = 1.0;
            else if (sample < -1.0) sample = -1.0;

            const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF;
            view.setUint8(offset, intSample & 0xFF);
            view.setUint8(offset + 1, (intSample >> 8) & 0xFF);
            view.setUint8(offset + 2, (intSample >> 16) & 0xFF);
            offset += 3;
        }
    }

    // Append compiled ID3 tag container seamlessly directly to the absolute trailing tail edge
    if (id3Buffer) {
        outBytes.set(new Uint8Array(id3Buffer), offset);
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

        




