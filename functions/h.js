export async function onRequestGet(context) {
  try {
    // 读取图片清单
    const listResp = await context.env.ASSETS.fetch('/image-list.json');
    if (!listResp.ok) throw new Error('图片清单不存在');
    
    const { h } = await listResp.json();
    if (h.length === 0) return new Response('无横屏图片', { status: 404 });
    
    // 随机选一张
    const randomImg = h[Math.floor(Math.random() * h.length)];
    // 302重定向到图片（CF会自动缓存）
    return Response.redirect(randomImg, 302);
  } catch (err) {
    return new Response(`获取失败：${err.message}`, { status: 500 });
  }
}
