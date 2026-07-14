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

    // Filter DOM Elements
    const genderPills = document.querySelectorAll(".gender-pill");
    const brandSelect = document.getElementById("brand-select");
    const priceSlider = document.getElementById("price-slider");
    const priceSliderVal = document.getElementById("price-slider-val");
    const resetFiltersBtn = document.getElementById("reset-filters-btn");

    // State Variables
    let selectedProductId = null;
    let currentFilters = {
        gender: "",
        brand: "",
        maxPrice: 200
    };
    let minPriceLimit = 15;
    let maxPriceLimit = 200;

    // LocalStorage keys
    const HISTORY_KEY = "fashionfit_history";

    // Initialize Page
    loadFilterMetadata().then(() => {
        loadInitialProducts();
        loadHistory();
    });

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

    // Filter Event Listeners
    genderPills.forEach(pill => {
        pill.addEventListener("click", () => {
            genderPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            currentFilters.gender = pill.getAttribute("data-gender");
            triggerFilterChange();
        });
    });

    if (brandSelect) {
        brandSelect.addEventListener("change", (e) => {
            currentFilters.brand = e.target.value;
            triggerFilterChange();
        });
    }

    if (priceSlider) {
        priceSlider.addEventListener("input", (e) => {
            currentFilters.maxPrice = parseFloat(e.target.value);
            if (priceSliderVal) {
                priceSliderVal.textContent = `$${currentFilters.maxPrice.toFixed(0)}`;
            }
        });
        priceSlider.addEventListener("change", () => {
            triggerFilterChange();
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener("click", () => {
            currentFilters.gender = "";
            currentFilters.brand = "";
            currentFilters.maxPrice = maxPriceLimit;

            genderPills.forEach(p => {
                if (p.getAttribute("data-gender") === "") {
                    p.classList.add("active");
                } else {
                    p.classList.remove("active");
                }
            });

            if (brandSelect) brandSelect.value = "";
            if (priceSlider) {
                priceSlider.value = maxPriceLimit;
                if (priceSliderVal) priceSliderVal.textContent = `$${maxPriceLimit}`;
            }

            triggerFilterChange();
        });
    }

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

    // Fetch filter options and ranges
    async function loadFilterMetadata() {
        try {
            const response = await fetch("/api/filters");
            if (!response.ok) throw new Error("Failed to fetch filter metadata");
            const data = await response.json();
            
            if (brandSelect) {
                brandSelect.innerHTML = `<option value="">All Brands</option>`;
                data.brands.forEach(brand => {
                    const option = document.createElement("option");
                    option.value = brand;
                    option.textContent = toTitleCase(brand);
                    brandSelect.appendChild(option);
                });
            }
            
            if (priceSlider) {
                priceSlider.min = Math.floor(data.min_price);
                priceSlider.max = Math.ceil(data.max_price);
                priceSlider.value = Math.ceil(data.max_price);
                minPriceLimit = Math.floor(data.min_price);
                maxPriceLimit = Math.ceil(data.max_price);
                currentFilters.maxPrice = maxPriceLimit;
                
                if (priceSliderVal) {
                    priceSliderVal.textContent = `$${maxPriceLimit}`;
                }
            }
        } catch (error) {
            console.error("Error loading filter metadata:", error);
        }
    }

    // Trigger update on filter changes
    function triggerFilterChange() {
        const query = searchInput.value.trim();
        if (query) {
            performSearch();
        } else {
            loadInitialProducts();
        }
    }

    // Load initial products (trending)
    async function loadInitialProducts() {
        showShimmer();
        try {
            let url = `/api/products?limit=24`;
            if (currentFilters.gender) url += `&gender=${encodeURIComponent(currentFilters.gender)}`;
            if (currentFilters.brand) url += `&brand=${encodeURIComponent(currentFilters.brand)}`;
            if (currentFilters.maxPrice) url += `&max_price=${currentFilters.maxPrice}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch initial products");
            const products = await response.json();
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
            let url = `/api/search?q=${encodeURIComponent(query)}`;
            if (currentFilters.gender) url += `&gender=${encodeURIComponent(currentFilters.gender)}`;
            if (currentFilters.brand) url += `&brand=${encodeURIComponent(currentFilters.brand)}`;
            if (currentFilters.maxPrice) url += `&max_price=${currentFilters.maxPrice}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Search query failed");
            const products = await response.json();
            
            resultsTitle.textContent = `Search Results for "${query}"`;
            resultsCount.textContent = `${products.length} match${products.length !== 1 ? 'es' : ''} found`;
            
            if (products.length === 0) {
                productsGrid.innerHTML = `
                    <div class="no-results">
                        <i class="fa-solid fa-shirt no-results-icon"></i>
                        <p class="no-results-text">No fashion products match your search. Try adjusting your filters or search term.</p>
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
            const cleanPrice = product.price ? `$${product.price.toFixed(2)}` : "$29.99";
            
            let similarityBadgeHtml = "";
            if (product.score !== undefined && product.score > 0) {
                const percentage = Math.round(product.score * 100);
                similarityBadgeHtml = `<div class="similarity-badge"><i class="fa-solid fa-bolt"></i> ${percentage}% Match</div>`;
            }
            
            card.innerHTML = `
                <div class="product-image-container">
                    <img class="product-image" src="/images/${product.id}.jpg" alt="${displayTitle}" loading="lazy" onerror="this.onerror=null; this.src='${getPlaceholderImage(product.articleType)}';">
                    ${similarityBadgeHtml}
                </div>
                <div class="product-info">
                    <span class="product-brand">${brandName}</span>
                    <h3 class="product-title" title="${displayTitle}">${displayTitle}</h3>
                    <div class="product-meta">
                        <span class="product-type">${cleanCategory}</span>
                        <span class="product-price">${cleanPrice}</span>
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
            const cleanPrice = product.price ? `$${product.price.toFixed(2)}` : "$29.99";
            
            // Add to history
            addToHistory(product);

            selectedDetailsContainer.innerHTML = `
                <div class="selected-product-card">
                    <div class="selected-img-container">
                        <img style="width:100%; height:100%; object-fit:cover;" src="/images/${product.id}.jpg" alt="${displayTitle}" onerror="this.onerror=null; this.src='${getPlaceholderImage(product.articleType)}';">
                    </div>
                    <div class="selected-details">
                        <h4 class="selected-title">${displayTitle}</h4>
                        <div class="selected-meta-pills">
                            <span class="pill pill-brand">${brandName}</span>
                            <span class="pill pill-price">${cleanPrice}</span>
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
            const recPrice = rec.price ? `$${rec.price.toFixed(2)}` : "$29.99";
            
            let similarityBadgeHtml = "";
            if (rec.score !== undefined && rec.score > 0) {
                const percentage = Math.round(rec.score * 100);
                similarityBadgeHtml = `<span class="rec-score-badge"><i class="fa-solid fa-bolt"></i> ${percentage}% Match</span>`;
            }
            
            card.innerHTML = `
                <div class="rec-img-container">
                    <img style="width:100%; height:100%; object-fit:cover;" src="/images/${rec.id}.jpg" alt="${displayTitle}" onerror="this.onerror=null; this.src='${getPlaceholderImage(rec.articleType)}';">
                </div>
                <div class="rec-details">
                    <div class="rec-top-row">
                        <span class="rec-brand">${brandName}</span>
                        ${similarityBadgeHtml}
                    </div>
                    <h4 class="rec-title" title="${displayTitle}">${displayTitle}</h4>
                    <div class="rec-bottom-row">
                        <span class="rec-category">${cleanType}</span>
                        <span class="rec-price">${recPrice}</span>
                    </div>
                </div>
            `;
            
            card.addEventListener("click", () => {
                selectProduct(rec.id);
                sidebar.scrollIntoView({ behavior: 'smooth' });
            });
            recommendationsList.appendChild(card);
        });
    }

    // Recommendation History / Browsing History helpers
    function addToHistory(product) {
        if (!product) return;
        
        let history = getHistory();
        history = history.filter(item => item.id !== product.id);
        
        history.unshift({
            id: product.id,
            productDisplayName: product.productDisplayName,
            brand: product.brand,
            articleType: product.articleType,
            price: product.price
        });
        
        if (history.length > 8) {
            history.pop();
        }
        
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistory();
    }

    function getHistory() {
        const data = localStorage.getItem(HISTORY_KEY);
        try {
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Error reading history:", e);
            return [];
        }
    }

    function loadHistory() {
        renderHistory();
        
        const clearBtn = document.getElementById("clear-history-btn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                localStorage.removeItem(HISTORY_KEY);
                renderHistory();
            });
        }
    }

    function renderHistory() {
        const historySection = document.getElementById("history-section");
        const historyGrid = document.getElementById("history-grid");
        
        if (!historySection || !historyGrid) return;
        
        const history = getHistory();
        
        if (history.length === 0) {
            historySection.classList.add("hidden");
            historyGrid.innerHTML = "";
            return;
        }
        
        historySection.classList.remove("hidden");
        historyGrid.innerHTML = "";
        
        history.forEach(item => {
            const card = document.createElement("div");
            card.className = "history-card";
            
            const displayTitle = toTitleCase(item.productDisplayName);
            const brandName = toTitleCase(item.brand || "Fashion Brand");
            const priceVal = item.price ? `$${item.price.toFixed(2)}` : "$29.99";
            
            card.innerHTML = `
                <div class="history-img-container">
                    <img class="history-img" src="/images/${item.id}.jpg" alt="${displayTitle}" onerror="this.onerror=null; this.src='${getPlaceholderImage(item.articleType)}';">
                </div>
                <div class="history-info">
                    <span class="history-brand">${brandName}</span>
                    <h4 class="history-title" title="${displayTitle}">${displayTitle}</h4>
                    <span class="history-price">${priceVal}</span>
                </div>
            `;
            
            card.addEventListener("click", () => {
                selectProduct(item.id);
                sidebar.scrollIntoView({ behavior: 'smooth' });
            });
            
            historyGrid.appendChild(card);
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
