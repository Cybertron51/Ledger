const Stripe = require('stripe');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkStripeBalance() {
    try {
        const balance = await stripe.balance.retrieve();
        console.log("Platform Balance (USD):");
        balance.available.forEach(b => console.log(`  Available: ${b.amount / 100} ${b.currency}`));
        balance.pending.forEach(b => console.log(`  Pending: ${b.amount / 100} ${b.currency}`));
    } catch (err) {
        console.error("Error fetching Stripe balance:", err.message);
    }
}

checkStripeBalance();
