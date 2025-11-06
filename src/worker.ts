export interface Env {
  AI: Ai;
  CHAT_DO: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(HTML_PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    if (url.pathname === "/chat" && request.method === "POST") {
      const { sessionId = "default", text } = await request.json<any>();
      if (!text) return new Response("missing 'text'", { status: 400 });

      const id = env.CHAT_DO.idFromName(sessionId);
      const stub = env.CHAT_DO.get(id);
      return await stub.fetch("https://do/chat", { method: "POST", body: text });
    }

    if (url.pathname === "/history" && request.method === "GET") {
      const sessionId = url.searchParams.get("sessionId") ?? "default";
      const id = env.CHAT_DO.idFromName(sessionId);
      const stub = env.CHAT_DO.get(id);
      return await stub.fetch("https://do/history");
    }

    return new Response("Not Found", { status: 404 });
  },
};

type Msg = { role: "user" | "assistant" | "system"; content: string; ts: number };

export class ChatDurableObject {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/history") {
      const h = await this.state.storage.get<Msg[]>("history");
      return Response.json(h ?? []);
    }

    if (url.pathname === "/chat" && req.method === "POST") {
      const userText = await req.text();
      let history = (await this.state.storage.get<Msg[]>("history")) ?? [];

      if (!history.length || history[0].role !== "system") {
        history.unshift({
          role: "system",
          content: "You are a concise, helpful assistant. Reply in the user's language.",
          ts: Date.now(),
        });
      }

      history.push({ role: "user", content: userText, ts: Date.now() });

      const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
      const resp = await this.env.AI.run(model, {
        messages: history.map(m => ({ role: m.role, content: m.content }))
      });

      const textOut =
        (resp as any)?.response ||
        (Array.isArray((resp as any)?.output) ? (resp as any).output.map((o: any) => o.content || o.text).join("") : "") ||
        JSON.stringify(resp);

      history.push({ role: "assistant", content: textOut, ts: Date.now() });
      if (history.length > 30) history = [history[0], ...history.slice(-29)];
      await this.state.storage.put("history", history);

      return Response.json({ text: textOut });
    }

    return new Response("DO Not Found", { status: 404 });
  }
}

const HTML_PAGE = `<!doctype html>
<meta charset="utf-8"/>
<title>Workers AI Simple Chat Box</title>
<style>
  body { max-width: 760px; margin: 40px auto; font-family: ui-sans-serif, system-ui; }
  #log { white-space: pre-wrap; border: 1px solid #ddd; padding: 12px; border-radius: 10px; min-height: 240px; }
  form { margin-top: 12px; display: flex; gap: 10px; }
  input, button { padding: 10px 12px; font-size: 16px; }
  /* typing dots */
  .typing { display:inline-flex; align-items:center; gap:6px; }
  .dot { width:6px; height:6px; border-radius:50%; background:#888; opacity:.3; animation: blink 1.2s infinite; }
  .dot:nth-child(2){ animation-delay:.2s }
  .dot:nth-child(3){ animation-delay:.4s }
  @keyframes blink { 0%,100%{opacity:.2} 50%{opacity:1} }
  .muted { color:#666 }
</style>
<h1>Workers AI Chat</h1>
<div><small>Session: <code id="sid">demo</code></small></div>
<div id="log">Loading history…</div>
<form id="f">
  <input id="t" placeholder="Say something…" style="flex:1"/>
  <button id="sendBtn">Send</button>
</form>
<script>
const sid = new URL(location.href).searchParams.get('sessionId') || 'demo';
document.getElementById('sid').textContent = sid;
const log = document.getElementById('log');
const form = document.getElementById('f');
const t = document.getElementById('t');
const sendBtn = document.getElementById('sendBtn');

function appendLine(prefix, text){
  log.textContent += (log.textContent ? '\\n\\n' : '') + prefix + ' ' + text;
}

function appendTyping(){
  // create a live "typing…" block we can replace later
  const wrapper = document.createElement('div');
  wrapper.style.marginTop = log.textContent ? '12px' : '0';
  const label = document.createElement('span');
  label.textContent = '🤖 ';
  const typing = document.createElement('span');
  typing.className = 'typing';
  typing.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  wrapper.appendChild(label);
  wrapper.appendChild(typing);
  log.appendChild(wrapper);
  return wrapper; // return node to replace
}

async function showHistory(){
  const r = await fetch('/history?sessionId='+encodeURIComponent(sid));
  const h = await r.json();
  log.textContent = (h||[]).map(m => {
    const who = m.role === 'user' ? '🪐' : m.role==='assistant' ? '🤖' : '⚙️';
    return who + ' ' + m.content;
  }).join('\\n\\n') || '(no history yet)';
}
showHistory();

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = t.value.trim(); if(!text) return;

  // UI: lock input + show my message
  t.disabled = true; sendBtn.disabled = true; sendBtn.textContent = 'Thinking…';
  appendLine('🧑', text);
  t.value = '';

  // UI: insert typing indicator and keep a handle to replace later
  const typingNode = appendTyping();

  try{
    const r = await fetch('/chat', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({ sessionId: sid, text })
    });
    const { text: out } = await r.json();

    // replace typing indicator with model output
    typingNode.replaceWith(document.createTextNode('\\n\\n🤖 ' + out));
  }catch(err){
    typingNode.replaceWith(document.createTextNode('\\n\\n🤖 (error)'));
    const errLine = document.createElement('div');
    errLine.className = 'muted';
    errLine.textContent = String(err);
    log.appendChild(errLine);
  }finally{
    t.disabled = false; sendBtn.disabled = false; sendBtn.textContent = 'Send';
    t.focus();
  }
});
</script>`;



