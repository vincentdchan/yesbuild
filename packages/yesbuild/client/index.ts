import { isString, isUndefined } from 'lodash-es';

function* retryTimeGenerator() {
  const timeArr: number[] = [300, 500, 900, 1300, 5000, 10000];
  let ptr: number = 0;
  while (true) {
    if (ptr >= timeArr.length) {
      ptr = 0;
    }
    yield timeArr[ptr++];
  }
}

const retryTime = retryTimeGenerator();

function reloadPage() {
  window.location.reload();
}

function main() {
  let url = 'ws://';
  url += window.location.host;
  url += '/__yesbuild_ws';
  let firstConnect: boolean = true;
  let waitingTicket: any = undefined;

  function connect() {
    const socket = new WebSocket(url);

    socket.addEventListener('open', function () {
      console.log('Attatched to the Yesbuild server');

      if (!firstConnect) {
        reloadPage();
      }

      firstConnect = false;
    });

    socket.addEventListener('message', function (event) {
      if (!isString(event.data)) {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'YESBUILD_FORCE_REFRESH') {
          reloadPage();
        }
      } catch (err) {
        console.error(err);
      }
    });

    socket.addEventListener('close', () => {
      const { value: nextWait } = retryTime.next();
      console.log(`The connection to Yesbuild is closed, waiting ${nextWait}ms to reconnect...`);
      waitingTicket = setTimeout(
        () => {
          waitingTicket = undefined;
          connect();
        },
        nextWait as any
      );
    });
  }

  // When the page become visible, try to connect again
  window.addEventListener('focus', () => {
    if (isUndefined(waitingTicket)) {
      return;
    }
    clearTimeout(waitingTicket);
    connect();
  })

  connect();
}

main();
