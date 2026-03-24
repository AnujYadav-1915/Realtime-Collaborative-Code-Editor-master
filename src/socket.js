import {io} from 'socket.io-client';

export const initSocket = async () => {
    const socketBaseUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    return io(socketBaseUrl, options);
};