// GitHub Pages 비동기 데이터 렌더러
let allProducts = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('current-year').textContent = new Date().getFullYear();
  loadProducts();
  setupEvents();
});

async function loadProducts() {
  const container = document.getElementById('product-list');
  try {
    // 캐시 방지 쿼리 파라미터(?t=timestamp)
    const res = await fetch(`./products.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('데이터를 불러올 수 없습니다.');
    const data = await res.json();

    if (data.site_title) {
      document.getElementById('site-title').textContent = data.site_title;
      document.title = data.site_title;
    }
    if (data.site_desc) {
      document.getElementById('site-desc').textContent = data.site_desc;
    }

    allProducts = (data.products || []).filter(p => p.is_active !== false);
    renderCategories(allProducts);
    renderProducts(allProducts);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <p>상품 목록을 불러오지 못했습니다.</p>
        <p style="font-size: 12px; margin-top: 6px;">잠시 후 다시 시도해 주세요.</p>
      </div>
    `;
  }
}

function renderCategories(products) {
  const catSet = new Set();
  products.forEach(p => {
    if (p.category) catSet.add(p.category);
  });

  const tabContainer = document.getElementById('category-tabs');
  if (catSet.size === 0) {
    tabContainer.style.display = 'none';
    return;
  }

  let html = `<button class="cat-btn ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">전체</button>`;
  catSet.forEach(cat => {
    html += `<button class="cat-btn ${activeCategory === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
  });
  tabContainer.innerHTML = html;

  tabContainer.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabContainer.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-cat');
      filterAndRender();
    });
  });
}

function filterAndRender() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();
  const filtered = allProducts.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !query || p.title.toLowerCase().includes(query) || (p.category && p.category.toLowerCase().includes(query));
    return matchCat && matchSearch;
  });
  renderProducts(filtered);
}

function renderProducts(items) {
  const container = document.getElementById('product-list');
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>등록된 상품이 없습니다.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(p => {
    const priceText = p.price ? p.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    const isNaver = p.channel === 'naver' || (p.naver_url && !p.coupang_url) || (p.coupang_url && p.coupang_url.includes('naver'));
    const link = isNaver ? (p.naver_url || p.coupang_url || '#') : (p.coupang_url || p.naver_url || '#');
    const mallBadge = isNaver 
      ? '<span class="mall-tag naver">네이버</span>' 
      : '<span class="mall-tag coupang">쿠팡</span>';
    const ctaText = isNaver ? '네이버 보기 ➔' : '최저가 보기 ➔';

    return `
      <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="product-card">
        <div class="card-img-wrap">
          <img src="${escapeHtml(p.image_url || './placeholder.jpg')}" alt="${escapeHtml(p.title)}" class="card-img" loading="lazy" />
          <div class="tag-row">
            ${mallBadge}
            ${badgeHtml}
          </div>
        </div>
        <div class="card-content">
          <h2 class="card-title">${escapeHtml(p.title)}</h2>
          <div class="card-bottom">
            <div class="price-wrap">
              <span class="price-val">${escapeHtml(priceText)}</span>
              <span class="price-unit">원</span>
            </div>
            <span class="cta-btn-mini ${isNaver ? 'naver-btn' : 'coupang-btn'}">
              ${ctaText}
            </span>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function setupEvents() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    filterAndRender();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
