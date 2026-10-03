import { createServer } from 'node:https';
import { connect } from 'node:net';
import { readFileSync } from 'node:fs';
import { createSignalingServer } from '../server/src/index.js';

const signaling = await createSignalingServer({
  dataFile: '.tools/device-test/identities.json', env: { STUN_URLS: '' },
});
const address = await signaling.listen(0, '127.0.0.1');
const tls = createServer({
  key: readFileSync('.tools/device-test/key.pem'),
  cert: readFileSync('.tools/device-test/cert.pem'),
}, (_, response) => { response.writeHead(200); response.end('Device test'); });
tls.on('upgrade', (request, socket, head) => {
  const upstream = connect(address.port, '127.0.0.1', () => {
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`);
    for (let i = 0; i < request.rawHeaders.length; i += 2) {
      upstream.write(`${request.rawHeaders[i]}: ${request.rawHeaders[i + 1]}\r\n`);
    }
    upstream.write('\r\n');
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  socket.on('close', () => upstream.destroy());
});
tls.listen(8443, '127.0.0.1', () => console.log('Device test TLS ready on 8443'));
