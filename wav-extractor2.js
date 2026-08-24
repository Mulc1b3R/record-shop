/**
 * 🛰️ HIGH-UTILITY CLIENT-SIDE DIGITAL SIGNAL PROCESSING LAYER (24-BIT MASTER CORE)
 */
function extractSixteenBitWavOnTheFly(clickedButtonElement, pristineTrackTitle) {
    const parentCardFrame = clickedButtonElement.closest('.record-card');
    if (!parentCardFrame) return alert("❌ Layout Error: Container frame missing.");

    const targetAudioElement = parentCardFrame.querySelector('audio');
    if (!targetAudioElement) return alert("❌ Operational Block: No audio player found.");

    // Crawl inside to capture the source path string loaded onto the element
    let liveStreamUrl = targetAudioElement.src;
    if (!liveStreamUrl || liveStreamUrl === window.location.href) {
        const childSourceTag = targetAudioElement.querySelector('source');
        if (childSourceTag) {
            liveStreamUrl = childSourceTag.src;
        }
    }

    if (!liveStreamUrl || liveStreamUrl === window.location.href) {
        return alert("❌ Operational Block: Unable to resolve a valid audio stream path.");
    }

    // 🚀 THE MAGIC FIX: Decode '%20' symbols back into regular spaces 
    // This translates "old%20music" back into "old music" so your file system can find it!
    liveStreamUrl = decodeURIComponent(liveStreamUrl);

    const originalButtonText = clickedButtonElement.textContent;
    clickedButtonElement.disabled = true;
    clickedButtonElement.textContent = "⏳ Decoding Signal Matrix...";

    console.log("📡 Local stream fetch handshake running for path:", liveStreamUrl);

    // Run your clean binary buffer fetch request sequence
    fetch(liveStreamUrl)
        .then(response => {
            if (!response.ok) throw new Error("Local directory stream connection severed.");
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContextClass();
            clickedButtonElement.textContent = "🎛️ Unpacking Compressed Waveform...";
            return audioCtx.decodeAudioData(arrayBuffer);
        })
        .then(audioBuffer => {
            clickedButtonElement.textContent = "⚙️ Injecting 24-Bit RIFF Header...";
            const wavBuffer = internalBinaryWavPackerEngine(audioBuffer);
            const blob = new Blob([wavBuffer], { type: "audio/wav" });
            const downloadUrl = URL.createObjectURL(blob);
            
            const virtualAnchor = document.createElement("a");
            virtualAnchor.href = downloadUrl;
            virtualAnchor.download = `${pristineTrackTitle || "Studio_Master"}_24bit.wav`;
            
            document.body.appendChild(virtualAnchor);
            virtualAnchor.click();
            document.body.removeChild(virtualAnchor);
            
            URL.revokeObjectURL(downloadUrl);
            clickedButtonElement.disabled = false;
            clickedButtonElement.textContent = originalButtonText;
        })
        .catch(err => {
            // Logs to your F12 screen instead of your printer hardware!
            console.error("Signal Processing Breakdown:", err);
            alert("This is a Premium vault - WAV files go through checkout");
            
            clickedButtonElement.disabled = false;
            clickedButtonElement.textContent = originalButtonText;
        });
}

function internalBinaryWavPackerEngine(audioBuffer) {
    const numOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM Linear
    const bitDepth = 24; // 24-bit studio container flag
    
    let resultBuffer = numOfChannels === 2 
        ? internalStereoInterleave(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1))
        : audioBuffer.getChannelData(0);
    
    const bytesPerSample = bitDepth / 8; 
    const dataLength = resultBuffer.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    
    // RIFF Header block mapping specifications
    internalWriteChars(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    internalWriteChars(view, 8, 'WAVE');
    internalWriteChars(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChannels * bytesPerSample, true); 
    view.setUint16(32, numOfChannels * bytesPerSample, true); 
    view.setUint16(34, bitDepth, true); 
    internalWriteChars(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // 🎛️ STUDIO MASTER BIT-SHIFTING INTEGER LOOPS
    let index = 44;
    for (let i = 0; i < resultBuffer.length; i++) {
        let sample = Math.max(-1, Math.min(1, resultBuffer[i]));
        let s24 = sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF;
        let intSample = Math.floor(s24);
        
        view.setUint8(index, intSample & 0xFF);          
        view.setUint8(index + 1, (intSample >> 8) & 0xFF);  
        view.setUint8(index + 2, (intSample >> 16) & 0xFF); 
        index += 3; 
    }
    return buffer;
}

function internalStereoInterleave(leftChannel, rightChannel) {
    const length = leftChannel.length + rightChannel.length;
    const result = new Float32Array(length);
    let inputIndex = 0;
    for (let index = 0; index < length; index += 2) {
        result[index] = leftChannel[inputIndex];
        result[index + 1] = rightChannel[inputIndex];
        inputIndex++;
    }
    return result;
}

function internalWriteChars(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
