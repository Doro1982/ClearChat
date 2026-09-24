// Nur UI-Hinweise. Die verbindliche Prüfung findet auf dem Server statt.
export function parseTandems(raw = "") {
  return raw.split("\n").map(line => line.split("=>").map(s => s.trim()))
    .filter(parts => parts.length === 2 && parts[0] && parts[1])
    .slice(0, 30);
}
export function localHint(text, room) {
  const terms = (room.terms || "").split("\n").map(s => s.trim()).filter(Boolean);
  const found = terms.find(term => text.toLocaleLowerCase("de").includes(term.toLocaleLowerCase("de")));
  const tandem = parseTandems(room.tandem).find(([from]) =>
    text.toLocaleLowerCase("de").includes(from.toLocaleLowerCase("de")));
  return found ? `Bitte prüfe die Formulierung „${found}“.${tandem ? " Alternative: " + tandem[1] : ""}` : "";
}
