const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

// ===================== 配置项（可自定义） =====================
const CONFIG = {
  rawDir: path.join(__dirname, '../raw'), // 原始图片目录
  outputDir: path.join(__dirname, '../img'), // 输出根目录
  hDir: path.join(__dirname, '../img/h'), // 横屏输出目录
  vDir: path.join(__dirname, '../img/v'), // 竖屏输出目录
  webpQuality: 80, // WebP压缩质量（1-100）
  imageListPath: path.join(__dirname, '../img/image-list.json'), // 图片清单路径
  galleryPath: path.join(__dirname, '../img/index.html'), // 画廊页面路径
  allowedExts: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] // 支持的原始图片格式
};

// ===================== 工具函数 =====================
// 生成6位随机文件名（000000.webp ~ ffffff.webp）以避免冲突
function generateRandomFileName() {
  const randomStr = Math.random().toString(16).slice(2, 8).padStart(6, '0');
  return `${randomStr}.webp`;
}

// 检查文件是否存在
async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true; // 文件存在
  } catch {
    return false; // 文件不存在
  }
}

// 判断图片横竖屏（宽>高=横屏h，宽<=高=竖屏v）
async function getImageOrientation(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    return width > height ? 'h' : 'v';
  } catch (err) {
    console.error(`获取图片信息失败 ${filePath}：`, err);
    return 'h'; // 异常时默认归为横屏
  }
}

