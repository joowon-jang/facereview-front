// og-image.svg 수정 후 로컬에서 `yarn generate-og`로 실행하고 결과 PNG를 커밋할 것.
// 시스템 폰트(Pretendard/한글 폰트)에 의존하므로 CI·Vercel 빌드에서 실행하면
// 한글이 tofu(□)로 깨진다. 이 때문에 build 스크립트에는 포함하지 않는다.
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public/og-image.svg');
const pngPath = resolve(root, 'public/og-image.png');

const svg = readFileSync(svgPath);
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: {
    loadSystemFonts: true,
    defaultFontFamily: 'Pretendard',
  },
});

const png = resvg.render().asPng();
writeFileSync(pngPath, png);
console.log(`✓ Generated ${pngPath} (${png.length} bytes)`);
