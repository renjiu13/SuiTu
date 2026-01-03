export async function onRequestGet(context) {
  try {
    const listResp = await fetch(new URL('/image-list.json', context.request.url));
    if (!listResp.ok) throw new Error('图片清单不存在');
    
    const { v } = await listResp.json();
    if (v.length === 0) return new Response('无竖屏图片', { status: 404 });
    
    const randomImg = v[Math.floor(Math.random() * v.length)];
    return Response.redirect(randomImg, 302);
  } catch (err) {
    return new Response(`获取失败：${err.message}`, { status: 500 });
  }
}
