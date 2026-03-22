# Launch Checklist

Use this checklist before deploying `Sync Code` to production.

## 1) Environment

- Copy `example.env` to `.env` and set values.
- Required runtime controls:
  - `EXECUTION_PROVIDER=auto|remote|local`
  - `ALLOW_LOCAL_EXECUTION_FALLBACK=true|false`
  - `ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com`
  - `API_RATE_LIMIT_WINDOW_MS=60000`
  - `API_RATE_LIMIT_MAX=180`

## 2) Backend runtime

- Start backend: `npm run server:dev`
- Verify health endpoint:
  - `curl -s http://localhost:5001/api/health`
- Verify runtime status endpoint:
  - `curl -s http://localhost:5001/api/runtime-status`

## 2.1) Forgot-password email (SMTP)

- Configure SMTP in environment (do not commit secrets):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_BASE_URL`
- For Gmail, `SMTP_PASS` must be a Google App Password (16-char), not account password.
- Restart backend and verify:
  - `npm run server:restart:bg`
  - `npm run smtp:status`
  - `npm run smtp:verify`
- Smoke-check API flow:
  - `POST /api/auth/forgot-password/request` with `{ "email": "<user>", "method": "otp" }`
  - Confirm response has `delivery: "smtp"`.

## 3) Frontend

- Start frontend: `npm start`
- Open `http://localhost:3000`
- Confirm Home shows backend health badge as online.

## 4) Build and smoke tests

- Build frontend: `npm run build`
- Basic room flow:
  - Create room: `POST /api/rooms/create`
  - Validate room: `GET /api/rooms/:roomId/exists`
- Judge flow:
  - Run one sample through `POST /api/run`
  - Confirm visible + hidden test cases are evaluated.

## 5) Security and traffic guardrails

- Confirm `ALLOWED_ORIGINS` is set for production domain(s).
- Confirm API rate limiting values match expected traffic profile.
- Keep backend behind TLS (reverse proxy or platform-managed HTTPS).

## 6) Post-launch checks

- Watch server logs for repeated `429` responses and tune limits if required.
- Monitor `/api/health` and ensure uptime grows continuously.
- Verify code execution success rate for your target languages.
- Verify forgot-password OTP/link delivery success rate and monitor SMTP provider errors.

## 7) Secret management (production)

- Store all secrets in deployment platform secret manager (not `.env` in repo).
- Rotate SMTP credentials periodically and after any accidental exposure.
- Keep `AUTH_EXPOSE_RECOVERY_DEBUG=false` in production.
