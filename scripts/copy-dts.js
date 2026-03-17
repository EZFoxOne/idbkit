import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
copyFileSync(join(root, 'src', 'index.d.ts'), join(root, 'dist', 'index.d.ts'));
