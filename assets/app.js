// Global state and utilities
window.__catalog = null;
window.__selectedProduct = null;

// Pricing logic based on seating capacity
function determineSeatingCapacity(modelName) {
    if (!modelName) return 5; // default
    
    // Look for explicit seat numbers
    const seatPatterns = [
        /(\d+)\s+locuri/,  // "5 locuri", "7 locuri", etc.
        /\((\d+)\s+locuri\)/,  // "(5 locuri)"
        /(\d+)–(\d+)\s+locuri/,  // "8–11 locuri"
    ];
    
    for (const pattern of seatPatterns) {
        const match = modelName.match(pattern);
        if (match) {
            if (pattern.source === '(\\d+)–(\\d+)\\s+locuri') {
                // For ranges like "8–11 locuri", take the higher number
                return parseInt(match[2]);
            } else {
                return parseInt(match[1]);
            }
        }
    }
    
    // Look for door indicators (2 doors usually = 2 seats, 3 doors = 4-5 seats, etc.)
    if (modelName.includes("2 uși") || modelName.includes("Coupe 2 uși")) {
        return 2;  // Sports cars, coupes
    }
    
    // Special cases - commercial vehicles that typically have more seats
    const commercialKeywords = [
        "Sprinter", "Transit", "Ducato", "Master", "Crafter", "Vito", "Viano", 
        "Multivan", "Caravelle", "Transporter", "ProMaster", "Daily",
        "minivan", "monovolum", "Grand", "Traveller", "SpaceTourer", "Zafira Life"
    ];
    
    for (const keyword of commercialKeywords) {
        if (modelName.includes(keyword)) {
            return 7;  // These are likely 7+ seaters unless otherwise specified
        }
    }
    
    // Look for family/large car indicators
    const familyKeywords = ["Grand", "XL", "Plus", "Max", "Maxi"];
    for (const keyword of familyKeywords) {
        if (modelName.includes(keyword)) {
            return 7;
        }
    }
    
    // Default assumption for most cars (sedans, hatchbacks, SUVs)
    return 5;
}

function calculatePriceForSeats(seatCount, isRomb = false) {
    const basePriceRomb = 4300;
    const basePriceRegular = 4200;
    
    if (seatCount === 2) {
        return 2200;
    } else if (seatCount === 3) {
        return 3000;
    } else if (seatCount === 4 || seatCount === 5) {
        return isRomb ? basePriceRomb : basePriceRegular;
    } else if (seatCount >= 7) {
        return "Solicita pret";
    } else {
        return isRomb ? basePriceRomb : basePriceRegular;
    }
}

function getAdjustedPrice(product, selectedModel = "") {
    const seatCount = determineSeatingCapacity(selectedModel);
    const isRomb = product.title && product.title.toLowerCase().includes("romb");
    const calculatedPrice = calculatePriceForSeats(seatCount, isRomb);
    
    return calculatedPrice;
}

// Utility functions
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-lg transition-all transform translate-x-full opacity-0 max-w-sm ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 2500);
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        brand: params.get('brand'),
        model: params.get('model'),
        year: params.get('year')
    };
}

function setUrlParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key]) {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.replaceState({}, '', url);
}

function getSelected() {
    const urlParams = getUrlParams();
    const storage = {
        brand: JSON.parse(localStorage.getItem('selectedBrand') || 'null'),
        model: localStorage.getItem('selectedModel'),
        year: localStorage.getItem('selectedYear')
    };

    return {
        brand: urlParams.brand || (storage.brand ? storage.brand.name : null),
        model: urlParams.model || storage.model,
        year: urlParams.year || storage.year
    };
}

function setSelected(selections) {
    if (selections.brand) {
        const brand = window.__catalog?.brands.find(b => b.name === selections.brand || b.id === selections.brand);
        if (brand) {
            localStorage.setItem('selectedBrand', JSON.stringify({ id: brand.id, name: brand.name }));
        }
    }
    if (selections.model) {
        localStorage.setItem('selectedModel', selections.model);
    }
    if (selections.year) {
        localStorage.setItem('selectedYear', selections.year);
    }
}

