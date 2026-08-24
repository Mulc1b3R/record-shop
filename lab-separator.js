/**
 * 🤖 SECTION23 // AUTONOMOUS AUDIO SOURCE SEPARATION LAYER (CHUNK-BUFFERED LOCK)
 * High-Performance Client-Side Signal Slicing Matrix with Memory Allocation Protection
 */

let isModelLoading = false;
let ortSession = null;

// LOCAL FILE TARGET: Reads the model file directly from your root directory tray
const DEMUCS_ONNX_MODEL_URL = "./htdemucs.onnx";

window.executeTrueLocalDemucsSeparation = async function(sourceAudioBuffer, sampleRate) {
    if (!sourceAudioBuffer) {
        alert("❌ Operational Block: Drag and drop a source file into the intake bay first.");
        return false;
    }

    if (isModelLoading) return false;

    try {
        // 1. Initialize ONNX Runtime Engine safely with local modules
        if (!ortSession) {
            printLabLog("🤖 Initializing Chunk-Buffered ONNX Runtime Context...");
            isModelLoading = true;
            
            ort.env.wasm.numThreads = 1;
            ort.env.wasm.wasmPaths = "./";

            ortSession = await ort.InferenceSession.create(DEMUCS_ONNX_MODEL_URL, {
                executionProviders: ['webgpu', 'wasm'],
                logSeverityLevel: 3
            });
            
            isModelLoading = false;
            printLabLog("🚀 AI Model Weights successfully locked inside hardware memory!");
        }

        const numOfChannels = sourceAudioBuffer.numberOfChannels;
        const totalSamples = sourceAudioBuffer.length;
        
        // 🚨 CHUNK ALLOCATION CONTROL matrix
        // Process audio in safe 15-second blocks to bypass WebAssembly memory caps
        const chunkSizeInSeconds = 15;
        const chunkSize = sampleRate * chunkSizeInSeconds;
        
        printLabLog(`✂️ Memory Protection Engine: Slicing track into ${Math.ceil(totalSamples / chunkSize)} execution intervals...`);

        // Initialize empty master output tracks inside mixing deck memory
        const stemNames = ['drums', 'bass', 'other', 'vocals'];
        const stemFloats = {
            drums: new Float32Array(2 * totalSamples),
            bass: new Float32Array(2 * totalSamples),
            other: new Float32Array(2 * totalSamples),
            vocals: new Float32Array(2 * totalSamples)
        };

        const leftData = sourceAudioBuffer.getChannelData(0);
        const rightData = numOfChannels === 2 ? sourceAudioBuffer.getChannelData(1) : leftData;

        // 2. Continuous Step Processing Loop over the audio timeline
        for (let offset = 0; offset < totalSamples; offset += chunkSize) {
            const currentChunkSize = Math.min(chunkSize, totalSamples - offset);
            printLabLog(`-> Processing Frame Matrix Segment: ${((offset / totalSamples) * 100).toFixed(0)}%`);

            // Extract raw chunk sample vectors cleanly
            const chunkLeft = leftData.subarray(offset, offset + currentChunkSize);
            const chunkRight = rightData.subarray(offset, offset + currentChunkSize);

            // Flatten block to match model specifications
            const flattenedChunk = new Float32Array(2 * currentChunkSize);
            flattenedChunk.set(chunkLeft, 0);
            flattenedChunk.set(chunkRight, currentChunkSize);

            // Create temporary light input tensor object container
            const inputTensor = new ort.Tensor('float32', flattenedChunk, [1, 2, currentChunkSize]);

            // Execute local tensor calculations via WebGPU layers
            const inferenceOutputs = await ortSession.run({ mix: inputTensor });
            const outputTensor = inferenceOutputs.stems || inferenceOutputs.output;
            const outputFloatArray = outputTensor.data;

            // Recombine the resulting data channels back into master arrays
            for (let i = 0; i < 4; i++) {
                const name = stemNames[i];
                const stemOffset = i * 2 * currentChunkSize;

                // Extract left/right channels for this chunk segment
                const chunkStemLeft = outputFloatArray.subarray(stemOffset, stemOffset + currentChunkSize);
                const chunkStemRight = outputFloatArray.subarray(stemOffset + currentChunkSize, stemOffset + (2 * currentChunkSize));

                // Append data cleanly back onto the master track timelines
                stemFloats[name].set(chunkStemLeft, offset);
                stemFloats[name].set(chunkStemRight, totalSamples + offset);
            }
        }

        printLabLog("✅ All matrix slices processed successfully! Packing into mixing deck strips...");

        // 3. Construct 4 final physical AudioBuffers and assign directly to console sliders
        for (let i = 0; i < 4; i++) {
            const name = stemNames[i];
            const stemBuffer = audioCtx.createBuffer(2, totalSamples, sampleRate);
            
            stemBuffer.getChannelData(0).set(stemFloats[name].subarray(0, totalSamples));
            stemBuffer.getChannelData(1).set(stemFloats[name].subarray(totalSamples, 2 * totalSamples));

            stemAudioBuffers[name] = stemBuffer;
            printLabLog(`-> Track Strip Active: [ ${name.toUpperCase()} ]`);
        }

        printLabLog("🏆 Local Separation Complete! 4 true multi-track stems are now hot on the mixing console layout rows.");
        return true;

    } catch (error) {
        isModelLoading = false;
        printLabLog(`❌ Critical AI Engine Exception Breakdown: ${error.message}`, true);
        console.error("AI Separation Breakdown Details:", error);
        alert("⚠️ Separation Execution Failed. Check terminal logs for parameters.");
        return false;
    }
};

