// scripts/post-build.mjs
import { cp, rm, readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';

const dist = './dist';
const TARGET_FILES = ['popup.html', 'options.html'];

/**
 * 递归查找目录中指定文件的完整路径
 * @param {string} dir - 起始目录
 * @param {string[]} targetFiles - 要查找的文件名列表
 * @returns {Promise<Map<string, string>>} - 文件名 -> 完整路径 的映射
 */
async function findTargetFiles(dir, targetFiles) {
    const found = new Map();
    const filesToFind = new Set(targetFiles);

    async function walk(currentDir) {
        if (found.size >= targetFiles.length) return; // 找齐了就提前退出

        const entries = await readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(currentDir, entry.name);

            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile() && filesToFind.has(entry.name)) {
                found.set(entry.name, fullPath);
            }
        }
    }

    await walk(dir);
    return found;
}

async function main() {
    console.log('🔍 Searching for popup.html and options.html in dist/src/...');

    const foundFiles = await findTargetFiles(join(dist, 'src'), TARGET_FILES);

    // 检查是否都找到了
    for (const file of TARGET_FILES) {
        if (!foundFiles.has(file)) {
            console.warn(`⚠️  Warning: ${file} not found in dist/src/`);
        } else {
            const sourcePath = foundFiles.get(file);
            const destPath = join(dist, file);
            await cp(sourcePath, destPath);
            console.log(`✅ Copied: ${sourcePath} → ${destPath}`);
        }
    }

    // 可选：删除整个 src 目录（清理）
    try {
        await rm(join(dist, 'src'), { recursive: true, force: true });
        console.log('🧹 Removed dist/src/');
    } catch (err) {
        console.warn('⚠️  Failed to remove dist/src:', err.message);
    }

    console.log('✨ Post-build cleanup completed.');
}

main().catch(err => {
    console.error('❌ Post-build failed:', err);
    process.exit(1);
});