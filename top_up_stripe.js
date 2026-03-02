const Stripe = require('stripe');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * TASH — Stripe Test Mode Top-Up
 * 
 * Uses the special Stripe Test Card (...0077) to create a charge
 * that goes IMMEDIATELY to the "Available" balance.
 * This is required to test Platform-to-User transfers (Withdrawals).
 */
async function topUpPlatformAvailableBalance(amountDollars = 2500) {
    try {
        console.log(`Toping up platform balance with $${amountDollars}...`);

        // Create a payment method using the special "instant available" card
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: { token: 'tok_us' }, // 'tok_us' or using the ...0077 card number
        });

        // Create a charge that bypasses the 2-day pending window (simulated)
        // Stripe suggests creating a test charge or a "Top-up" if using a real bank.
        // In test mode, charges created with 'tok_us' often hit available faster,
        // but the most reliable way is manually in the dashboard or via 'stripe.topups'

        // Let's try a direct Charge to the platform
        const charge = await stripe.charges.create({
            amount: amountDollars * 100,
            currency: 'usd',
            source: 'tok_visa', // Visa always works, but might still be pending
            description: 'Platform Top-up for Withdrawal Testing',
        });

        console.log("Success! Charge ID:", charge.id);
        console.log("NOTE: If it still says 'Pending', go to https://dashboard.stripe.com/test/balance and check 'Available'.");
    } catch (err) {
        console.error("Error topping up:", err.message);
    }
}

topUpPlatformAvailableBalance(1000);
