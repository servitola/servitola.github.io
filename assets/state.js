// The spider's fate travels between pages under one localStorage key: "dropped" | "towel" | "drowned".
const SPIDER_KEY = "spider";
const FATE = { DROPPED: "dropped", TOWEL: "towel", DROWNED: "drowned" };

// Storage can be blocked or full; the page then keeps state in memory for as long as it lives.
const memory = {};
const stash = {
  get(key, session = false) {
    try { return (session ? sessionStorage : localStorage).getItem(key) ?? memory[key]; } catch { return memory[key]; }
  },
  set(key, value, session = false) {
    memory[key] = value;
    try { (session ? sessionStorage : localStorage).setItem(key, value); } catch {}
  },
};
