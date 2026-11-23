/** Small text helpers. Tables are kept to 42 columns so they fit a phone. */
import { DAYS } from './config.ts';

export const WIDTH = 42;

export function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

export function lpad(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

/** A length of time given in years: "9 h", "45 d", "8.1 mo", "3.4 yr", "1.2 kyr". */
export function span(years: number): string {
  const days = years * DAYS;
  if (days < 1.5) return `${Math.max(1, Math.round(days * 24))} h`;
  if (days < 60) return `${Math.round(days)} d`;
  if (years < 2) return `${(years * 12).toFixed(1)} mo`;
  if (years < 10) return `${years.toFixed(1)} yr`;
  if (years < 1000) return `${Math.round(years)} yr`;
  if (years < 1e6) return `${(years / 1000).toFixed(years < 1e4 ? 2 : 1)} kyr`;
  return aeons(years);
}

/** A million years and up, never wider than nine characters: "1.20 Myr", "340.0 Myr", "2.31 Gyr". */
function aeons(years: number): string {
  if (years < 1e8) return `${(years / 1e6).toFixed(2)} Myr`;
  if (years < 9.9995e8) return `${(years / 1e6).toFixed(1)} Myr`;
  return `${(years / 1e9).toFixed(2)} Gyr`;
}

/** The same, written out for the Mind to say: "eight months", "3.4 years". */
export function spanWords(years: number): string {
  const days = years * DAYS;
  if (days < 1.5) return 'a few hours';
  if (days < 60) return `${Math.round(days)} days`;
  if (years < 2) return `${Math.round(years * 12)} months`;
  if (years < 10) return `${years.toFixed(1)} years`;
  if (years < 1000) return `${Math.round(years)} years`;
  if (years < 1e5) return `${Math.round(years).toLocaleString('en-US')} years`;
  if (years < 999500) return `${Math.round(years / 1000)} thousand years`;
  if (years < 9.995e8) return `${Number((years / 1e6).toPrecision(3))} million years`;
  return `${Number((years / 1e9).toPrecision(3))} billion years`;
}

/** A distance in light-years, in at most five characters. */
export function ly(d: number): string {
  if (d < 10) return d.toFixed(1);
  if (d < 1000) return String(Math.round(d));
  return `${(d / 1000).toFixed(1)}k`;
}

/** "[######----]" */
export function gauge(fraction: number, width = 10): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width);
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`;
}

export function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A clock reading in years: "3.1 yr", "1,204 yr", "12.4 kyr", "1.20 Myr", "2.31 Gyr". */
export function clock(years: number): string {
  if (years < 100) return `${years.toFixed(1)} yr`;
  if (years < 10000) return `${Math.round(years).toLocaleString('en-US')} yr`;
  if (years < 1e6) return `${(years / 1000).toFixed(1)} kyr`;
  return aeons(years);
}
