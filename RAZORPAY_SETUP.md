# Razorpay Setup Guide

## The Issue

You're seeing a **401 Unauthorized** error from Razorpay because the test key in `.env.development` is a placeholder (`rzp_test_xxxxxxxxxxxxx`).

## Quick Fix

### 1. Get Your Razorpay Test Key

1. Go to https://dashboard.razorpay.com/
2. Sign in to your account (or create one if you don't have it)
3. Go to **Settings** → **API Keys**
4. Click **Generate Test Key** (if you haven't already)
5. Copy the **Key ID** (it starts with `rzp_test_`)

### 2. Update Your Environment File

Open `Frontend/.env.development` and replace:

```bash
# OLD (placeholder)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx

# NEW (your actual key)
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_HERE
```

**Example:**
```bash
VITE_RAZORPAY_KEY_ID=rzp_test_abcd1234efgh5678
```

### 3. Restart Your Dev Server

```powershell
# Stop the current server (Ctrl+C)
# Then restart:
cd Frontend
npm run dev
```

## Testing Subscription Payments

Once configured, use these Razorpay test credentials:

### Test Card Numbers
- **Success:** `4111 1111 1111 1111`
- **Failure:** `4111 1111 1111 1234`

### CVV & Expiry
- **CVV:** Any 3 digits (e.g., `123`)
- **Expiry:** Any future date (e.g., `12/26`)

### Test UPI
- **Success:** `success@razorpay`
- **Failure:** `failure@razorpay`

## Troubleshooting

### Still getting 401 error?
1. Make sure you copied the **Key ID** (not the Key Secret)
2. Ensure there are no extra spaces in the `.env` file
3. Restart your dev server after changing `.env`

### Subscription created but payment fails?
- Check if you're using test credentials
- Verify the Razorpay account is in test mode
- Check browser console for detailed error messages

## More Information

- [Razorpay Test Cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/)
- [Razorpay Subscriptions Docs](https://razorpay.com/docs/payments/subscriptions/)
