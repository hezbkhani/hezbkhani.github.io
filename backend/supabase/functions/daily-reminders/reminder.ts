// منطق خالص یادآوری (بدون شبکه) تا جدا آزمایش شود. محاسبه سهم همان taskFor در app.js است.
export type Group = { number: number; name: string; start: number; names: string[] };
export type Slot = 'morning' | 'evening' | 'test';

const fa = '۰۱۲۳۴۵۶۷۸۹';
export const toFa = (x: unknown) => String(x).replace(/\d/g, d => fa[+d]);

// قالب فایل groups/group-N.txt: خط اول تاریخ شروع، سپس دقیقاً ۱۲۰ نام.
export function parseGroupText(text: string, number: number, name?: string): Group | null {
  const a = text.replace(/^﻿/, '').split(/\r?\n/).map(x => x.trim()).filter(Boolean), iso = a.shift() || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || a.length !== 120) return null;
  return { number, name: name || `گروه ${toFa(number)}`, start: isoToUtc(iso), names: a };
}

export const isoToUtc = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };

// day: روز قرائت با قالب YYYY-MM-DD. اگر دوره هنوز شروع نشده باشد null.
export function portionFor(g: Group, id: number, day: string, portions: string[]) {
  const days = Math.floor((isoToUtc(day) - g.start) / 86400000);
  if (days < 0 || id < 1 || id > g.names.length) return null;
  const index = (id - 1 + days) % 120;
  return { index, hizb: index + 1, portion: portions[index], name: g.names[id - 1] };
}

export function message(slot: Slot, p: { name: string; portion: string; hizb: number }, group: number, id: number, siteUrl: string) {
  const portion = `${toFa(p.portion)} (حزب ${toFa(p.hizb)})`;
  const url = `${siteUrl.replace(/\/$/, '')}/?g=${group}&id=${id}`;
  if (slot === 'evening') return {
    title: 'یادآوری: گزارش امروز هنوز ثبت نشده',
    body: `${p.name} عزیز، سهم امروز شما ${portion} است و گزارش آن هنوز ثبت نشده. لطفاً حتماً قرائت کنید و گزارش دهید.`,
    url, tag: 'quran-evening'
  };
  return {
    title: 'سهم قرائت امروز',
    body: `${p.name} عزیز، سهم امروز شما: ${portion}. پس از قرائت، گزارش را در سایت ثبت کنید.`,
    url, tag: 'quran-morning'
  };
}
