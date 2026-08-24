window.onclick = function(event) {
        const modal = document.getElementById('checkout-modal');
        if (event.target === modal) { closeCheckoutModal(); }
    }

    function filterCatalogCards() {
        const searchInputValue = document.getElementById('catalog-search').value.toLowerCase().trim();
        const cards = document.querySelectorAll('.record-card');
        
        loadedRecordsCache.forEach((record, index) => {
            const targetCardElement = cards[index];
            if (!targetCardElement) return;

            const matchTitle = (record.title || "").toLowerCase();
            const matchArtist = (record.artist || "").toLowerCase();
            const matchId = (record.id || "").toLowerCase();
            const matchYear = (record.year || "").toLowerCase();
            const matchTags = record.tags ? record.tags.join(" ").toLowerCase() : "";

            if (
                matchTitle.includes(searchInputValue) || 
                matchArtist.includes(searchInputValue) || 
                matchId.includes(searchInputValue) || 
                matchYear.includes(searchInputValue) ||
                matchTags.includes(searchInputValue)
            ) {
                targetCardElement.style.display = "flex";
            } else {
                targetCardElement.style.display = "none";
            }
        });
    }