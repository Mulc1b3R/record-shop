/**
 * 🛰️ HIGH-UTILITY CLIENT-SIDE DIGITAL SIGNAL PROCESSING LAYER (ADAPTIVE CARD CORE)
 */
function extractSixteenBitWavOnTheFly(clickedButtonElement, pristineTrackTitle) {
    const parentCardFrame = clickedButtonElement.closest('.record-card');
    
    if (!parentCardFrame) {
        alert("❌ Layout Error: Could not locate container card frame.");
        return;
    }

    const targetAudioElement = parentCardFrame.querySelector('audio');

    if (!targetAudioElement) {
        alert("❌ Operational Block: No audio container element found in this card.");
        return;
    }

    // 🚀 THE CHILD DETECTOR ENGINE: If the main tag has no src, crawl inside to find the <source> tag
    let liveStreamUrl = targetAudioElement.src;
    if (!liveStreamUrl || liveStreamUrl === window.location.href) {
        const childSourceTag = targetAudioElement.querySelector('source');
        if (childSourceTag) {
            liveStreamUrl = childSourceTag.src;
        }
    }

    if (!liveStreamUrl || liveStreamUrl === window.location.href) {
        alert("❌ Operational Block: Could not read a valid audio source path from this card player.");
        return;
    }

    const originalButtonText = clickedButtonElement.textContent;
    clickedButtonElement.disabled = true;
    clickedButtonElement.textContent = "⏳ Decoding Signal Matrix...";

    console.log("📡 Handshake initialized for stream:", liveStreamUrl);

    fetch(liveStreamUrl)
        .then(response => {
            if (!response.ok) throw new Error("HTTP Stream Connection Severed.");
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContextClass();
            clickedButtonElement.textContent = "🎛️ Unpacking Compressed Waveform...";
            return audioCtx.decodeAudioData(arrayBuffer);
        })
        .then(audioBuffer => {
            clickedButtonElement.textContent = "⚙️ Injecting RIFF/WAV Header...";
            const wavBuffer = internalBinaryWavPackerEngine(audioBuffer);
            const blob = new Blob([wavBuffer], { type: "audio/wav" });
            const downloadUrl = URL.createObjectURL(blob);
            
            const virtualAnchor = document.createElement("a");
            virtualAnchor.href = downloadUrl;
            virtualAnchor.download = `${pristineTrackTitle || "Attic_Archival_Master"}.wav`;
            
            document.body.appendChild(virtualAnchor);
            virtualAnchor.click();
            document.body.removeChild(virtualAnchor);
            
            URL.revokeObjectURL(downloadUrl);
            clickedButtonElement.disabled = false;
            clickedButtonElement.textContent = originalButtonText;
        })
        .catch(err => {
            console.error("Signal Processing Breakdown:", err);
            // Change to this clean, direct premium message:
            alert("This is a Premium vault - WAV files go through checkout");

            clickedButtonElement.disabled = false;
            clickedButtonElement.textContent = originalButtonText;
        });
}

function internalBinaryWavPackerEngine(audioBuffer) {
    const numOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; 
    const bitDepth = 16;
    
    let resultBuffer;
    if (numOfChannels === 2) {
        resultBuffer = internalStereoInterleave(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1));
    } else {
        resultBuffer = audioBuffer.getChannelData(0);
    }
    
    const buffer = new ArrayBuffer(44 + resultBuffer.length * 2);
    const view = new DataView(buffer);
    
    internalWriteChars(view, 0, 'RIFF');
    view.setUint32(4, 36 + resultBuffer.length * 2, true);
    internalWriteChars(view, 8, 'WAVE');
    internalWriteChars(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChannels * (bitDepth / 8), true);
    view.setUint16(32, numOfChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    internalWriteChars(view, 36, 'data');
    view.setUint32(40, resultBuffer.length * 2, true);
    
    let index = 44;
    for (let i = 0; i < resultBuffer.length; i++) {
        let sample = Math.max(-1, Math.min(1, resultBuffer[i]));
        view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        index += 2;
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
