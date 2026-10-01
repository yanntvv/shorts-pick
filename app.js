// GitHub Pages 홈쇼핑 멀티링크 비동기 렌더러
let allProducts = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  loadProducts();
  setupEvents();
});

async function loadProducts() {
  const container = document.getElementById('product-list');
  try {
    const res = await fetch(`./products.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('데이터를 불러올 수 없습니다.');
    const data = await res.json();

    if (data.site_title) {
      const titleEl = document.getElementById('site-title');
      if (titleEl) titleEl.textContent = data.site_title;
      document.title = data.site_title;
    }
    if (data.site_desc) {
      const descEl = document.getElementById('site-desc');
      if (descEl) descEl.textContent = data.site_desc;
    }
    if (data.announcement) {
      const annEl = document.getElementById('site-announcement');
      if (annEl) annEl.textContent = data.announcement;
    }

    allProducts = (data.products || []).filter(p => p.is_active !== false);
    renderCategories(allProducts);
    renderProducts(allProducts);
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <p>방송 특가 상품 목록을 불러오지 못했습니다.</p>
          <p style="font-size: 12px; margin-top: 6px;">잠시 후 새로고침(F5)을 시도해 주세요.</p>
        </div>
      `;
    }
  }
}

function renderCategories(products) {
  const tabContainer = document.getElementById('category-tabs');
  if (!tabContainer) return;

  const catSet = new Set();
  products.forEach(p => {
    if (p.category && p.category.trim()) catSet.add(p.category.trim());
  });

  let html = `<button class="cat-btn ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">전체보기</button>`;
  catSet.forEach(cat => {
    html += `<button class="cat-btn ${activeCategory === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
  });
  tabContainer.innerHTML = html;

  tabContainer.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tabContainer.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-cat') || 'all';
      filterAndRender();
    });
  });
}

function filterAndRender() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  const filtered = allProducts.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !query || 
      (p.title && p.title.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query)) ||
      (p.video_ref && p.video_ref.toLowerCase().includes(query)) ||
      (p.md_comment && p.md_comment.toLowerCase().includes(query));
    return matchCat && matchSearch;
  });

  renderProducts(filtered);
}

function renderProducts(items) {
  const container = document.getElementById('product-list');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>해당 카테고리에 등록된 상품이 없습니다.</p>
      </div>
    `;
    return;
  }

  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect fill='%23f1f5f9' width='400' height='260'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='20' dy='7' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3E%ED%99%88%EC%87%BC%ED%95%91%20%ED%8A%B9%EA%B0%80%20%EC%83%81%ED%92%88%3C/text%3E%3C/svg%3E";

  container.innerHTML = items.map(p => {
    const imgSrc = p.image_url && p.image_url.trim() ? p.image_url.trim() : fallbackImg;
    const priceText = p.price ? p.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    const origPriceText = p.original_price ? p.original_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    
    // 할인율 뱃지
    const discountBadgeHtml = p.discount_rate 
      ? `<span class="discount-badge">${escapeHtml(p.discount_rate)} 특가</span>` 
      : '';

    // 우측 상단 뱃지 (방영 태그 또는 사용자 뱃지)
    const rightBadges = [];
    if (p.badge) {
      rightBadges.push(`<span class="badge-pill custom">${escapeHtml(p.badge)}</span>`);
    }

    // 연계 영상 태그
    const videoRefHtml = p.video_ref 
      ? `<div class="video-ref-tag"><span>📺</span> <span>${escapeHtml(p.video_ref)}</span></div>`
      : '';

    // MD 한 줄 추천평
    const mdCommentHtml = p.md_comment 
      ? `<div class="md-comment-box"><span class="md-comment-prefix">💡 MD추천:</span>${escapeHtml(p.md_comment)}</div>`
      : '';

    // 혜택 태그 목록
    let benefitsHtml = '';
    if (p.benefits && Array.isArray(p.benefits) && p.benefits.length > 0) {
      const chips = p.benefits.map(b => `<span class="benefit-chip">${escapeHtml(b)}</span>`).join('');
      benefitsHtml = `<div class="benefits-row">${chips}</div>`;
    }

    // 정상가 (취소선)
    const origPriceHtml = origPriceText 
      ? `<span class="orig-price">${escapeHtml(origPriceText)}원</span>` 
      : '';

    // 제휴 버튼 (쿠팡 파트너스 + 네이버 커넥트/쇼핑 듀얼 지원)
    const hasCoupang = Boolean(p.coupang_url && p.coupang_url.trim());
    const hasNaver = Boolean(p.naver_url && p.naver_url.trim());
    let actionButtonsHtml = '';

    if (hasCoupang && hasNaver) {
      // 듀얼 버튼 (둘 다 등록된 경우 나란히 배치)
      actionButtonsHtml = `
        <div class="shop-actions">
          <a href="${escapeHtml(p.coupang_url)}" target="_blank" rel="noopener noreferrer" class="btn-shop btn-coupang">
            <span>🚀</span> 쿠팡 최저가
          </a>
          <a href="${escapeHtml(p.naver_url)}" target="_blank" rel="noopener noreferrer" class="btn-shop btn-naver">
            <span>🟢</span> 네이버쇼핑몰
          </a>
        </div>
      `;
    } else if (hasCoupang) {
      actionButtonsHtml = `
        <div class="shop-actions">
          <a href="${escapeHtml(p.coupang_url)}" target="_blank" rel="noopener noreferrer" class="btn-shop btn-coupang" style="width: 100%;">
            <span>🚀</span> 쿠팡 로켓배송 최저가 보기
          </a>
        </div>
      `;
    } else if (hasNaver) {
      actionButtonsHtml = `
        <div class="shop-actions">
          <a href="${escapeHtml(p.naver_url)}" target="_blank" rel="noopener noreferrer" class="btn-shop btn-naver" style="width: 100%;">
            <span>🟢</span> 네이버쇼핑몰 바로가기
          </a>
        </div>
      `;
    } else {
      // 링크가 없을 경우 기본 안내
      actionButtonsHtml = `
        <div class="shop-actions">
          <span class="btn-shop btn-coupang" style="opacity: 0.6; cursor: default;">
            준비 중인 상품입니다
          </span>
        </div>
      `;
    }

    return `
      <article class="product-card">
        <div class="card-hero">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.title)}" class="card-hero-img" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}';" />
          ${discountBadgeHtml}
          <div class="hero-badges-right">
            ${rightBadges.join('')}
          </div>
        </div>
        <div class="card-body">
          ${videoRefHtml}
          <h2 class="card-title">${escapeHtml(p.title)}</h2>
          ${mdCommentHtml}
          ${benefitsHtml}
          <div class="price-section">
            <div class="price-left">
              ${origPriceHtml}
              <div class="sale-price-wrap">
                <span class="sale-price">${escapeHtml(priceText)}</span>
                <span class="price-won">원</span>
              </div>
            </div>
          </div>
          ${actionButtonsHtml}
        </div>
      </article>
    `;
  }).join('');
}

function setupEvents() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterAndRender();
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