// 生成画廊页面HTML
function generateGalleryHTML(hList, vList, allList) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>图片画廊</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
    .tabs { margin-bottom: 20px; }
    .tab-btn { 
      padding: 8px 16px; margin-right: 8px; border: none; border-radius: 4px;
      background: #007cff; color: white; cursor: pointer;
    }
    .tab-btn.active { background: #0056b3; }
    .gallery { 
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
    }
    .img-card { border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
    .img-card img { width: 100%; height: 200px; object-fit: cover; }
    .img-card .type { padding: 8px; text-align: center; font-size: 12px; color: #666; }
    .hidden { display: none; }
    .count { margin: 10px 0; color: #666; }
  </style>
</head>
<body>
  <h1>图片画廊</h1>
  <div class="count">总图片数：${allList.length}（横屏：${hList.length} | 竖屏：${vList.length}）</div>
  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('all')">全部</button>
    <button class="tab-btn" onclick="switchTab('h')">横屏</button>
    <button class="tab-btn" onclick="switchTab('v')">竖屏</button>
  </div>

  <!-- 全部图片 -->
  <div id="all-tab" class="gallery">
    ${allList.map((img, idx) => {
      const type = img.includes('/h/') ? '横屏' : '竖屏';
      return `
      <div class="img-card">
        <img src="${img}" alt="图片${idx+1}" loading="lazy">
        <div class="type">${type}</div>
      </div>
    `;
    }).join('')}
  </div>

  <!-- 横屏图片 -->
  <div id="h-tab" class="gallery hidden">
    ${hList.map((img, idx) => `
      <div class="img-card">
        <img src="${img}" alt="横屏图片${idx+1}" loading="lazy">
        <div class="type">横屏</div>
      </div>
    `).join('')}
  </div>

  <!-- 竖屏图片 -->
  <div id="v-tab" class="gallery hidden">
    ${vList.map((img, idx) => `
      <div class="img-card">
        <img src="${img}" alt="竖屏图片${idx+1}" loading="lazy">
        <div class="type">竖屏</div>
      </div>
    `).join('')}
  </div>

  <script>
    // 画廊标签切换逻辑
    function switchTab(tabName) {
      // 隐藏所有标签
      document.querySelectorAll('.gallery').forEach(el => el.classList.add('hidden'));
      // 激活当前标签
      document.getElementById(\`\${tabName}-tab\`).classList.remove('hidden');
      // 切换按钮样式
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
    }
  </script>
</body>
</html>
  `;
}

// ===================== 主处理逻辑 =====================
async function processImages() {
  try {
    // 1. 确保目标目录存在
    await fs.mkdir(CONFIG.hDir, { recursive: true });
    await fs.mkdir(CONFIG.vDir, { recursive: true });

    // 2. 读取raw目录下的所有文件
    let rawFiles = [];
    try {
      rawFiles = await fs.readdir(CONFIG.rawDir);
    } catch (err) {
      console.error('raw目录不存在，已创建空目录：', err);
      await fs.mkdir(CONFIG.rawDir, { recursive: true });
      return;
    }

    // 3. 过滤出支持的图片文件
    const imageFiles = rawFiles.filter(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      return CONFIG.allowedExts.includes(ext);
    });

    if (imageFiles.length === 0) {
      console.log('raw目录中无有效图片文件');
      return;
    }

    // 4. 处理每张图片（判方向→转WebP→分类存储→删原图）
    const hFiles = []; // 横屏图片路径列表
    const vFiles = []; // 竖屏图片路径列表
    
    // 用于跟踪已使用的文件名，避免冲突
    const usedFileNames = new Set();
    
    // 并发处理配置
    const maxConcurrency = 4; // 最大并发数，可根据CPU核心数调整
    
    // 为每个文件生成处理任务
    const processTasks = imageFiles.map(file => async () => {
      const rawPath = path.join(CONFIG.rawDir, file);
      const orientation = await getImageOrientation(rawPath);
      const targetDir = orientation === 'h' ? CONFIG.hDir : CONFIG.vDir;
      
      // 生成唯一的文件名
      let newFileName;
      let outputPath;
      let attempts = 0;
      const maxAttempts = 100; // 防止无限循环
      
      // 使用锁机制确保文件名唯一性
      do {
        if (attempts >= maxAttempts) {
          console.error(`无法为 ${file} 生成唯一文件名，已达到最大尝试次数`);
          return null; // 返回null表示处理失败
        }
        
        newFileName = generateRandomFileName();
        outputPath = path.join(targetDir, newFileName);
        attempts++;
      } while (usedFileNames.has(newFileName) || await checkFileExists(outputPath));
      
      if (attempts >= maxAttempts) {
        return null; // 返回null表示处理失败
      }
      
      // 添加到已使用文件名集合
      usedFileNames.add(newFileName);
      
      // 转换为WebP并保存
      await sharp(rawPath)
        .webp({ quality: CONFIG.webpQuality })
        .toFile(outputPath);
      console.log(`处理完成：${file} → ${orientation}/${newFileName}`);

      // 记录图片路径（供清单/画廊用）
      const relativePath = `/${orientation}/${newFileName}`;
      
      // 删除原始图片
      await fs.unlink(rawPath);
      console.log(`已删除原图：${file}`);
      
      return { orientation, relativePath };
    });
    
    // 并发执行任务
    const results = [];
    for (let i = 0; i < processTasks.length; i += maxConcurrency) {
      const batch = processTasks.slice(i, i + maxConcurrency);
      const batchResults = await Promise.allSettled(batch.map(task => task()));
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value !== null) {
          const { orientation, relativePath } = result.value;
          if (orientation === 'h') {
            hFiles.push(relativePath);
          } else {
            vFiles.push(relativePath);
          }
        } else if (result.status === 'rejected') {
          console.error('图片处理失败:', result.reason);
        }
      }
    }

    // 5. 生成图片清单JSON
    const allFiles = [...hFiles, ...vFiles];
    const imageList = { h: hFiles, v: vFiles, all: allFiles };
    await fs.writeFile(CONFIG.imageListPath, JSON.stringify(imageList, null, 2));
    console.log(`生成图片清单：${CONFIG.imageListPath}`);

    // 6. 生成画廊页面
    const galleryHTML = generateGalleryHTML(hFiles, vFiles, allFiles);
    await fs.writeFile(CONFIG.galleryPath, galleryHTML);
    console.log(`生成画廊页面：${CONFIG.galleryPath}`);

    console.log('\n✅ 所有图片处理完成！');
    console.log(`📊 统计：横屏${hFiles.length}张 | 竖屏${vFiles.length}张 | 总计${allFiles.length}张`);

  } catch (err) {
    console.error('\n❌ 处理失败：', err);
  }
}

// 执行主逻辑
processImages();
