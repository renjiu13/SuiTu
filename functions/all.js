export async function onRequestGet(context) {
  try {
    const listResp = await fetch(new URL('/image-list.json', context.request.url));
    if (!listResp.ok) throw new Error('图片清单不存在');
    
    const { all } = await listResp.json();
    if (all.length === 0) return new Response('无图片', { status: 404 });
    
    const randomImg = all[Math.floor(Math.random() * all.length)];
    // 构建完整图片URL
    const imageUrl = new URL(randomImg, context.request.url).toString();
    return Response.redirect(imageUrl, 302);
  } catch (err) {
    return new Response(`获取失败：${err.message}`, { status: 500 });
  }
}
