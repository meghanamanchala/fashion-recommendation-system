document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const productsGrid = document.getElementById("products-grid");
    const resultsTitle = document.getElementById("results-title");
    const resultsCount = document.getElementById("results-count");
    const sidebar = document.getElementById("recommendations-sidebar");
    const closeSidebarBtn = document.getElementById("close-sidebar");
    const selectedDetailsContainer = document.getElementById("selected-product-details");
    const recommendationsList = document.getElementById("recommendations-list");
    const quickTags = document.querySelectorAll(".tag-btn");

    // State Variables
    let selectedProductId = null;

    // Initialize Page
    loadInitialProducts();

    // Event Listeners
    searchBtn.addEventListener("click", performSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            performSearch();
        }
    });

    closeSidebarBtn.addEventListener("click", () => {
        sidebar.classList.add("hidden");
    });

    // Quick tag search trigger
    quickTags.forEach(tag => {
        tag.addEventListener("click", () => {
            const query = tag.getAttribute("data-query");
            searchInput.value = query;
            performSearch();
        });
    });

    // FUNCTIONS

    // Helper: format string to title case
    function toTitleCase(str) {
        if (!str) return "";
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    // Helper: return placeholder image URL if not found
    function getPlaceholderImage(articleType) {
        return `https://placehold.co/300x400/111827/94a3b8?text=${encodeURIComponent(articleType)}`;
    }

    // Load initial products (trending)
    async function loadInitialProducts() {
        showShimmer();
        try {
            const response = await fetch("/api/products?limit=24");
            if (!response.ok) throw new Error("Failed to fetch initial products");
            const products = await response.ok ? await response.json() : [];
            resultsTitle.textContent = "Trending Styles";
            resultsCount.textContent = `Showing ${products.length} items`;
            renderProductGrid(products);
        } catch (error) {
            console.error("Error loading products:", error);
            productsGrid.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Error loading catalog. Please try again.</div>`;
        }
    }

    // Perform Search
    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            loadInitialProducts();
            return;
        }

        showShimmer();
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error("Search query failed");
            const products = await response.json();
            
            resultsTitle.textContent = `Search Results for "${query}"`;
            resultsCount.textContent = `${products.length} match${products.length !== 1 ? 'es' : ''} found`;
            
            if (products.length === 0) {
                productsGrid.innerHTML = `
                    <div class="no-results">
                        <i class="fa-solid fa-shirt no-results-icon"></i>
                        <p class="no-results-text">No fashion products match your search. Try searching brands like "Nike", categories like "Shirts", or colors like "Red".</p>
                    </div>
                `;
            } else {
                renderProductGrid(products);
            }
        } catch (error) {
            console.error("Error performing search:", error);
            productsGrid.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Search error. Please try again.</div>`;
        }
    }

    // Render products list in the main grid
    function renderProductGrid(products) {
        productsGrid.innerHTML = "";
        products.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card";
            card.dataset.id = product.id;
            
            const displayTitle = toTitleCase(product.productDisplayName);
            const brandName = toTitleCase(product.brand || "Fashion Brand");
            const cleanCategory = toTitleCase(product.articleType);
            const cleanGender = toTitleCase(product.gender);
            
            card.innerHTML = `
                <div class="product-image-container">
                    <img class="product-image" src="/images/${product.id}.jpg" alt="${displayTitle}" loading="lazy" onerror="this.onerror=null; this.src='${getPlaceholderImage(product.articleType)}';">
                </div>
                <div class="product-info">
                    <span class="product-brand">${brandName}</span>
                    <h3 class="product-title" title="${displayTitle}">${displayTitle}</h3>
                    <div class="product-meta">
                        <span class="product-type">${cleanCategory}</span>
                        <span class="product-gender">${cleanGender}</span>
                    </div>
                </div>
            `;
            
            card.addEventListener("click", () => selectProduct(product.id));
            productsGrid.appendChild(card);
        });
    }

    // Select Product & fetch recommendations
    async function selectProduct(productId) {
        selectedProductId = productId;
        
        // Show loading in recommendations list
        recommendationsList.innerHTML = `
            <div class="shimmer-wrapper">
                <div style="height: 60px;" class="shimmer-card"></div>
                <div style="height: 60px;" class="shimmer-card"></div>
                <div style="height: 60px;" class="shimmer-card"></div>
            </div>
        `;
        
        // Show sidebar
        sidebar.classList.remove("hidden");
        
        try {
            // 1. Fetch Product details
            const pResponse = await fetch(`/api/product/${productId}`);
            if (!pResponse.ok) throw new Error("Failed to load product details");
            const product = await pResponse.json();
            
            // Render selected product details
            const displayTitle = toTitleCase(product.productDisplayName);
            const brandName = toTitleCase(product.brand || "Fashion Brand");
            const cleanGender = toTitleCase(product.gender);
            const cleanType = toTitleCase(product.articleType);
            const cleanColor = toTitleCase(product.baseColour);
            const cleanSeason = toTitleCase(product.season);
            const cleanUsage = toTitleCase(product.usage);
            
            selectedDetailsContainer.innerHTML = `
                <div class="selected-product-card">
                    <div class="selected-img-container">
                        <img style="width:100%; height:100%; object-fit:cover;" src="/images/${product.id}.jpg" alt="${displayTitle}" onerror="this.onerror=null; this.src='${getPlaceholderImage(product.articleType)}';">
                    </div>
                    <div class="selected-details">
                        <h4 class="selected-title">${displayTitle}</h4>
                        <div class="selected-meta-pills">
                            <span class="pill pill-brand">${brandName}</span>
                            <span class="pill">${cleanGender}</span>
                            <span class="pill">${cleanType}</span>
                            <span class="pill">${cleanColor}</span>
                            <span class="pill">${cleanSeason}</span>
                            <span class="pill">${cleanUsage}</span>
                        </div>
                    </div>
                </div>
            `;
            
            // 2. Fetch recommendations
            const rResponse = await fetch(`/api/recommend/${productId}`);
            if (!rResponse.ok) throw new Error("Failed to load recommendations");
            const recs = await rResponse.json();
            
            renderRecommendations(recs);
        } catch (error) {
            console.error("Error loading selected product recommendations:", error);
            recommendationsList.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Error loading recommendations.</div>`;
        }
    }

    // Render similar styles recommendations list
    function renderRecommendations(recs) {
        recommendationsList.innerHTML = "";
        
        if (recs.length === 0) {
            recommendationsList.innerHTML = `<p class="no-results-text" style="font-size:0.85rem;">No recommendation matching this item.</p>`;
            return;
        }
        
        recs.forEach(rec => {
            const card = document.createElement("div");
            card.className = "rec-card";
            
            const displayTitle = toTitleCase(rec.productDisplayName);
            const brandName = toTitleCase(rec.brand || "Fashion Brand");
            const cleanType = toTitleCase(rec.articleType);
            
            card.innerHTML = `
                <div class="rec-img-container">
                    <img style="width:100%; height:100%; object-fit:cover;" src="/images/${rec.id}.jpg" alt="${displayTitle}" onerror="this.onerror=null; this.src='${getPlaceholderImage(rec.articleType)}';">
                </div>
                <div class="rec-details">
                    <span class="rec-brand">${brandName}</span>
                    <h4 class="rec-title" title="${displayTitle}">${displayTitle}</h4>
                    <span class="rec-category">${cleanType}</span>
                </div>
            `;
            
            card.addEventListener("click", () => {
                selectProduct(rec.id);
                // Scroll page sidebar sticky top
                sidebar.scrollIntoView({ behavior: 'smooth' });
            });
            recommendationsList.appendChild(card);
        });
    }

    // Show Shimmer cards during loading
    function showShimmer() {
        productsGrid.innerHTML = `
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
            <div class="shimmer-card"></div>
        `;
    }
});
