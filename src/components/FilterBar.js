/**
 * FilterBar Component (`src/components/FilterBar.js`)
 * Handles price, category, source, cinema venue filters, search debounce (150ms), and UI pill synchronization.
 */

export class FilterBar {
  constructor(store) {
    this.store = store;
    this.debounceTimer = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.store.subscribe((state, eventKey) => {
      this.updateUI(state);
    });
  }

  bindEvents() {
    // 1. Price Filter Buttons
    document.querySelectorAll('.price-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-price-filter');
        this.store.setPriceFilter(val);
      });
    });

    // 1b. Location Filter Buttons (Tutto, Milano Città, Fuori Porta)
    document.querySelectorAll('.location-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-location-filter');
        this.store.setLocationFilter(val);
      });
    });

    // 2. Category Pills & Exclusion (x) Buttons
    document.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const cat = pill.getAttribute('data-category');
        const isXClick = e.target.closest('.category-exclude-btn');

        if (isXClick) {
          e.stopPropagation();
          this.store.toggleCategoryDisabled(cat);
          return;
        }

        if (cat === 'all') {
          this.store.getState().disabledCategories.clear();
          this.store.setCategoryFilter('all');
        } else {
          const state = this.store.getState();
          if (state.disabledCategories.has(cat)) {
            state.disabledCategories.delete(cat);
          }
          this.store.setCategoryFilter(cat);
        }
      });
    });

    // 3. Source Pills
    document.querySelectorAll('.source-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const src = pill.getAttribute('data-source-filter');
        this.store.setSourceFilter(src);
      });
    });

    // 4. Happening Now Toggle
    document.getElementById('toggle-live-only-btn')?.addEventListener('click', () => {
      this.store.toggleHappeningNow();
    });

    // 5. Search Input with 150ms debounce
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');

    searchInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.trim().length > 0) {
        clearBtn?.classList.remove('hidden');
      } else {
        clearBtn?.classList.add('hidden');
      }

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.store.setSearchQuery(val);
      }, 150);
    });

    clearBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      clearBtn.classList.add('hidden');
      this.store.setSearchQuery('');
    });

    // 6. Reset Buttons
    document.getElementById('reset-all-filters-btn')?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      clearBtn?.classList.add('hidden');
      this.store.resetAllFilters();
    });

    document.getElementById('empty-reset-btn')?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      clearBtn?.classList.add('hidden');
      this.store.resetAllFilters();
    });
  }

  updateUI(state) {
    // 1. Update Price Buttons
    document.querySelectorAll('.price-filter-btn').forEach(btn => {
      const val = btn.getAttribute('data-price-filter');
      if (val === state.activePriceFilter) {
        btn.className = 'price-filter-btn px-2.5 py-1.5 rounded-md text-xs font-bold tracking-wide transition cursor-pointer bg-white text-black flex items-center gap-1';
      } else {
        btn.className = 'price-filter-btn px-2.5 py-1.5 rounded-md text-xs font-bold tracking-wide transition cursor-pointer text-zinc-300 hover:text-white flex items-center gap-1';
      }
    });

    // 1b. Update Location Buttons (Fuori Porta)
    document.querySelectorAll('.location-filter-btn').forEach(btn => {
      const val = btn.getAttribute('data-location-filter');
      const isAct = val === state.activeLocationFilter;
      if (val === 'fuori-porta') {
        btn.className = isAct
          ? 'location-filter-btn px-2.5 py-1.5 rounded-md text-xs font-bold tracking-wide transition cursor-pointer bg-indigo-600 text-white flex items-center gap-1 shadow-sm'
          : 'location-filter-btn px-2.5 py-1.5 rounded-md text-xs font-bold tracking-wide transition cursor-pointer text-indigo-300 hover:text-white flex items-center gap-1';
      } else {
        btn.className = isAct
          ? 'location-filter-btn px-2.5 py-1.5 rounded-md text-xs font-bold tracking-wide transition cursor-pointer bg-white text-black flex items-center gap-1'
          : 'location-filter-btn px-2.5 py-1.5 rounded-md text-xs font-bold tracking-wide transition cursor-pointer text-zinc-300 hover:text-white flex items-center gap-1';
      }
    });

    // Update counts
    const countAll = state.allEvents.length;
    const countFree = state.allEvents.filter(e => e.isFree).length;
    const countPaid = countAll - countFree;
    const countFuoriPorta = state.allEvents.filter(e => e.isOutOfTown).length;
    const countMilano = countAll - countFuoriPorta;

    const elAll = document.getElementById('count-price-all');
    const elFree = document.getElementById('count-price-free');
    const elPaid = document.getElementById('count-price-paid');
    if (elAll) elAll.textContent = `(${countAll})`;
    if (elFree) elFree.textContent = `(${countFree})`;
    if (elPaid) elPaid.textContent = `(${countPaid})`;

    const elLocAll = document.getElementById('count-loc-all');
    const elLocMilano = document.getElementById('count-loc-milano');
    const elLocFuori = document.getElementById('count-loc-fuori');
    if (elLocAll) elLocAll.textContent = `(${countAll})`;
    if (elLocMilano) elLocMilano.textContent = `(${countMilano})`;
    if (elLocFuori) elLocFuori.textContent = `${countFuoriPorta}`;

    // Header Quick Stats
    const elHappeningNow = document.getElementById('stat-happening-now');
    const elFreeCount = document.getElementById('stat-free-count');
    if (elHappeningNow) {
      const liveCount = state.allEvents.filter(e => e._isHappeningNow).length;
      elHappeningNow.textContent = `${liveCount} in partenza`;
    }
    if (elFreeCount) {
      elFreeCount.textContent = `${countFree} gratis`;
    }

    // 2. Update Category Pills
    document.querySelectorAll('.category-pill').forEach(pill => {
      const cat = pill.getAttribute('data-category');
      const xBtn = pill.querySelector('.category-exclude-btn');
      const isDis = state.disabledCategories.has(cat);

      if (cat === 'all') {
        if (state.activeCategoryFilter === 'all' && state.disabledCategories.size === 0) {
          pill.className = 'category-pill shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer bg-zinc-100 text-black border-zinc-100';
        } else {
          pill.className = 'category-pill shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#23272f] bg-[#131519] text-zinc-300 hover:border-zinc-600 hover:text-white transition cursor-pointer';
        }
        return;
      }

      if (isDis) {
        pill.className = 'category-pill category-pill-disabled shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-500/30 bg-[#0d0e12]/60 text-zinc-500 opacity-60 line-through hover:opacity-90 hover:border-zinc-500 transition cursor-pointer';
        if (xBtn) {
          xBtn.className = 'category-exclude-btn inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold transition ml-0.5';
          xBtn.title = 'Riattiva questa categoria';
        }
      } else if (cat === state.activeCategoryFilter) {
        pill.className = 'category-pill shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer bg-zinc-100 text-black border-zinc-100';
        if (xBtn) {
          xBtn.className = 'category-exclude-btn inline-flex items-center justify-center w-4 h-4 rounded-full bg-black/10 hover:bg-black/20 text-zinc-700 hover:text-black text-[10px] font-bold transition ml-0.5';
          xBtn.title = 'Disattiva questa categoria';
        }
      } else {
        pill.className = 'category-pill shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#23272f] bg-[#131519] text-zinc-300 hover:border-zinc-600 hover:text-white transition cursor-pointer';
        if (xBtn) {
          xBtn.className = 'category-exclude-btn inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-800/80 hover:bg-red-500/30 text-zinc-400 hover:text-red-300 text-[10px] font-bold transition ml-0.5';
          xBtn.title = 'Disattiva questa categoria';
        }
      }
    });

    // 3. Cinema Venue Subfilter
    this.renderCinemaVenuePills(state);

    // 4. Source Pills
    document.querySelectorAll('.source-pill').forEach(pill => {
      const src = pill.getAttribute('data-source-filter');
      if (src === state.activeSourceFilter) {
        pill.className = 'source-pill shrink-0 px-2.5 py-1 rounded-md font-extrabold border border-zinc-100 bg-zinc-100 text-black shadow transition cursor-pointer text-[11px] flex items-center gap-1';
      } else {
        pill.className = 'source-pill shrink-0 px-2.5 py-1 rounded-md font-bold border border-[#23272f] bg-[#131519] text-zinc-300 hover:text-white hover:border-zinc-500 transition cursor-pointer text-[11px] flex items-center gap-1';
      }
    });

    // Update Source counts
    let countZero = 0, countMilanoToday = 0, countYesMilano = 0, countMentelocale = 0, countDice = 0;
    state.allEvents.forEach(ev => {
      const s = (ev.source || ev.sourceBadge || ev.sourceName || '').toLowerCase();
      const id = (ev.id || '').toLowerCase();
      if (s.includes('zero') || id.startsWith('zero-')) countZero++;
      if (s.includes('milanotoday') || id.startsWith('milanotoday-')) countMilanoToday++;
      if (s.includes('yesmilano') || id.startsWith('yesmilano-')) countYesMilano++;
      if (s.includes('mentelocale') || id.startsWith('mentelocale-')) countMentelocale++;
      if (s.includes('dice') || id.startsWith('dice-')) countDice++;
    });
    const elZero = document.getElementById('src-count-zero');
    const elMilanoToday = document.getElementById('src-count-milanotoday');
    const elYesMilano = document.getElementById('src-count-yesmilano');
    const elMentelocale = document.getElementById('src-count-mentelocale');
    const elDice = document.getElementById('src-count-dice');
    if (elZero) elZero.textContent = `(${countZero})`;
    if (elMilanoToday) elMilanoToday.textContent = `(${countMilanoToday})`;
    if (elYesMilano) elYesMilano.textContent = `(${countYesMilano})`;
    if (elMentelocale) elMentelocale.textContent = `(${countMentelocale})`;
    if (elDice) elDice.textContent = `(${countDice})`;

    // 5. Happening Now Button
    const liveBtn = document.getElementById('toggle-live-only-btn');
    if (liveBtn) {
      if (state.onlyHappeningNow) {
        liveBtn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold border border-orange-500 bg-orange-500/20 text-orange-300 transition flex items-center gap-1.5 cursor-pointer';
      } else {
        liveBtn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#23272f] bg-[#131519] text-zinc-300 hover:border-orange-500/50 hover:text-orange-400 transition flex items-center gap-1.5 cursor-pointer';
      }
    }

    // 6. Active Filter Banner
    this.updateActiveFilterBanner(state);
  }

  renderCinemaVenuePills(state) {
    const sub = document.getElementById('cinema-venues-subfilter');
    const box = document.getElementById('cinema-venue-buttons');
    if (!sub || !box) return;

    const cinemaEvents = state.allEvents.filter(e => e.category === 'cinema');
    if (state.activeCategoryFilter === 'cinema' || (state.activeCategoryFilter === 'all' && cinemaEvents.length > 0)) {
      sub.classList.remove('hidden');
    } else {
      sub.classList.add('hidden');
      return;
    }

    const venueCounts = {};
    cinemaEvents.forEach(e => {
      const v = e.venueName || 'Altro';
      venueCounts[v] = (venueCounts[v] || 0) + 1;
    });
    const topVenues = Object.keys(venueCounts)
      .sort((a, b) => venueCounts[b] - venueCounts[a])
      .slice(0, 10);

    box.innerHTML = topVenues.map(v => {
      const isAct = state.activeCinemaVenueFilter.toLowerCase() === v.toLowerCase();
      return `
        <button
          type="button"
          data-cinema-venue="${v}"
          class="cinema-venue-pill shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
            isAct
              ? 'bg-orange-500 text-black border-orange-500'
              : 'bg-[#131519] text-zinc-300 border-[#23272f] hover:border-zinc-500 hover:text-white'
          }"
        >
          ${v} (${venueCounts[v]})
        </button>
      `;
    }).join('');

    const allBtn = sub.querySelector('[data-cinema-venue="all"]');
    if (allBtn) {
      if (state.activeCinemaVenueFilter === 'all') {
        allBtn.className = 'cinema-venue-pill shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer bg-white text-black border-white';
      } else {
        allBtn.className = 'cinema-venue-pill shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer bg-[#131519] text-zinc-300 border-[#23272f] hover:border-zinc-500 hover:text-white';
      }
      allBtn.onclick = () => {
        this.store.setCinemaVenueFilter('all');
      };
    }

    box.querySelectorAll('.cinema-venue-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-cinema-venue');
        this.store.setCinemaVenueFilter(v);
      });
    });
  }

  updateActiveFilterBanner(state) {
    const banner = document.getElementById('active-filter-banner');
    const tagsContainer = document.getElementById('active-filter-tags');
    if (!banner || !tagsContainer) return;

    const tags = [];
    if (state.activePriceFilter === 'free') tags.push('Gratis / Ingresso Libero');
    if (state.activePriceFilter === 'paid') tags.push('A Pagamento');
    if (state.activeLocationFilter === 'milano') tags.push('Territorio: Solo Milano');
    if (state.activeLocationFilter === 'fuori-porta') tags.push('🚗 Raccolta: Fuori Porta (Fuori Milano)');
    if (state.activeCategoryFilter !== 'all') {
      tags.push(`Categoria: ${state.activeCategoryFilter.toUpperCase()}`);
    }
    if (state.activeSourceFilter !== 'all') {
      tags.push(`Fonte: ${state.activeSourceFilter.toUpperCase()}`);
    }
    if (state.activeCinemaVenueFilter !== 'all') {
      tags.push(`Sala: ${state.activeCinemaVenueFilter}`);
    }
    if (state.disabledCategories.size > 0) {
      state.disabledCategories.forEach(c => tags.push(`Escluso: ${c}`));
    }
    if (state.onlyHappeningNow) tags.push('⚡ Solo Prima Ora');
    if (state.activeSearchQuery) tags.push(`Ricerca: "${state.activeSearchQuery}"`);

    if (tags.length === 0) {
      banner.classList.add('hidden');
      return;
    }

    banner.classList.remove('hidden');
    tagsContainer.innerHTML = tags.map(t => `
      <span class="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium">${t}</span>
    `).join('');
  }
}
