// Run with: npx tsx scripts/generate-qr.ts
// Requires: npm install qrcode @types/qrcode

import QRCode from "qrcode";
import path from "path";
import fs from "fs";

const BASE_URL = "https://padea.vercel.app/student-feedback";

const sessions = [
  { school: "Moreton Bay Boys' College", day: "Tuesday" },
  { school: "John Paul College",          day: "Tuesday" },
  { school: "John Paul College",          day: "Wednesday" },
  { school: "MacGregor State High School", day: "Thursday" },
  { school: "Indooroopilly State High School", day: "Monday" },
  { school: "Indooroopilly State High School", day: "Tuesday" },
  { school: "Indooroopilly State High School", day: "Thursday" },
  { school: "Loreto College",             day: "Monday" },
  { school: "Loreto College",             day: "Tuesday" },
  { school: "Cannon Hill Anglican College", day: "Monday" },
  { school: "Cannon Hill Anglican College", day: "Wednesday" },
];

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const outputDir = path.join(process.cwd(), "public", "qr-codes");
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Output directory: ${outputDir}\n`);

  for (const { school, day } of sessions) {
    const url = `${BASE_URL}?school=${encodeURIComponent(school)}&day=${encodeURIComponent(day)}`;
    const filename = `${toSlug(school)}-${day.toLowerCase()}.png`;
    const filepath = path.join(outputDir, filename);

    await QRCode.toFile(filepath, url, {
      type: "png",
      width: 512,
      margin: 2,
      color: {
        dark: "#0f1117",
        light: "#ffffff",
      },
    });

    console.log(`✓ ${filename}`);
    console.log(`  URL: ${url}\n`);
  }

  console.log(`Done — ${sessions.length} QR codes saved to public/qr-codes/`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
