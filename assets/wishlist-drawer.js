// Wishlist Drawer JavaScript - Fixed Version
class WishlistDrawer {
  constructor() {
    this.storageKey = 'shopify_wishlist';
    this.drawer = null;
    this.itemsContainer = null;
    this.emptyState = null;
    this.init();
  }

  init() {
      // FORCE CLEAN on init
  const currentData = localStorage.getItem(this.storageKey);
  if (currentData) {
    try {
      const parsed = JSON.parse(currentData);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.log('Removing empty/invalid wishlist on init');
        localStorage.removeItem(this.storageKey);
      }
    } catch(e) {
      console.log('Removing corrupted wishlist on init');
      localStorage.removeItem(this.storageKey);
    }
  }
  
    // Wait for DOM to be fully ready
    this.findElements();
    this.bindEvents();
    this.updateCount();
    this.updateButtonStates();
    
    // Listen for updates from product cards
    document.addEventListener('wishlist:updated', () => {
      this.updateCount();
      this.updateButtonStates();
      if (this.drawer && this.drawer.classList.contains('active')) {
        this.renderWishlist();
      }
    });
  }

  findElements() {
    this.drawer = document.getElementById('wishlist-drawer');
    this.itemsContainer = document.getElementById('wishlist-items');
    this.emptyState = document.getElementById('wishlist-empty');
    
    if (!this.drawer) {
      console.warn('Wishlist drawer element not found. Will retry on open.');
    }
  }

  // getWishlist() {
  //   try {
  //     return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
  //   } catch (e) {
  //     console.error('Error reading wishlist:', e);
  //     return [];
  //   }
  // }
  getWishlist() {
  try {
    const data = localStorage.getItem(this.storageKey);
    
    // If no data, return empty array
    if (!data || data === 'undefined' || data === 'null' || data === '""' || data === "''") {
      console.log('No wishlist data found');
      return [];
    }
    
    const wishlist = JSON.parse(data);
    
    // Validate the data structure
    if (!Array.isArray(wishlist)) {
      console.warn('Invalid wishlist format (not an array), resetting...');
      localStorage.removeItem(this.storageKey);
      return [];
    }
    
    // Filter out invalid entries
    const validWishlist = wishlist.filter(item => {
      // Check if item is valid
      if (!item || typeof item !== 'object') {
        console.warn('Invalid item (not an object):', item);
        return false;
      }
      
      // Check if handle exists and is a non-empty string
      if (!item.handle || typeof item.handle !== 'string' || item.handle.trim() === '') {
        console.warn('Invalid item (no handle):', item);
        return false;
      }
      
      return true;
    });
    
    // If we filtered out items, save the cleaned version
    if (validWishlist.length !== wishlist.length) {
      console.warn(`Cleaned wishlist: ${wishlist.length} → ${validWishlist.length} items`);
      if (validWishlist.length === 0) {
        localStorage.removeItem(this.storageKey);
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(validWishlist));
      }
    }
    
    console.log('Valid wishlist items:', validWishlist.length);
    return validWishlist;
    
  } catch (e) {
    console.error('Error reading wishlist, clearing data:', e);
    localStorage.removeItem(this.storageKey);
    return [];
  }
}

  saveWishlist(items) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
      this.updateCount();
      this.updateButtonStates();
      
      // Trigger event for other components
      document.dispatchEvent(new CustomEvent('wishlist:updated'));
    } catch (e) {
      console.error('Error saving wishlist:', e);
    }
  }

  addToWishlist(productHandle, productId) {
    const wishlist = this.getWishlist();
    const exists = wishlist.find(item => item.handle === productHandle);
    
    if (!exists) {
      wishlist.push({
        handle: productHandle,
        id: productId,
        addedAt: new Date().toISOString()
      });
      this.saveWishlist(wishlist);
      this.showNotification('Added to wishlist');
      return true;
    }
    return false;
  }

  removeFromWishlist(productHandle) {
    let wishlist = this.getWishlist();
    wishlist = wishlist.filter(item => item.handle !== productHandle);
    this.saveWishlist(wishlist);
    this.renderWishlist();
    this.showNotification('Removed from wishlist');
  }

  isInWishlist(productHandle) {
    const wishlist = this.getWishlist();
    return wishlist.some(item => item.handle === productHandle);
  }

  updateCount() {
    const count = this.getWishlist().length;
    const countElements = document.querySelectorAll('.wishlist-count, #wishlist-count, [data-wishlist-count]');
    const bubbleElements = document.querySelectorAll('.wishlist-bubble');
    
    console.log('Updating wishlist count:', count);
    
    countElements.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
      el.setAttribute('data-count', count);
    });
    
    bubbleElements.forEach(el => {
      el.style.display = count > 0 ? 'flex' : 'none';
      el.setAttribute('data-count', count);
    });
  }

  updateButtonStates() {
    document.querySelectorAll('.wishlist-btn, .product-card__wishlist-btn').forEach(btn => {
      const handle = btn.dataset.productHandle;
      if (handle && this.isInWishlist(handle)) {
        btn.classList.add('active', 'is-active');
      } else {
        btn.classList.remove('active', 'is-active');
      }
    });
  }

  openDrawer() {
    // Re-find elements in case they weren't available during init
    if (!this.drawer) {
      this.findElements();
    }
    
    if (!this.drawer) {
      console.error('Wishlist drawer element not found. Make sure #wishlist-drawer exists in your HTML.');
      return;
    }
    
    this.drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.renderWishlist();
  }

  closeDrawer() {
    if (!this.drawer) return;
    this.drawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  async renderWishlist() {
    // Re-find elements if needed
    if (!this.itemsContainer || !this.emptyState) {
      this.findElements();
    }
    
    if (!this.itemsContainer || !this.emptyState) {
      console.error('Wishlist container elements not found. Make sure #wishlist-items and #wishlist-empty exist.');
      return;
    }

    const wishlist = this.getWishlist();

    if (wishlist.length === 0) {
      this.itemsContainer.style.display = 'none';
      this.emptyState.style.display = 'flex';
      return;
    }

    this.itemsContainer.style.display = 'block';
    this.emptyState.style.display = 'none';
    this.itemsContainer.innerHTML = '<div class="wishlist-loading">Loading...</div>';

    try {
      const products = await Promise.all(
        wishlist.map(item => 
          fetch(`/products/${item.handle}.js`)
            .then(res => {
              if (!res.ok) throw new Error('Product not found');
              return res.json();
            })
            .catch(err => {
              console.error(`Error fetching product ${item.handle}:`, err);
              return null;
            })
        )
      );

      const validProducts = products.filter(p => p !== null);

      if (validProducts.length === 0) {
        this.itemsContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Unable to load products</p>';
        return;
      }

      const html = validProducts.map(product => this.createProductHTML(product)).join('');
      this.itemsContainer.innerHTML = html;

    } catch (error) {
      console.error('Error rendering wishlist:', error);
      this.itemsContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Error loading wishlist</p>';
    }
  }

  createProductHTML(product) {
    const price = this.formatMoney(product.price);
    const comparePrice = product.compare_at_price && product.compare_at_price > product.price 
      ? this.formatMoney(product.compare_at_price) 
      : null;
    
    // Check if product has variants and is available
    const firstAvailableVariant = product.variants.find(v => v.available);
    const variantId = firstAvailableVariant ? firstAvailableVariant.id : product.variants[0].id;
    const isAvailable = firstAvailableVariant !== undefined;

    return `
      <div class="wishlist-item" data-handle="${product.handle}">
        <div class="wishlist-item-image">
          <a href="${product.url}">
            <img src="${product.featured_image}" alt="${this.escapeHtml(product.title)}" loading="lazy">
          </a>
        </div>
        <div class="wishlist-item-details">
          <h3 class="wishlist-item-title">
            <a href="${product.url}">${this.escapeHtml(product.title)}</a>
          </h3>
          <div class="wishlist-item-price">
            ${comparePrice ? `<span style="text-decoration: line-through; color: #999; font-size: 14px; margin-right: 8px;">${comparePrice}</span>` : ''}
            ${price}
          </div>
          <div class="wishlist-item-actions">
            <button class="btn-add-to-cart" 
                    data-variant-id="${variantId}" 
                    ${!isAvailable ? 'disabled' : ''}>
              ${isAvailable ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button class="btn-remove" data-handle="${product.handle}">
              Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async addToCart(variantId) {
    try {
      // Disable button immediately
      const addButton = document.querySelector(`[data-variant-id="${variantId}"]`);
      if (addButton) {
        addButton.disabled = true;
        addButton.textContent = 'Adding...';
      }

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            id: variantId,
            quantity: 1
          }]
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.showNotification('Added to cart!');
        
        console.log('🔄 Starting aggressive cart refresh...');
        
        // AGGRESSIVE REFRESH - Force page to recognize the cart change
        await this.forceCartRefresh();
        
        // Re-enable button
        if (addButton) {
          addButton.disabled = false;
          addButton.textContent = 'Add to Cart';
        }
        
      } else {
        throw new Error(data.description || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showNotification(error.message || 'Error adding to cart', true);
    }
  }

  async forceCartRefresh() {
    // Step 1: Get fresh cart data
    const response = await fetch('/cart.js?' + new Date().getTime());
    const cart = await response.json();
    
    console.log('📦 Fresh cart data:', cart.item_count, 'items');
    
    // Step 2: Fire ALL possible events that Horizon might listen to
    const events = [
      'cart:updated',
      'cart:refresh', 
      'cart:change',
      'theme:cart:change',
      'shopify:cart:change',
      'cart.requestChange'
    ];
    
    events.forEach(eventName => {
      document.dispatchEvent(new CustomEvent(eventName, { 
        bubbles: true,
        detail: { cart } 
      }));
      document.documentElement.dispatchEvent(new CustomEvent(eventName, { 
        bubbles: true,
        detail: { cart } 
      }));
      window.dispatchEvent(new CustomEvent(eventName, { 
        bubbles: true,
        detail: { cart } 
      }));
    });
    
    // Step 3: Update ALL possible cart count elements
    const selectors = [
      '#cart-icon-bubble',
      '.cart-count-bubble', 
      '[data-cart-count]',
      '.cart-link__count',
      '.header__cart-count',
      '.cart-count',
      'cart-count',
      '.cart-link .count',
      '[aria-label*="cart"] .count',
      '.js-cart-count'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.textContent = cart.item_count;
        el.innerText = cart.item_count;
        el.setAttribute('data-cart-count', cart.item_count);
        console.log(`✅ Updated ${selector}:`, cart.item_count);
      });
    });
    
    // Step 4: Force update cart-drawer custom element
    const cartDrawerElements = document.querySelectorAll('cart-drawer, [is="cart-drawer"]');
    cartDrawerElements.forEach(drawer => {
      // Try all possible refresh methods
      if (drawer.refresh) drawer.refresh();
      if (drawer.renderContents) drawer.renderContents(cart);
      if (drawer.getSectionsToRender) {
        drawer.getSectionsToRender().forEach(section => {
          if (drawer.getSectionInnerHTML) {
            drawer.getSectionInnerHTML(cart.sections[section.id], section.selector);
          }
        });
      }
    });
    
    // Step 5: Reload cart sections via AJAX
    await this.reloadCartSections();
    
    // Step 6: Directly manipulate cart icon
    this.updateCartIcon(cart.item_count);
    
    // Step 7: Open cart drawer
    setTimeout(() => {
      this.forceOpenCartDrawer();
    }, 100);
    
    console.log('✅ Aggressive cart refresh complete');
  }

  async reloadCartSections() {
    try {
      // Find all sections that might contain cart data
      const sections = document.querySelectorAll('[data-section-type*="cart"], [data-section-id]');
      
      for (const section of sections) {
        const sectionId = section.getAttribute('data-section-id');
        if (sectionId) {
          const response = await fetch(`/?section_id=${sectionId}`);
          const html = await response.text();
          
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const newSection = doc.querySelector(`[data-section-id="${sectionId}"]`);
          
          if (newSection) {
            // Update only the cart-related parts
            const cartElements = section.querySelectorAll('[data-cart-count], .cart-count-bubble');
            const newCartElements = newSection.querySelectorAll('[data-cart-count], .cart-count-bubble');
            
            cartElements.forEach((el, index) => {
              if (newCartElements[index]) {
                el.textContent = newCartElements[index].textContent;
                el.innerHTML = newCartElements[index].innerHTML;
              }
            });
            
            console.log('✅ Reloaded section:', sectionId);
          }
        }
      }
    } catch (error) {
      console.error('Section reload error:', error);
    }
  }

  updateCartIcon(count) {
    // Find the cart link/icon
    const cartLinks = document.querySelectorAll('a[href="/cart"], a[href*="cart"], .cart-link, [data-cart-link]');
    
    cartLinks.forEach(link => {
      // Update any count elements inside
      const countElements = link.querySelectorAll('.count, [data-cart-count], .cart-count-bubble');
      countElements.forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      });
      
      // Update aria-label
      if (link.hasAttribute('aria-label')) {
        link.setAttribute('aria-label', `Cart (${count} items)`);
      }
    });
  }

  forceOpenCartDrawer() {
    console.log('🚪 Attempting to open cart drawer...');
    
    // Method 1: cart-drawer custom element
    const cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer) {
      if (typeof cartDrawer.open === 'function') {
        cartDrawer.open();
        console.log('✅ Opened via cart-drawer.open()');
        return;
      }
      cartDrawer.classList.add('is-visible', 'active', 'animate');
      cartDrawer.removeAttribute('hidden');
      console.log('✅ Opened via classList');
      return;
    }
    
    // Method 2: Click the cart icon
    const cartIcon = document.querySelector('a[href="/cart"], .cart-link, [href*="cart"]');
    if (cartIcon) {
      cartIcon.click();
      console.log('✅ Opened via click');
      return;
    }
    
    // Method 3: Find and show any cart drawer
    const drawer = document.querySelector('[id*="cart"], [class*="cart-drawer"]');
    if (drawer) {
      drawer.classList.add('is-visible', 'active');
      drawer.style.display = 'block';
      drawer.removeAttribute('hidden');
      console.log('✅ Opened via direct manipulation');
    }
  }

  formatMoney(cents) {
    // Convert to INR format
    const amount = (cents / 100).toFixed(2);
    return `₹${amount}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = 'wishlist-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${isError ? '#e74c3c' : '#7b1e3a'};
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  bindEvents() {
    // Use event delegation on document for better compatibility
    document.addEventListener('click', (e) => {
      // Wishlist button toggle
      const wishlistBtn = e.target.closest('.wishlist-btn, .product-card__wishlist-btn');
      if (wishlistBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        const handle = wishlistBtn.dataset.productHandle;
        const id = wishlistBtn.dataset.productId;

        if (!handle) {
          console.error('Product handle missing on wishlist button');
          return;
        }

        if (this.isInWishlist(handle)) {
          this.removeFromWishlist(handle);
          wishlistBtn.classList.remove('active', 'is-active');
        } else {
          this.addToWishlist(handle, id);
          wishlistBtn.classList.add('active', 'is-active');
        }
        
        // Add animation
        wishlistBtn.classList.add('animating');
        setTimeout(() => wishlistBtn.classList.remove('animating'), 600);
        return;
      }

      // Open drawer
      const openTrigger = e.target.closest('.header-wishlist-link, [data-wishlist-open]');
      if (openTrigger) {
        e.preventDefault();
        this.openDrawer();
        return;
      }

      // Close drawer
      const closeTrigger = e.target.closest('.wishlist-close, .wishlist-overlay');
      if (closeTrigger) {
        e.preventDefault();
        this.closeDrawer();
        return;
      }

      // Remove from wishlist
      const removeBtn = e.target.closest('.btn-remove');
      if (removeBtn) {
        e.preventDefault();
        const handle = removeBtn.dataset.handle;
        if (handle) {
          this.removeFromWishlist(handle);
        }
        return;
      }

      // Add to cart
      const addToCartBtn = e.target.closest('.btn-add-to-cart');
      if (addToCartBtn && !addToCartBtn.disabled) {
        e.preventDefault();
        const variantId = addToCartBtn.dataset.variantId;
        if (variantId) {
          // Disable button to prevent double-clicks
          addToCartBtn.disabled = true;
          addToCartBtn.textContent = 'Adding...';
          
          this.addToCart(variantId).finally(() => {
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'Add to Cart';
          });
        }
        return;
      }

      // View all button
      const viewAllBtn = e.target.closest('.btn-view-all');
      if (viewAllBtn) {
        window.location.href = '/collections/all';
        return;
      }
    });

    // ESC key to close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.drawer && this.drawer.classList.contains('active')) {
        this.closeDrawer();
      }
    });
  }

  // Refresh method for page transitions
  refresh() {
    this.findElements();
    this.updateCount();
    this.updateButtonStates();
  }
}