async function loadCatalog() {
    if (window.__catalog) return window.__catalog;
    
    try {
        // Try relative path first (works for GitHub Pages)
        const response = await fetch('assets/catalog.json');
        if (!response.ok) {
            // Fallback with dot prefix
            const response2 = await fetch('./assets/catalog.json');
            window.__catalog = await response2.json();
        } else {
            window.__catalog = await response.json();
        }
        return window.__catalog;
    } catch (error) {
        console.error('Failed to load catalog:', error);
        return null;
    }
}

function createBrandLogo(brand) {
    // Check if brand has logo
    if (!brand.logo) {
        console.warn('No logo defined for brand:', brand.name);
        return createFallbackLogo(brand);
    }
    
    const img = document.createElement('img');
    img.src = brand.logo;
    img.alt = brand.name;
    img.style.width = '70%';     // Make image smaller to fit inside circle
    img.style.height = '70%';    // Make image smaller to fit inside circle
    img.style.objectFit = 'contain';
    img.style.backgroundColor = 'white';
    img.style.position = 'absolute';
    img.style.top = '50%';
    img.style.left = '50%';
    img.style.transform = 'translate(-50%, -50%)';  // Center the smaller image
    img.style.padding = '8px';
    
    // Add loading debugging
    img.onload = function() {
        console.log('✅ Logo loaded:', brand.name, brand.logo);
    };
    
    // Fallback to generated SVG if image fails to load
    img.onerror = function() {
        console.error('❌ Failed to load logo:', brand.name, brand.logo);
        console.log('Attempting fallback for:', brand.name);
        const fallbackSvg = createFallbackLogo(brand);
        if (this.parentNode) {
            this.parentNode.replaceChild(fallbackSvg, this);
        }
    };
    
    return img;
}

function createFallbackLogo(brand) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '20');
    circle.setAttribute('cy', '20');
    circle.setAttribute('r', '18');
    circle.setAttribute('fill', '#F7941E');
    circle.setAttribute('stroke', '#e5e7eb');
    circle.setAttribute('stroke-width', '1');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '20');
    text.setAttribute('y', '26');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-family', 'Bricolage Grotesque, system-ui, sans-serif');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-size', '14');
    text.textContent = brand.name.charAt(0).toUpperCase();

    svg.appendChild(circle);
    svg.appendChild(text);

    return svg;
}

function createProductImage() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 250');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('class', 'text-slate-300');

    // Car seat silhouette
    const seatPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    seatPath.setAttribute('fill', 'currentColor');
    seatPath.setAttribute('d', 'M50 50 Q30 50 30 70 L30 180 Q30 200 50 200 L150 200 Q170 200 170 180 L170 70 Q170 50 150 50 L50 50 Z M60 80 Q50 80 50 90 L50 140 Q50 150 60 150 L140 150 Q150 150 150 140 L150 90 Q150 80 140 80 L60 80 Z M70 170 Q60 170 60 180 Q60 190 70 190 L130 190 Q140 190 140 180 Q140 170 130 170 L70 170 Z');

    svg.appendChild(seatPath);
    return svg;
}

function animateCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    
    if (counters.length === 0) return;
    
    // Create intersection observer to trigger animation on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.dataset.counter);
                const duration = 2000; // 2 seconds for better effect
                const increment = target / (duration / 16); // 60fps
                let current = 0;
                
                // Prevent re-animation
                if (counter.classList.contains('animated')) return;
                counter.classList.add('animated');

                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    
                    // Format the number based on the target value
                    const currentVal = Math.floor(current);
                    if (target === 1500) {
                        // Display as 1.5k format
                        if (currentVal >= 1000) {
                            counter.textContent = (currentVal / 1000).toFixed(1) + 'k';
                        } else {
                            counter.textContent = currentVal;
                        }
                    } else if (target === 5) {
                        // Display with + suffix
                        counter.textContent = currentVal + '+';
                    } else {
                        // Display with + suffix for others
                        counter.textContent = currentVal + '+';
                    }
                }, 16);
                
                // Unobserve after animation starts
                observer.unobserve(counter);
            }
        });
    }, {
        threshold: 0.5, // Trigger when 50% of element is visible
        rootMargin: '0px 0px -100px 0px' // Trigger a bit before element is fully visible
    });
    
    // Observe all counter elements
    counters.forEach(counter => {
        observer.observe(counter);
    });
}

