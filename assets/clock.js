// ?date=YYYY-MM-DDTHH:MM previews a moment; otherwise the visitor's clock decides.
const now = (() => { const q = new URLSearchParams(location.search).get("date"); const d = q ? new Date(q) : new Date(); return isNaN(d) ? new Date() : d; })();
const hour = now.getHours();
const mood = now.getMonth() === 0 && now.getDate() === 1 ? "new year, same question"
  : hour < 5 || (hour === 5 && now.getMinutes() === 0) ? "can't sleep?"
  : now.getDay() === 5 && hour >= 18 ? "friday. close the laptop." : "";
const halloween = now.getMonth() === 9 && now.getDate() === 31;
const winter = now.getMonth() === 11;
