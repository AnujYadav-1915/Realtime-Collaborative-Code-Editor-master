import {io} from 'socket.io-client';

export const initSocket = async () => {
    const socketBaseUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    const options = {
        'force new connection': true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 15000,
        transports: ['websocket'],
    };
    
    const socketInstance = io(socketBaseUrl, options);
    
    socketInstance.on('connect', () => {
        console.log(`[Socket] Connected successfully with ID: ${socketInstance.id}`);
    });
    
    socketInstance.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
    });
    
    socketInstance.on('disconnect', (reason) => {
        console.warn(`[Socket] Disconnected. Reason: ${reason}`);
    });
    
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[Socket] Attempting to reconnect... (Attempt ${attemptNumber})`);
    });
    
    return socketInstance;
};