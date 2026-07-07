#!/usr/bin/env node

require('dotenv').config();

const args = process.argv.slice(2);
const mode = args.includes('--status') ? 'status' : args.includes('--test') ? 'test' : 'verify';

const toArgIndex = args.findIndex((value) => value === '--to');
const toFromArg = toArgIndex >= 0 ? (args[toArgIndex + 1] || '').trim() : '';
const defaultTo = `${process.env.SMTP_TEST_TO || process.env.SMTP_USER || ''}`.trim();
const toEmail = toFromArg || defaultTo;

const baseUrl = `${process.env.REACT_APP_BACKEND_URL || `http://localhost:${process.env.SERVER_PORT || 5001}`}`.replace(/\/$/, '');

const print = (label, payload) => {
    console.log(`\n${label}`);
    console.log(JSON.stringify(payload, null, 2));
};

const run = async () => {
    try {
        const statusResponse = await fetch(`${baseUrl}/api/auth/email-status`);
        const statusPayload = await statusResponse.json();

        print('SMTP Status', statusPayload);

        if (mode === 'status') {
            process.exit(statusPayload?.configured ? 0 : 1);
            return;
        }

        if (!toEmail) {
            console.error('\nNo test recipient found. Provide --to your_email@example.com or set SMTP_TEST_TO in .env');
            process.exit(1);
            return;
        }

        const testResponse = await fetch(`${baseUrl}/api/auth/test-email`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({to: toEmail}),
        });
        const testPayload = await testResponse.json();

        print(`SMTP Test (${toEmail})`, testPayload);

        if (!statusPayload?.configured || !testResponse.ok) {
            process.exit(1);
            return;
        }

        process.exit(0);
    } catch (error) {
        console.error('\nSMTP verification failed:', error.message || error);
        process.exit(1);
    }
};

run();
