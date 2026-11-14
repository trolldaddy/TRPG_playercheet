const fs = require("fs");
const path = require("path");

const [databaseRoot, srd521Markdown, outputRoot] = process.argv.slice(2);
if (!databaseRoot || !srd521Markdown || !outputRoot) {
  console.error("Usage: node scripts/build-magic-item-catalogs.js <5e-database-root> <srd-5.2.1-magic-items.md> <output-root>");
  process.exit(2);
}

const omitted521 = new Set([
  "Bead of Nourishment", "Cloak of Invisibility", "Elixir of Health", "Energy Bow",
  "Gloves of Thievery", "Hat of Many Spells", "Potion of Invulnerability",
  "Potion of Longevity", "Potion of Vitality", "Quarterstaff of the Acrobat",
  "Rod of Resurrection", "Sending Stones", "Sentinel Shield", "Shield of the Cavalier",
  "Thunderous Greatclub"
]);

const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cleanMarkdown = value => String(value || "")
  .replace(/<table>[\s\S]*?<\/table>/gi, "[表格詳見 SRD]")
  .replace(/<[^>]+>/g, " ").replace(/^#{1,6}\s+/gm, "")
  .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/_([^_]+)_/g, "$1")
  .replace(/\[(.*?)\]\([^)]*\)/g, "$1").replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n").trim();
const rarityFrom = value => {
  const matches = String(value).match(/\b(Common|Uncommon|Rare|Very Rare|Legendary|Artifact)\b/gi);
  return matches ? [...new Set(matches.map(x => x.replace(/\b\w/g, c => c.toUpperCase())))].join(" / ") : "Varies";
};
const categoryFrom = value => {
  const text = String(value);
  for (const [pattern, name] of [[/\bArmor\b/i,"Armor"],[/\bPotion\b/i,"Potion"],[/\bRing\b/i,"Ring"],[/\bRod\b/i,"Rod"],[/\bScroll\b/i,"Scroll"],[/\bStaff\b/i,"Staff"],[/\bWand\b/i,"Wand"],[/\bWeapon\b|\bAmmunition\b/i,"Weapon"]]) if (pattern.test(text)) return name;
  return "Wondrous Item";
};

function normalize(raw, edition) {
  const first = Array.isArray(raw.desc) ? raw.desc[0] || "" : String(raw.desc || "").split(/\n/)[0];
  const description = cleanMarkdown(Array.isArray(raw.desc) ? raw.desc.join("\n\n") : raw.desc);
  return {
    id: `${edition}-${raw.index || slug(raw.name)}`,
    edition,
    name: raw.name,
    category: raw.equipment_category?.name || categoryFrom(first),
    rarity: raw.rarity?.name || rarityFrom(first),
    attunement: Boolean(raw.attunement || /requires attunement/i.test(first)),
    variant: Boolean(raw.variant),
    variants: (raw.variants || []).map(x => x.index || x.name).filter(Boolean),
    description,
    charges: /\bcharges?\b/i.test(description),
    spellReferenceEdition: edition
  };
}

function supplemental521(markdown) {
  const sections = new Map();
  const chunks = String(markdown).split(/^#### /gm).slice(1);
  for (const chunk of chunks) {
    const newline = chunk.search(/\r?\n/);
    if (newline < 0) continue;
    sections.set(chunk.slice(0, newline).trim(), chunk.slice(newline).trim());
  }
  return [...omitted521].map(name => {
    const body = sections.get(name);
    if (!body) throw new Error(`SRD 5.2.1 missing expected supplemental item: ${name}`);
    const meta = body.match(/^_([^\n]+)_/m)?.[1] || "Wondrous Item, Varies";
    return normalize({ index: slug(name), name, desc: `${meta}\n\n${body.replace(/^_[^\n]+_\s*/m, "")}`, attunement: /requires attunement/i.test(meta), rarity: { name: rarityFrom(meta) }, equipment_category: { name: categoryFrom(meta) } }, "2024");
  });
}

function build(edition) {
  const source = path.join(databaseRoot, "src", edition, "en", "5e-SRD-Magic-Items.json");
  const raw = JSON.parse(fs.readFileSync(source, "utf8"));
  const items = raw.map(x => normalize(x, edition));
  if (edition === "2024") {
    const existing = new Set(items.map(x => x.name));
    supplemental521(fs.readFileSync(srd521Markdown, "utf8")).forEach(item => { if (!existing.has(item.name)) items.push(item); });
  }
  items.sort((a,b) => a.name.localeCompare(b.name, "en"));
  const payload = {
    schemaVersion: 1,
    edition,
    source: edition === "2014" ? "System Reference Document 5.1" : "System Reference Document 5.2.1",
    license: "CC-BY-4.0",
    attribution: `This work includes material from the System Reference Document ${edition === "2014" ? "5.1" : "5.2.1"} by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.`,
    count: items.length,
    items
  };
  fs.writeFileSync(path.join(outputRoot, `magic-items-srd-${edition}.json`), JSON.stringify(payload, null, 2) + "\n");
  return payload;
}

const results = [build("2014"), build("2024")];
console.log(results.map(x => `${x.edition}: ${x.count}`).join("\n"));