// Phone validation
function validatePhone(phone) {
    const phoneRegex = /^[+0-9]{6,15}$/;
    return phoneRegex.test(phone);
}

function showPhoneError(show = true) {
    const phoneError = document.getElementById('phoneError');
    if (phoneError) {
        phoneError.classList.toggle('hidden', !show);
    }
}

// Order management
function buildMessage(order) {
    const phone = order.phone || '-';
    return `Comanda huse auto
Brand: ${order.brand}
Model: ${order.model}
Produs: ${order.productTitle} - ${order.productCode}
Culoare: ${order.color}
Pret: ${order.price} MDL
Telefon client: ${phone}`;
}

function saveOrder(order) {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push({
        ...order,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.setItem('lastOrder', JSON.stringify(order));
}

function openWhatsApp(order) {
    const message = buildMessage(order);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/37360607028?text=${encodedMessage}`;
    window.open(url, '_blank');
}


// Homepage functions
let showAllBrands = false;

function renderBrandGrid() {
    const brandGrid = document.getElementById('brandGrid');
    const showMoreBtn = document.getElementById('showMoreBrands');
    
    if (!brandGrid) {
        console.error('Brand grid element not found');
        return;
    }
    
    if (!window.__catalog) {
        console.error('Catalog not loaded');
        return;
    }

    const brandsToShow = showAllBrands ? window.__catalog.brands : window.__catalog.brands.slice(0, 10);
    console.log('Rendering', brandsToShow.length, 'of', window.__catalog.brands.length, 'brands');
    
    brandGrid.innerHTML = '';
    
    brandsToShow.forEach(brand => {
        const brandCard = document.createElement('div');
        brandCard.className = 'w-24 h-24 md:w-40 md:h-40 lg:w-44 lg:h-44 bg-white rounded-full shadow-md flex items-center justify-center hover:ring-2 ring-[#F7941E] cursor-pointer transition-all transform hover:scale-105';
        
        const logo = createBrandLogo(brand);
        brandCard.appendChild(logo);
        
        brandCard.addEventListener('click', () => {
            setSelected({ brand: brand.name });
            window.location.href = `brand.html?brand=${encodeURIComponent(brand.name)}`;
        });
        
        brandGrid.appendChild(brandCard);
    });
    
    // Update show more button
    if (showMoreBtn) {
        if (showAllBrands || window.__catalog.brands.length <= 10) {
            showMoreBtn.style.display = 'none';
        } else {
            showMoreBtn.style.display = 'inline-flex';
            showMoreBtn.textContent = 'Vezi mai multe mărci';
        }
    }
    
    console.log('Brand grid rendered successfully');
}

// Brand page functions
function initBrandPage() {
    const params = getUrlParams();
    const selectedBrand = params.brand;
    
    if (!selectedBrand || !window.__catalog) {
        window.location.href = 'index.html';
        return;
    }

    const brand = window.__catalog.brands.find(b => b.name === selectedBrand);
    if (!brand) {
        window.location.href = 'index.html';
        return;
    }

    // Update brand display
    const brandLogo = document.getElementById('brandLogo');
    const brandName = document.getElementById('brandName');
    
    if (brandLogo) {
        brandLogo.innerHTML = '';
        brandLogo.appendChild(createBrandLogo(brand));
    }
    
    if (brandName) {
        brandName.textContent = brand.name;
    }

    // Populate selects
    const modelSelect = document.getElementById('modelSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (modelSelect) {
        modelSelect.innerHTML = '<option value="">Selectează modelul</option>';
        brand.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
        
        // Set selected value from URL or localStorage
        const selected = getSelected();
        if (selected.model && brand.models.find(m => m.name === selected.model)) {
            modelSelect.value = selected.model;
            populateYears(brand, selected.model);
        }
    }

    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            const selectedModel = e.target.value;
            setSelected({ model: selectedModel });
        });
    }

    // View products button
    const viewProductsBtn = document.getElementById('viewProductsBtn');
    if (viewProductsBtn) {
        viewProductsBtn.addEventListener('click', () => {
            const selected = getSelected();
            if (selected.brand && selected.model) {
                const url = `produse.html?brand=${encodeURIComponent(selected.brand)}&model=${encodeURIComponent(selected.model)}`;
                window.location.href = url;
            } else {
                showToast('Te rugăm să selectezi modelul', 'error');
            }
        });
    }
}

function populateYears(brand, modelName) {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect || !modelName) return;

    const model = brand.models.find(m => m.name === modelName);
    if (!model) return;

    yearSelect.innerHTML = '<option value="">Selectează anul</option>';
    
    // Parse year range (e.g., "2000-2025")
    let years = [];
    if (model.years && typeof model.years === 'string') {
        const yearRange = model.years.split('-');
        if (yearRange.length === 2) {
            const startYear = parseInt(yearRange[0]);
            const endYear = parseInt(yearRange[1]);
            for (let year = startYear; year <= endYear; year++) {
                years.push(year);
            }
        }
    }
    
    // Sort years in descending order
    const sortedYears = years.sort((a, b) => b - a);
    
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    // Set selected value from URL or localStorage
    const selected = getSelected();
    if (selected.year && years.includes(parseInt(selected.year))) {
        yearSelect.value = selected.year;
    }

    yearSelect.addEventListener('change', (e) => {
        setSelected({ year: e.target.value });
    });
}

// Products page functions
function initProductsPage() {
    const selected = getSelected();
    
    // Check if all required selections are made
    if (!selected.brand || !selected.model) {
        showMissingSelectionWarning();
        return;
    }

    const brand = window.__catalog?.brands.find(b => b.name === selected.brand);
    if (!brand) {
        showMissingSelectionWarning();
        return;
    }

    // Update brand display
    const brandLogo = document.getElementById('brandLogo');
    const brandName = document.getElementById('brandName');
    
    if (brandLogo) {
        brandLogo.innerHTML = '';
        brandLogo.appendChild(createBrandLogo(brand));
    }
    
    if (brandName) {
        brandName.textContent = brand.name;
    }

    // Populate filters
    populateProductFilters(brand, selected);
    
    // Render products immediately since no year selection is needed
    renderProductGroups();
    
    // Initialize order summary
    initOrderSummary();
}

function showMissingSelectionWarning() {
    const warning = document.getElementById('missingSelectionWarning');
    const container = document.getElementById('productContainer');
    
    if (warning) warning.classList.remove('hidden');
    if (container) container.innerHTML = '';
}

function populateProductFilters(brand, selected) {
    const modelSelect = document.getElementById('modelSelect');
    
    if (modelSelect) {
        modelSelect.innerHTML = '<option value="">Selectează modelul</option>';
        brand.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = model.name;
            if (model.name === selected.model) option.selected = true;
            modelSelect.appendChild(option);
        });
        
        modelSelect.addEventListener('change', (e) => {
            const newModel = e.target.value;
            setSelected({ model: newModel });
            setUrlParams({ model: newModel });
            
            // Re-render products when model changes
            if (newModel) {
                renderProductGroups();
            }
        });
    }
}


function renderProductGroups() {
    const container = document.getElementById('productContainer');
    const warning = document.getElementById('missingSelectionWarning');
    
    if (!container || !window.__catalog) return;
    
    // Hide warning if shown
    if (warning) warning.classList.add('hidden');
    
    container.innerHTML = '';
    
    window.__catalog.productGroups.forEach(group => {
        const products = window.__catalog.products.filter(p => p.groupId === group.id);
        if (products.length === 0) return;
        
        // Group section
        const groupSection = document.createElement('div');
        groupSection.className = 'mb-12';
        
        // Group title
        const title = document.createElement('h2');
        title.className = 'text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-4 md:mb-6 text-center';
        title.textContent = group.title;
        groupSection.appendChild(title);
        
        // Products grid
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 md:grid-cols-4 gap-6';
        
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'bg-white rounded-xl shadow p-4 text-center hover:shadow-lg transition-all cursor-pointer transform hover:scale-105';
            productCard.dataset.productId = product.id;
            
            // Product image
            const imageContainer = document.createElement('div');
            imageContainer.className = 'h-32 md:h-40 mb-3 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden';
            
            if (product.image && product.image.trim() !== '') {
                const productImage = document.createElement('img');
                productImage.src = product.image;
                productImage.alt = `${product.title} - ${product.color}`;
                productImage.className = 'w-full h-full object-contain rounded-lg';
                productImage.onerror = function() {
                    // Fallback to placeholder if image fails to load
                    this.style.display = 'none';
                    const placeholder = createProductImage();
                    imageContainer.appendChild(placeholder);
                };
                imageContainer.appendChild(productImage);
            } else {
                const placeholderImage = createProductImage();
                imageContainer.appendChild(placeholderImage);
            }
            
            // Product info
            const info = document.createElement('div');
            info.className = 'space-y-1';
            
            const color = document.createElement('div');
            color.className = 'text-xs md:text-sm text-slate-600';
            color.textContent = `Culoare: ${product.color}`;
            
            const code = document.createElement('div');
            code.className = 'text-xs md:text-sm font-medium text-slate-800';
            code.textContent = `Model: ${product.code}`;
            
            const title = document.createElement('div');
            title.className = 'text-xs md:text-sm text-slate-600';
            title.textContent = product.title;
            
            const price = document.createElement('div');
            price.className = 'text-lg md:text-xl font-bold text-[#F7941E]';
            const selected = getSelected();
            const adjustedPrice = getAdjustedPrice(product, selected.model);
            price.textContent = adjustedPrice === "Solicita pret" ? "Solicita pret" : `${adjustedPrice} MDL`;
            
            info.appendChild(color);
            info.appendChild(code);
            info.appendChild(title);
            info.appendChild(price);
            
            productCard.appendChild(imageContainer);
            productCard.appendChild(info);
            
            // Click handler
            productCard.addEventListener('click', () => {
                openProductModal(product);
            });
            
            grid.appendChild(productCard);
        });
        
        groupSection.appendChild(grid);
        container.appendChild(groupSection);
    });
}

function openProductModal(product) {
    // Store selected product
    window.__selectedProduct = product;
    
    // Update modal content
    updateModalContent(product);
    
    // Show modal
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function updateModalContent(product) {
    const selected = getSelected();
    
    // Update image
    const modalImage = document.getElementById('modalProductImage');
    if (modalImage) {
        if (product.image && product.image.trim() !== '') {
            modalImage.src = product.image;
            modalImage.alt = `${product.title} - ${product.color}`;
        } else {
            modalImage.src = 'assets/img/placeholder-product.png'; // Fallback image
            modalImage.alt = 'Product placeholder';
        }
    }
    
    // Update product details
    const elements = {
        modalProductTitle: document.getElementById('modalProductTitle'),
        modalProductColor: document.getElementById('modalProductColor'),
        modalProductPrice: document.getElementById('modalProductPrice'),
        modalSelectedBrand: document.getElementById('modalSelectedBrand'),
        modalSelectedModel: document.getElementById('modalSelectedModel'),
    };
    
    if (elements.modalProductTitle) elements.modalProductTitle.textContent = `${product.title} - ${product.code}`;
    if (elements.modalProductColor) elements.modalProductColor.textContent = product.color;
    const adjustedPrice = getAdjustedPrice(product, selected.model);
    if (elements.modalProductPrice) elements.modalProductPrice.textContent = adjustedPrice === "Solicita pret" ? "Solicita pret" : `${adjustedPrice} MDL`;
    if (elements.modalSelectedBrand) elements.modalSelectedBrand.textContent = selected.brand || '-';
    if (elements.modalSelectedModel) elements.modalSelectedModel.textContent = selected.model || '-';
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Clear phone input
    const phoneInput = document.getElementById('modalPhoneInput');
    if (phoneInput) {
        phoneInput.value = '';
    }
    
    // Hide phone error
    showModalPhoneError(false);
}

function updateOrderSummary(product) {
    const selected = getSelected();
    
    const elements = {
        selectedProductTitle: document.getElementById('selectedProductTitle'),
        selectedProductColor: document.getElementById('selectedProductColor'),
        selectedProductPrice: document.getElementById('selectedProductPrice'),
        selectedBrand: document.getElementById('selectedBrand'),
        selectedModel: document.getElementById('selectedModel'),
        selectedYear: document.getElementById('selectedYear')
    };
    
    if (elements.selectedProductTitle) elements.selectedProductTitle.textContent = `${product.title} - ${product.code}`;
    if (elements.selectedProductColor) elements.selectedProductColor.textContent = product.color;
    if (elements.selectedProductPrice) elements.selectedProductPrice.textContent = `${product.price} MDL`;
    if (elements.selectedBrand) elements.selectedBrand.textContent = selected.brand || '-';
    if (elements.selectedModel) elements.selectedModel.textContent = selected.model || '-';
    if (elements.selectedYear) elements.selectedYear.textContent = selected.year || '-';
}

function initOrderSummary() {
    // Initialize modal event listeners
    initModalEventListeners();
}

function initModalEventListeners() {
    // Close modal button
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeProductModal);
    }
    
    // Click outside modal to close
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeProductModal();
            }
        });
    }
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
        }
    });
    
    // Modal order button
    const modalOrderBtn = document.getElementById('modalOrderBtn');
    const modalPhoneInput = document.getElementById('modalPhoneInput');
    const modalWhatsappBtn = document.getElementById('modalWhatsappBtn');
    
    if (modalOrderBtn) {
        modalOrderBtn.addEventListener('click', () => {
            placeModalOrder();
        });
    }
    
    if (modalPhoneInput) {
        modalPhoneInput.addEventListener('input', () => {
            showModalPhoneError(false);
        });
    }
    
    if (modalWhatsappBtn) {
        modalWhatsappBtn.addEventListener('click', () => {
            if (window.__selectedProduct) {
                const order = buildModalOrderObject();
                openWhatsApp(order);
            }
        });
    }
}

function buildModalOrderObject() {
    const selected = getSelected();
    const phoneInput = document.getElementById('modalPhoneInput');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    
    return {
        brand: selected.brand,
        model: selected.model,
        productTitle: window.__selectedProduct.title,
        productCode: window.__selectedProduct.code,
        color: window.__selectedProduct.color,
        price: getAdjustedPrice(window.__selectedProduct, getSelected().model),
        phone: phone
    };
}

function placeModalOrder() {
    if (!window.__selectedProduct) {
        showToast('Te rugăm să selectezi un produs', 'error');
        return;
    }
    
    const phoneInput = document.getElementById('modalPhoneInput');
    if (!phoneInput) return;
    
    const phone = phoneInput.value.trim();
    
    if (!phone) {
        showToast('Te rugăm să introduci numărul de telefon', 'error');
        phoneInput.focus();
        return;
    }
    
    if (!validatePhone(phone)) {
        showModalPhoneError(true);
        phoneInput.focus();
        return;
    }
    
    const order = buildModalOrderObject();
    
    // Send order via Web3Forms
    sendOrderEmail(order);
    
    // Also save locally
    saveOrder(order);
    
    showToast('Mulțumim! Te contactăm în curând.');
    
    // Close modal and clear form
    closeProductModal();
    
    console.log('Order placed:', order);
}

async function sendOrderEmail(order) {
    try {
        const formData = new FormData();
        formData.append('access_key', 'b01e8dd9-6bad-488f-8533-1603fedf37b6');
        formData.append('subject', 'Comandă nouă de pe AutoHuse.md');
        formData.append('from_name', 'AutoHuse Order System');
        
        // Create order message
        const message = `
COMANDĂ NOUĂ:

📱 Telefon: ${order.phone}

🚗 Mașină:
- Brand: ${order.brand}
- Model: ${order.model}

🛋️ Produs:
- Nume: ${order.productTitle}
- Cod: ${order.productCode}
- Culoare: ${order.color}
- Preț: ${order.price} MDL

---
Comandă trimisă de pe AutoHuse.md
        `.trim();
        
        formData.append('message', message);
        formData.append('phone', order.phone);
        formData.append('brand', order.brand);
        formData.append('model', order.model);
        formData.append('product', `${order.productTitle} - ${order.productCode}`);
        formData.append('color', order.color);
        formData.append('price', `${order.price} MDL`);
        
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            console.log('✅ Order email sent successfully');
        } else {
            console.error('❌ Failed to send order email');
        }
    } catch (error) {
        console.error('❌ Error sending order email:', error);
    }
}

function showModalPhoneError(show) {
    const errorDiv = document.getElementById('modalPhoneError');
    if (errorDiv) {
        if (show) {
            errorDiv.classList.remove('hidden');
        } else {
            errorDiv.classList.add('hidden');
        }
    }
}

function placeOrder() {
    if (!window.__selectedProduct) {
        showToast('Te rugăm să selectezi un produs', 'error');
        return;
    }
    
    const phoneInput = document.getElementById('phoneInput');
    if (!phoneInput) return;
    
    const phone = phoneInput.value.trim();
    
    if (!phone) {
        showToast('Te rugăm să introduci numărul de telefon', 'error');
        phoneInput.focus();
        return;
    }
    
    if (!validatePhone(phone)) {
        showPhoneError(true);
        phoneInput.focus();
        return;
    }
    
    const order = buildOrderObject();
    saveOrder(order);
    
    showToast('Mulțumim! Te contactăm în curând.');
    
    // Clear the form
    phoneInput.value = '';
    showPhoneError(false);
    
    console.log('Order placed:', order);
}

// Form handlers
function initForms() {
    const forms = document.querySelectorAll('#questionForm');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            console.log('Question form submitted:', data);
            showToast('Mulțumim!');
            
            form.reset();
        });
    });
}

// FAQ functionality
function initFAQ() {
    const faqButtons = document.querySelectorAll('.faq-question');
    
    faqButtons.forEach(button => {
        button.addEventListener('click', () => {
            const faqItem = button.parentElement;
            const answer = faqItem.querySelector('.faq-answer');
            const icon = button.querySelector('.faq-icon');
            
            // Toggle current FAQ
            const isOpen = !answer.classList.contains('hidden');
            
            if (isOpen) {
                // Close current FAQ
                answer.classList.add('hidden');
                icon.style.transform = 'rotate(0deg)';
            } else {
                // Close all other FAQs
                faqButtons.forEach(otherButton => {
                    if (otherButton !== button) {
                        const otherItem = otherButton.parentElement;
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        const otherIcon = otherButton.querySelector('.faq-icon');
                        otherAnswer.classList.add('hidden');
                        otherIcon.style.transform = 'rotate(0deg)';
                    }
                });
                
                // Open current FAQ
                answer.classList.remove('hidden');
                icon.style.transform = 'rotate(180deg)';
            }
        });
    });
}

// Mobile menu functionality
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }
}

// Carousel functionality
function initCarousel() {
    const carousel = document.getElementById('carouselSlides');
    const dots = document.querySelectorAll('.carousel-dot');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!carousel || dots.length === 0) return;
    
    let currentSlide = 0;
    const totalSlides = 4;
    let startX = 0;
    let endX = 0;
    
    // Function to update carousel position
    function updateCarousel() {
        const translateX = -currentSlide * 100;
        carousel.style.transform = `translateX(${translateX}%)`;
        
        // Update dots
        dots.forEach((dot, index) => {
            if (index === currentSlide) {
                dot.classList.remove('bg-white/40');
                dot.classList.add('bg-white/80');
            } else {
                dot.classList.remove('bg-white/80');
                dot.classList.add('bg-white/40');
            }
        });
    }
    
    // Next slide function
    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    }
    
    // Previous slide function
    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
    }
    
    // Desktop arrow controls
    if (nextBtn) {
        nextBtn.addEventListener('click', nextSlide);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', prevSlide);
    }
    
    // Dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            updateCarousel();
        });
    });
    
    // Touch/swipe functionality for mobile
    const carouselContainer = document.getElementById('worksCarousel');
    if (carouselContainer) {
        // Touch events
        carouselContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });
        
        carouselContainer.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            handleSwipe();
        });
        
        // Mouse events for desktop testing
        carouselContainer.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            carouselContainer.style.cursor = 'grabbing';
        });
        
        carouselContainer.addEventListener('mouseup', (e) => {
            endX = e.clientX;
            carouselContainer.style.cursor = 'grab';
            handleSwipe();
        });
        
        // Prevent default drag behavior
        carouselContainer.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }
    
    function handleSwipe() {
        const threshold = 50; // Minimum distance for a swipe
        const distance = startX - endX;
        
        if (Math.abs(distance) > threshold) {
            if (distance > 0) {
                // Swiped left - next slide
                nextSlide();
            } else {
                // Swiped right - previous slide
                prevSlide();
            }
        }
    }
    
    // Auto-play functionality (optional)
    let autoplayInterval;
    
    function startAutoplay() {
        autoplayInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    }
    
    function stopAutoplay() {
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
        }
    }
    
    // Start autoplay on desktop, pause on hover
    if (window.innerWidth >= 768) {
        startAutoplay();
        
        if (carouselContainer) {
            carouselContainer.addEventListener('mouseenter', stopAutoplay);
            carouselContainer.addEventListener('mouseleave', startAutoplay);
        }
    }
    
    // Initialize carousel
    updateCarousel();
}

// Page initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, starting initialization...');
    
    // Load catalog
    console.log('Loading catalog...');
    await loadCatalog();
    
    if (window.__catalog) {
        console.log('Catalog loaded successfully:', window.__catalog.brands.length, 'brands');
    } else {
        console.error('Failed to load catalog');
        return;
    }
    
    // Initialize based on current page
    const pathname = window.location.pathname;
    const page = pathname.split('/').pop() || 'index.html';
    console.log('Current page:', page);
    
    switch (page) {
        case 'index.html':
        case '':
            console.log('Initializing homepage...');
            renderBrandGrid();
            animateCounters();
            initCarousel();
            
            // Add show more brands functionality
            const showMoreBtn = document.getElementById('showMoreBrands');
            if (showMoreBtn) {
                showMoreBtn.addEventListener('click', () => {
                    showAllBrands = true;
                    renderBrandGrid();
                });
            }
            break;
        case 'masini.html':
            console.log('Initializing cars page...');
            showAllBrands = true; // Show all brands on masini page
            renderBrandGrid();
            break;
        case 'brand.html':
            console.log('Initializing brand page...');
            initBrandPage();
            break;
        case 'produse.html':
            console.log('Initializing products page...');
            initProductsPage();
            break;
    }
    
    // Initialize forms
    initForms();
    
    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize FAQ
    initFAQ();
    
    console.log('Initialization complete');
});

// Export functions for potential external use
window.AutoHuseApp = {
    loadCatalog,
    getSelected,
    setSelected,
    showToast
};