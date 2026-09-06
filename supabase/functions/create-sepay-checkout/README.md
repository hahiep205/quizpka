# create-sepay-checkout

The function has the current merchant account as a fallback so the QR flow can work immediately. Configure these Supabase secrets when the receiving account changes:

- `SEPAY_BANK_CODE`: VietQR bank BIN, for example `970422` for MBBank.
- `SEPAY_BANK_NAME`: display name of the receiving bank.
- `SEPAY_ACCOUNT_NAME`: bank account holder name.
- `SEPAY_ACCOUNT_NUMBER`: receiving bank account number.

The QR transfer content is a generated `PAY...` code stored with the order. The `DSAI-...` value remains an internal order ID and is never shown as transfer content.

The existing `SEPAY_ENV`, `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY`, and `SITE_URL` secrets remain required. Never put account secrets in `VITE_*` variables or frontend source.
