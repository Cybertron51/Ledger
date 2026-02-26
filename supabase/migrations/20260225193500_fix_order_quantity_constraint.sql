-- ============================================================
-- Migration: Fix Order Quantity Constraint
-- Allows quantity to be 0 so orders can be marked as 'filled'.
-- ============================================================

-- 1. Drop the old restrictive constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_quantity_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_quantity_positive;

-- 2. Add the correct constraint (>= 0)
ALTER TABLE public.orders ADD CONSTRAINT orders_quantity_check CHECK (quantity >= 0);
