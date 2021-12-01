
function main() {
  let url = 'ws://';
  url += window.location.host;
  if (window.location.port.length > 0) {
    url += ':'
    url += window.location.port;
  }
  url += '/__yesbuild_ws';
  const socket = new WebSocket(url);

  socket.addEventListener('open', function () {
    console.log('attatched');
  });

  socket.addEventListener('message', function (event) {
    console.log('Message from server ', event.data);
  });
}

main();
