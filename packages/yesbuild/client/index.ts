import { isString } from 'lodash-es';

function main() {
  let url = 'ws://';
  url += window.location.host;
  url += '/__yesbuild_ws';
  const socket = new WebSocket(url);

  socket.addEventListener('open', function () {
    console.log('attatched');
  });

  socket.addEventListener('message', function (event) {
    if (!isString(event.data)) {
      return;
    }
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'YESBUILD_FORCE_REFRESH') {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  });
}

main();
