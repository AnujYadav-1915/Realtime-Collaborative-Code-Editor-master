const { io } = require('socket.io-client');
const ACTIONS = require('../src/actions/Actions');

const roomId = 'demo-e2e-room';
const username = 'host-e2e';

const socket = io('http://localhost:5001', {
  transports: ['websocket'],
  timeout: 10000,
});

const fail = (message) => {
  console.error(message);
  socket.disconnect();
  process.exit(1);
};

const timer = setTimeout(() => fail('timeout while setting room problem'), 6000);

socket.on('connect', () => {
  socket.emit(ACTIONS.JOIN, { roomId, username });
});

socket.on(ACTIONS.JOIN_REJECTED, ({ reason }) => {
  clearTimeout(timer);
  fail(`join rejected: ${reason || 'unknown'}`);
});

socket.on(ACTIONS.JOINED, () => {
  socket.emit(ACTIONS.HOST_SET_PROBLEM, {
    roomId,
    problemId: 'sum-two-numbers',
    title: 'Sum of Two Numbers',
    description: 'Read two integers and print their sum.',
    problem: {
      id: 'sum-two-numbers',
      title: 'Sum of Two Numbers',
      statement: 'Read two integers and print their sum.',
      category: 'math',
      difficulty: 'easy',
      targetTimeComplexity: 'O(1)',
      targetSpaceComplexity: 'O(1)',
      timeLimitMs: 2000,
      memoryLimitKb: 131072,
      timerDurationSeconds: 600,
      visibleTestCases: [{ input: '2\n3', output: '5' }],
      hiddenTestCases: [{ input: '100\n250', output: '350' }],
    },
  });

  setTimeout(() => {
    clearTimeout(timer);
    console.log('HOST_SET_PROBLEM emitted');
    socket.disconnect();
    process.exit(0);
  }, 500);
});

socket.on('connect_error', (error) => {
  clearTimeout(timer);
  fail(`connect error: ${error?.message || 'unknown'}`);
});
