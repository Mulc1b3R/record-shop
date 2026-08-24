let globalShoppingBasket = [];
let activeRecordInModal = null;

function openCheckoutModal(record) {
    activeRecordInModal = record;
    
    document.getElementById('modal-record-id').value = record.id;
    document.getElementById('modal-record-title').value = record.title;
    
    document.getElementById('modal-item-details').innerHTML = `
        <strong>Ref Token:</strong> <span style="color:var(--accent)">${record.id}</span><br>
        <strong>Item Name:</strong> ${record.title}<br>
        <strong>Archive Platform:</strong> ${(record.source_platform || "local").toUpperCase()}
    `;
    
    const wavPrice = parseFloat(record.pricing.wav_digital_download || 2.50).toFixed(2);
    const cdPrice = parseFloat(record.pricing.physical_cd_single_post || 2.50).toFixed(2);
    
    document.getElementById('price-wav').innerText = `£${wavPrice}`;
    document.getElementById('price-cd').innerText = `£${cdPrice}`;
    
    document.getElementById('checkout-modal').style.display = 'flex';
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
    document.getElementById('checkout-form').reset();
    activeRecordInModal = null;
}

function addTrackToShoppingBasket(event) {
    if (event) event.preventDefault();
    
    if (!activeRecordInModal) {
        alert("❌ Layout Error: No active record block detected in system memory.");
        return;
    }
    
    const chosenFormat = document.querySelector('input[name="format-choice"]:checked').value;
    
    let finalCalculatedCost = "2.50";
    if (chosenFormat === "WAV Master") {
        finalCalculatedCost = activeRecordInModal.pricing.wav_digital_download || "2.50";
    } else {
        finalCalculatedCost = activeRecordInModal.pricing.physical_cd_single_post || "2.50";
    }
    
    const isDuplicate = globalShoppingBasket.some(item => 
        item.recordId === activeRecordInModal.id && item.format === chosenFormat
    );
    
    if (isDuplicate) {
        alert(`💡 Note: ${activeRecordInModal.id} (${chosenFormat}) is already loaded into your shopping cart.`);
        closeCheckoutModal();
        return;
    }
    
    const basketPayloadItem = {
        recordId: activeRecordInModal.id,
        recordTitle: activeRecordInModal.title,
        format: chosenFormat,
        price: parseFloat(finalCalculatedCost).toFixed(2),
        source_platform: activeRecordInModal.source_platform
    };
    
    globalShoppingBasket.push(basketPayloadItem);
    synchronizeBasketUI();
    
    alert(`🛒 Added to Basket!\n\n"${activeRecordInModal.title}"\nTier: ${chosenFormat}\nCost: £${parseFloat(finalCalculatedCost).toFixed(2)}\n\nYour session tracker has locked this record. Continue crate-digging!`);
    closeCheckoutModal();
}

function synchronizeBasketUI() {
    let aggregateTotalCost = 0.00;
    
    globalShoppingBasket.forEach(item => {
        aggregateTotalCost += parseFloat(item.price);
    });
    
    const badgeElement = document.getElementById('sidebar-basket-counter');
    if (badgeElement) {
        badgeElement.innerText = `🛒 Basket (${globalShoppingBasket.length} Tracks) — £${aggregateTotalCost.toFixed(2)}`;
    }

    // 🚀 INTEGRATED LIVE TELEMETRY HOOK
    // Instantly fires the audit sweep whenever the layout UI refreshes
    synchronizeSidebarBasketAuditTelemetry();
}

function processMasterBasketStripeCheckout() {
    if (globalShoppingBasket.length === 0) {
        alert("🛒 Your shopping basket is currently empty! Drop the needle on some records and add them to your cart first.");
        return;
    }
    
    let cumulativeSum = 0.00;
    globalShoppingBasket.forEach(item => cumulativeSum += parseFloat(item.price));
    
    const checkoutConfirmationText = `💳 Proceeding to Secure Stripe Till...\n\n` +
          `Total Curation Items: ${globalShoppingBasket.length}\n` +
          `Grand Total aggregate: £${cumulativeSum.toFixed(2)}\n\n` +
          `Press OK to compile your multi-track request and initialize the secure payment screen layout.`;
          
    if (confirm(checkoutConfirmationText)) {
        const targetActiveItem = globalShoppingBasket[0];
        
        localStorage.setItem('pending_checkout_track_id', targetActiveItem.recordId);
        localStorage.setItem('pending_checkout_format', targetActiveItem.format);
        localStorage.setItem('pending_checkout_file', `${targetActiveItem.recordTitle}.mp3`);
        
        alert(`🛰️ Stripe Handshake Initialized!\n\nStashing token data for: ${targetActiveItem.recordId}. Redirecting to secure gateway...`);
        window.location.href = "https://buy.stripe.com/test_14AcN5fytfB31PC4CjcbC01";
    }
}

function clearShoppingBasket() {
    if (globalShoppingBasket.length === 0) return;
    if (confirm("Are you sure you want to empty your current shopping basket?")) {
        globalShoppingBasket = [];
        synchronizeBasketUI();
        alert("🛒 Basket cleared.");
    }
}

/**
 * 🎛️ SIDEBAR AUDIT METRICS LOGIC CORE
 */
function synchronizeSidebarBasketAuditTelemetry() {
    const digitalCountNode = document.getElementById('sidebar-meta-basket-digital');
    const physicalCountNode = document.getElementById('sidebar-meta-basket-physical');
    const runningTotalNode = document.getElementById('sidebar-meta-basket-total');

    let digitalQuantity = 0;
    let physicalQuantity = 0;
    let runningPenceTotal = 0;

    globalShoppingBasket.forEach(item => {
        runningPenceTotal += Math.round(parseFloat(item.price) * 100);

        if (item.format === "WAV Master") {
            digitalQuantity++;
        } else {
            physicalQuantity++;
        }
    });

    if (digitalCountNode) digitalCountNode.innerText = digitalQuantity;
    if (physicalCountNode) physicalCountNode.innerText = physicalQuantity;
    if (runningTotalNode) {
        runningTotalNode.innerText = `£${(runningPenceTotal / 100).toFixed(2)}`;
    }
}
