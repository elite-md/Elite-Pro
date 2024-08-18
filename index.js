const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeInMemoryStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const pino = require('pino');

// Path to store auth state files
const AUTH_STATE_PATH = './auth_info_multi'; 

// Function to start the bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_STATE_PATH);
    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        getMessage: async key => {
            return store.loadMessage(key.remoteJid, key.id) || undefined
        }
    });

    store.bind(sock.ev);

    // Event listeners
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Connected');
        }
    });

    sock.ev.on('creds.update', saveCreds); 

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];

        if (!message.key.fromMe && message.key.remoteJid) {
            console.log(Received message from ${message.key.remoteJid}: ${message.message.conversation});
            // Add your message handling logic here
        }
    });
}

// Start the bot
startBot();