import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseTargetHostname(target: string): { url: string; hostname: string } | null {
  const clean = target.trim();
  if (!clean) return null;
  const withProtocol = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
  try {
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.toLowerCase();
    return { url: parsed.toString(), hostname };
  } catch {
    return null;
  }
}

function isPrivateOrLocalHost(hostname: string): boolean {
  if (!hostname) return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('127.')) return true;
  if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.test')) return true;
  // RFC 1918 172.16.0.0/12
  const match172 = hostname.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = parseInt(match172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  return false;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawTarget = searchParams.get('target') || '';
    const checkOnly = searchParams.get('checkOnly') === 'true';

    const parsedTarget = parseTargetHostname(rawTarget);
    if (!parsedTarget) {
      return NextResponse.json({ available: false, error: 'URL ou alvo inválido' }, { status: 400 });
    }

    const { url, hostname } = parsedTarget;

    // Se for host local ou privado, não é possível obter screenshot público
    if (isPrivateOrLocalHost(hostname)) {
      return NextResponse.json(
        { available: false, error: 'Alvos locais ou privados não possuem screenshot público' },
        { status: 404 }
      );
    }

    // Provedor 1: Automattic / WordPress mShots (público e gratuito)
    try {
      const mshotsUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=960&h=600`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const resMshots = await fetch(mshotsUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      clearTimeout(timeoutId);

      if (resMshots.ok) {
        const contentType = resMshots.headers.get('content-type') || '';
        const arrayBuffer = await resMshots.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // O mShots devolve um GIF de ~8KB quando o host é inacessível ou falha
        if (contentType.includes('image/jpeg') && buffer.length > 10000) {
          if (checkOnly) {
            return NextResponse.json({ available: true, size: buffer.length });
          }
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
            },
          });
        }
      }
    } catch {
      // Falha no Provedor 1; continua para o fallback
    }

    // Provedor 2: Microlink screenshot
    try {
      const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const resMicrolink = await fetch(microlinkUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      clearTimeout(timeoutId);

      if (resMicrolink.ok) {
        const contentType = resMicrolink.headers.get('content-type') || '';
        const arrayBuffer = await resMicrolink.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (contentType.includes('image') && buffer.length > 10000) {
          if (checkOnly) {
            return NextResponse.json({ available: true, size: buffer.length });
          }
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
            },
          });
        }
      }
    } catch {
      // Falha no Provedor 2
    }

    return NextResponse.json(
      { available: false, error: 'Imagem do website não disponível' },
      { status: 404 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ available: false, error: msg }, { status: 500 });
  }
}
