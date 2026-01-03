# SuiTu 随机图片服务

一个基于 Cloudflare Pages 的静态随机图片服务，支持自定义域名访问，可按横屏、竖屏或全部随机返回图片。

## 项目结构

```
SuiTu/
├── README.md
├── build/                  # 核心自动化脚本目录
│   ├── package.json        # 脚本依赖配置
│   └── process-images.js   # 图片处理主脚本（核心）
├── .gitignore              # Git忽略规则
├── raw/                    # 【用户手动放图】原始图片目录（混合横竖屏）
├── img/                    # Cloudflare Pages输出目录（脚本自动生成）
│   ├── h/                  # 自动生成：横屏WebP图片
│   ├── v/                  # 自动生成：竖屏WebP图片
│   ├── image-list.json     # 自动生成：图片清单（供API/画廊用）
│   └── index.html          # 自动生成：画廊预览页面
└── functions/              # Cloudflare Pages边缘函数（处理/h/v/all）
    ├── h.js
    ├── v.js
    └── all.js
```

## 功能特性

- 🖼️ 自动识别图片横竖屏方向
- 🔄 自动转换为 WebP 格式，压缩率高
- 🎲 随机图片 API（支持横屏/竖屏/全部）
- 🖼️ 图片画廊页面，方便预览
- ⚡ 部署在 Cloudflare Pages，全球 CDN 加速
- 🔒 改进的文件名生成算法，支持大量图片处理
- ⚡ 并发处理支持，提高大量图片处理速度

## 构建配置

### 构建命令:

```bash
echo "No build needed"
```

### 构建输出:

`img`

### 根目录:

项目根目录

### 构建注释:

项目采用本地预处理方式，图片处理脚本在本地运行，将原始图片转换为 WebP 格式并分类存储。无需在 Cloudflare Pages 上进行构建处理。

## 本地处理流程

### 1. 安装依赖

```bash
cd build
npm install
```

### 2. 添加原始图片

将需要处理的原始图片（支持 JPG、PNG、GIF、BMP 格式）放入 `raw/` 目录

### 3. 运行处理脚本

```bash
cd build
npm run process
```

处理脚本会自动完成以下操作：
- 识别图片横竖屏方向
- 转换为 WebP 格式（质量 80%）
- 按横屏/竖屏分类存储到 `img/h/` 和 `img/v/` 目录
- 生成 `image-list.json` 图片清单
- 生成 `index.html` 画廊页面
- 删除原始图片

> **注意**：如果之前遇到处理后图片数量减少的问题，这是由于随机文件名冲突导致的。更新后的脚本使用6位随机文件名（约1677万种可能组合）并添加了冲突检测机制，可有效处理大量图片。

## Cloudflare Pages 部署

### 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "初始化图片画廊+随机图API"
git remote add origin https://github.com/你的用户名/SuiTu.git
git push -u origin main
```

### 2. 在 Cloudflare Pages 创建项目

1. 登录 Cloudflare 后台 → 左侧「Pages」→ 「创建项目」
2. 选择「连接到Git」→ 找到你的`SuiTu`仓库 → 「开始设置」
3. 构建配置：
   - 构建命令：`echo "No build needed"`
   - 输出目录：`img`
   - 环境变量：无需配置
4. 点击「保存并部署」

### 3. 绑定自定义域名

1. 部署完成后，进入项目 → 「自定义域」→ 「添加自定义域」
2. 输入你的域名（如`img.yourdomain.com`）
3. 按 Cloudflare 提示配置 DNS 解析
4. 等待 SSL 证书签发完成

## API 接口

| 访问路径 | 效果 |
|---------|------|
| `https://你的域名/` | 打开画廊页面（可切换横竖屏） |
| `https://你的域名/h` | 随机返回一张横屏 WebP 图片 |
| `https://你的域名/v` | 随机返回一张竖屏 WebP 图片 |
| `https://你的域名/all` | 随机返回一张任意方向的图片 |

## 后续维护

### 新增图片

1. 将新图片放入本地`raw/`目录
2. 运行 `cd build && npm run process` 处理
3. 提交代码：`git add . && git commit -m "新增图片" && git push`
4. Cloudflare Pages 会自动重新部署

## 技术栈

- **图片处理**: Sharp (Node.js 图片处理库)
- **部署平台**: Cloudflare Pages
- **边缘函数**: Cloudflare Workers
- **图片格式**: WebP
- **前端**: 原生 HTML/CSS/JS