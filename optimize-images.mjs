import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const rootDir = process.cwd();
const htmlPath = path.join(rootDir, "index.html");
const imagePattern = /src="(assets\/[^"]+\.(?:jpe?g|png))"/gi;
const outputWidth = 1600;
const webpQuality = 76;

const html = await fs.readFile(htmlPath, "utf8");
const imagePaths = [...new Set([...html.matchAll(imagePattern)].map((match) => match[1]))];
const rewrites = new Map();

for (const imagePath of imagePaths) {
  const inputPath = path.join(rootDir, imagePath);
  const parsedPath = path.parse(imagePath);
  const outputPath = path.join(rootDir, parsedPath.dir, `${parsedPath.name}.webp`);
  const outputImagePath = path.posix.join(parsedPath.dir, `${parsedPath.name}.webp`);

  try {
    await fs.access(inputPath);
  } catch {
    console.warn(`Skipping missing image: ${imagePath}`);
    continue;
  }

  await sharp(inputPath)
    .resize({ width: outputWidth, withoutEnlargement: true })
    .webp({ quality: webpQuality })
    .toFile(outputPath);

  rewrites.set(imagePath, outputImagePath);
  console.log(`Optimized ${imagePath} -> ${outputImagePath}`);
}

if (rewrites.size > 0) {
  const optimizedHtml = [...rewrites.entries()].reduce(
    (nextHtml, [from, to]) => nextHtml.replaceAll(`src="${from}"`, `src="${to}"`),
    html
  );

  await fs.writeFile(htmlPath, optimizedHtml);
  console.log(`Updated ${path.relative(rootDir, htmlPath)} with optimized image paths.`);
}
