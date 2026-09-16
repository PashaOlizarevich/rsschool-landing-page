const pageName = process.argv[2];
const port = process.argv[3] ?? "9223";
const endpoint = `http://127.0.0.1:${port}/json/list`;
const widths = [1440, 1024, 768, 600, 480, 380];
const targets = await (await fetch(endpoint)).json();
const pageTarget = targets.find((target) => target.type === "page" && target.url.startsWith("file:"));
if (!pageTarget) throw new Error("Page target not found");
const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const runtimeErrors = [];

socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") {
    runtimeErrors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    runtimeErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  }
});

await new Promise((resolve, reject) => {
  if (socket.readyState === WebSocket.OPEN) {
    resolve();
    return;
  }
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const messageId = ++id;
  pending.set(messageId, { resolve, reject });
  socket.send(JSON.stringify({ id: messageId, method, params }));
});
await send("Page.enable");
await send("Runtime.enable");

const auditExpression = `(() => {
  const root = document.documentElement;
  const viewportWidth = root.clientWidth;
  const offenders = [...document.querySelectorAll('body *')].flatMap((element) => {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || element.classList.contains('visually-hidden')) return [];
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return [];
    if (rect.left < -1 || rect.right > viewportWidth + 1) {
      return [{ tag: element.tagName.toLowerCase(), className: element.className?.toString().slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right) }];
    }
    return [];
  }).slice(0, 12);
  return {
    title: document.title,
    meaningful: document.body.innerText.trim().length > 100,
    viewportWidth,
    scrollWidth: root.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflow: root.scrollWidth > viewportWidth + 1,
    offenders,
  };
})()`;

for (const width of widths) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const result = await send("Runtime.evaluate", { expression: auditExpression, returnByValue: true });
  console.log(JSON.stringify({ page: pageName, width, ...result.result.value }));
}

console.log(JSON.stringify({ runtimeErrors }));
await send("Browser.close");
socket.close();
