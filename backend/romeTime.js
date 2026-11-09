// Utility fuso Europe/Rome (gestisce ora legale senza dipendenze esterne)
const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false
});

export function romeParts(ms) {
  const m = {};
  fmt.formatToParts(new Date(ms)).forEach((p) => { m[p.type] = p.value; });
  return { y: +m.year, mo: +m.month, d: +m.day, h: +m.hour % 24, mi: +m.minute };
}

/** Converte un orario "a muro" di Milano in timestamp UTC (ms). */
export function romeToUtcMs(y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  for (const off of [1, 2]) {
    const ms = guess - off * 3600000;
    const p = romeParts(ms);
    if (p.y === y && p.mo === mo && p.d === d && p.h === h && p.mi === mi) return ms;
  }
  return guess - 3600000;
}
