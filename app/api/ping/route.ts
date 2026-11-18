import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function extrairHost(alvo: string): string {
  const limpo = alvo.trim();
  if (!limpo) return "";
  const comProtocolo = /^https?:\/\//i.test(limpo) ? limpo : `http://${limpo}`;
  try {
    const parsed = new URL(comProtocolo);
    return parsed.hostname || "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const alvoUrl = typeof body?.alvoUrl === "string" ? body.alvoUrl : "";
    const host = extrairHost(alvoUrl);

    if (!host || !/^[a-zA-Z0-9.-]+$/.test(host) || host.startsWith("-")) {
      return NextResponse.json(
        {
          status: "erro",
          ativo: false,
          host,
          erro: "Host inválido informado na URL.",
        },
        { status: 400 }
      );
    }

    const isWindows = process.platform === "win32";
    const args = isWindows
      ? ["-n", "1", "-w", "2500", host]
      : ["-c", "1", "-W", "2", host];

    try {
      const { stdout } = await execFileAsync("ping", args, { timeout: 5000 });
      const saida = (stdout || "").toLowerCase();
      const inacessivel =
        saida.includes("inacess") ||
        saida.includes("unreachable") ||
        saida.includes("100% loss") ||
        saida.includes("100% de perda");
      const respondeu =
        saida.includes("ttl=") ||
        saida.includes("tempo") ||
        saida.includes("time");

      if (respondeu && !inacessivel) {
        return NextResponse.json({
          status: "sucesso",
          ativo: true,
          host,
        });
      }
    } catch {
      // Ping retornou código de saída != 0 (host não encontrado ou timeout)
    }

    return NextResponse.json(
      {
        status: "erro",
        ativo: false,
        host,
        erro: `O host '${host}' não existe.`,
      },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      {
        status: "erro",
        ativo: false,
        erro: "Erro ao validar o host informado.",
      },
      { status: 400 }
    );
  }
}