// Initialize wishlist drawer
function initWishlist() {
  if (!window.wishlistDrawer) {
    window.wishlistDrawer = new WishlistDrawer();
    console.log('✓ Wishlist initialized');
  } else {
    window.wishlistDrawer.refresh();
    console.log('✓ Wishlist refreshed');
  }
}

// Aggressive refresh for AJAX transitions
function aggressiveRefresh() {
  console.log('Running aggressive refresh...');
  initWishlist();
  setTimeout(() => initWishlist(), 50);
  setTimeout(() => initWishlist(), 150);
  setTimeout(() => initWishlist(), 300);
  setTimeout(() => initWishlist(), 500);
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWishlist);
} else {
  initWishlist();
}

// Listen to Shopify section events
document.addEventListener('shopify:section:load', (event) => {
  console.log('Section loaded:', event.detail?.sectionId);
  aggressiveRefresh();
});

// Theme transitions
document.addEventListener('theme:page:transition:end', () => {
  console.log('Page transition ended');
  aggressiveRefresh();
});

// Browser navigation
window.addEventListener('popstate', aggressiveRefresh);

// Watch for header changes
const observeHeader = () => {
  const headerGroup = document.getElementById('header-group');
  if (!headerGroup) {
    setTimeout(observeHeader, 100);
    return;
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0 || mutation.type === 'childList') {
        const hasWishlistElement = Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === 1) {
            return node.querySelector('.wishlist-count, .wishlist-bubble') || 
                   node.classList?.contains('wishlist-count') ||
                   node.classList?.contains('wishlist-bubble');
          }
          return false;
        });
        
        if (hasWishlistElement || mutation.target.closest?.('.header-wishlist-link')) {
          console.log('Wishlist elements detected, refreshing...');
          setTimeout(() => initWishlist(), 50);
        }
      }
    }
  });

  observer.observe(headerGroup, {
    childList: true,
    subtree: true,
    attributes: false
  });

  console.log('✓ MutationObserver attached');
};

setTimeout(observeHeader, 100);

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(100px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes slideDown {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(100px); opacity: 0; }
  }
  @keyframes heartBeat {
    0%, 100% { transform: scale(1); }
    25% { transform: scale(1.3); }
    50% { transform: scale(1.1); }
  }
  .wishlist-btn.animating,
  .product-card__wishlist-btn.animating {
    animation: heartBeat 0.6s ease;
  }
  .btn-add-to-cart:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
document.head.appendChild(style);

// Final sync patch
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (window.wishlistDrawer) {
      console.log("🔁 Final wishlist count sync");
      window.wishlistDrawer.updateCount();
    }
  }, 1200);
});

document.addEventListener("shopify:section:load", () => {
  setTimeout(() => {
    if (window.wishlistDrawer) {
      window.wishlistDrawer.updateCount();
    }
  }, 500);
});