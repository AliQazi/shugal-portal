import { writeFileSync } from 'node:fs';

const target = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 1;
const pending = new Map();
const exceptions = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};
const send = (method, params = {}) => new Promise((resolve) => {
  const id = nextId++;
  pending.set(id, resolve);
  socket.send(JSON.stringify({ id, method, params }));
});
const evalValue = async (expression) => {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true });
  return response.result?.result?.value;
};
await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:5173/flight-preview.html' });
await new Promise((resolve) => setTimeout(resolve, 1100));
for (const width of [1440, 900, 390]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  await new Promise((resolve) => setTimeout(resolve, 180));
  const metrics = await evalValue(`({width:innerWidth, cards:[...document.querySelectorAll('.flight-offer')].map(card=>({width:Math.round(card.getBoundingClientRect().width),height:Math.round(card.getBoundingClientRect().height)})), overflow:document.documentElement.scrollWidth>innerWidth})`);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`.tmp-flight-${width}.png`, Buffer.from(screenshot.result.data, 'base64'));
  console.log(JSON.stringify(metrics));
}
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await evalValue(`document.querySelectorAll('.flight-offer-details')[1].open = true`);
await new Promise((resolve) => setTimeout(resolve, 150));
const expanded = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync('.tmp-flight-expanded.png', Buffer.from(expanded.result.data, 'base64'));
console.log(JSON.stringify({ exceptions, expanded: await evalValue(`document.querySelectorAll('.flight-offer-details')[1].open`) }));
socket.close();
await fetch(`http://127.0.0.1:9222/json/close/${target.id}`);
