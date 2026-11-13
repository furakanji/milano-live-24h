/**
 * Centralized Reactive State Store (`src/state/store.js`)
 */

class Store {
  constructor() {
    this.state = {
      allEvents: [],
      filteredEvents: [],
      activePriceFilter: 'all', // 'all' | 'free' | 'paid'
      activeCategoryFilter: 'all',
      disabledCategories: new Set(),
      activeSourceFilter: 'all',
      activeCinemaVenueFilter: 'all',
      activeLocationFilter: 'all', // 'all' | 'milano' | 'fuori-porta'
      activeSearchQuery: '',
      onlyHappeningNow: false,
      expandedEventIds: new Set(['evt-mexico-qa', 'evt-base-vernissage']),
      pageLoadAnchorMs: Date.now(),
      nextHourStartMs: (Math.floor(Date.now() / 3600000) + 1) * 3600000,
      crawlerStats: { zero: 0, milanotoday: 0, yesmilano: 0, mentelocale: 0, dice: 0 }
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(eventKey) {
    for (const listener of this.listeners) {
      listener(this.state, eventKey);
    }
  }

  setEvents(events) {
    this.state.allEvents = events || [];
    this.recomputeFilteredEvents();
    this.notify('events');
  }

  setPriceFilter(price) {
    if (this.state.activePriceFilter === price) return;
    this.state.activePriceFilter = price;
    this.recomputeFilteredEvents();
    this.notify('filter:price');
  }

  setLocationFilter(location) {
    if (this.state.activeLocationFilter === location) return;
    this.state.activeLocationFilter = location;
    this.recomputeFilteredEvents();
    this.notify('filter:location');
  }

  setCategoryFilter(category) {
    this.state.activeCategoryFilter = category;
    if (category !== 'cinema') {
      this.state.activeCinemaVenueFilter = 'all';
    }
    this.recomputeFilteredEvents();
    this.notify('filter:category');
  }

  toggleCategoryDisabled(category) {
    if (category === 'all') return;
    if (this.state.disabledCategories.has(category)) {
      this.state.disabledCategories.delete(category);
    } else {
      this.state.disabledCategories.add(category);
      if (this.state.activeCategoryFilter === category) {
        this.state.activeCategoryFilter = 'all';
      }
    }
    this.recomputeFilteredEvents();
    this.notify('filter:category-toggle');
  }

  setSourceFilter(source) {
    if (this.state.activeSourceFilter === source) return;
    this.state.activeSourceFilter = source;
    this.recomputeFilteredEvents();
    this.notify('filter:source');
  }

  setSearchQuery(query) {
    this.state.activeSearchQuery = (query || '').trim();
    this.recomputeFilteredEvents();
    this.notify('filter:search');
  }

  toggleHappeningNow() {
    this.state.onlyHappeningNow = !this.state.onlyHappeningNow;
    this.recomputeFilteredEvents();
    this.notify('filter:happening-now');
  }

  setCinemaVenueFilter(venue) {
    this.state.activeCinemaVenueFilter = venue;
    this.recomputeFilteredEvents();
    this.notify('filter:cinema-venue');
  }

  toggleCardExpanded(id) {
    if (this.state.expandedEventIds.has(id)) {
      this.state.expandedEventIds.delete(id);
    } else {
      this.state.expandedEventIds.add(id);
    }
    this.notify('card:expand');
  }

  resetAllFilters() {
    this.state.activePriceFilter = 'all';
    this.state.activeCategoryFilter = 'all';
    this.state.activeSourceFilter = 'all';
    this.state.activeCinemaVenueFilter = 'all';
    this.state.activeLocationFilter = 'all';
    this.state.activeSearchQuery = '';
    this.state.onlyHappeningNow = false;
    this.state.disabledCategories.clear();
    this.recomputeFilteredEvents();
    this.notify('filter:reset');
  }

  recomputeFilteredEvents() {
    const s = this.state;
    s.filteredEvents = s.allEvents.filter(ev => {
      if (s.activePriceFilter === 'free' && !ev.isFree) return false;
      if (s.activePriceFilter === 'paid' && ev.isFree) return false;
      if (s.activeLocationFilter === 'milano' && ev.isOutOfTown) return false;
      if (s.activeLocationFilter === 'fuori-porta' && !ev.isOutOfTown) return false;
      if (s.disabledCategories.has(ev.category)) return false;
      if (s.activeCategoryFilter !== 'all' && ev.category !== s.activeCategoryFilter) return false;
      if (s.activeSourceFilter !== 'all') {
        const src = (ev.source || ev.sourceBadge || ev.sourceName || '').toLowerCase();
        const target = s.activeSourceFilter.toLowerCase();
        if (!src.includes(target)) return false;
      }
      if (s.activeCinemaVenueFilter !== 'all' && (ev.category === 'cinema' || s.activeCategoryFilter === 'cinema')) {
        const vName = (ev.venueName || '').toLowerCase();
        if (!vName.includes(s.activeCinemaVenueFilter.toLowerCase())) return false;
      }
      if (s.onlyHappeningNow && !ev._isHappeningNow) return false;
      if (s.activeSearchQuery !== '') {
        const q = s.activeSearchQuery.toLowerCase();
        const haystack = `${ev.title} ${ev.venueName} ${ev.neighborhood} ${ev.address} ${ev.description} ${ev.sourceName} ${ev.outOfTownLocation || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }
}

export const store = new Store();
export default store;
