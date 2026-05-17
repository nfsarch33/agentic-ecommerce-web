"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  createOrder,
  type CreateOrderOptions,
  type DeliveryOption,
} from "@/lib/adapters/api/orders";
import { buildCheckoutOrder } from "@/lib/usecases/checkout";
import type { ShippingAddress } from "@/lib/domain/order";
import { useCart } from "./CartProvider";

type CheckoutErrors = Partial<Record<"email" | keyof ShippingAddress, string>>;

export interface CheckoutFormProps {
  readonly apiBaseUrl: string;
  readonly createOrderImpl?: (opts: CreateOrderOptions) => ReturnType<typeof createOrder>;
}

const defaultAddress: ShippingAddress = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "AU",
};

const emailRE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newCheckoutIdempotencyKey(): string {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (randomUUID) {
    return randomUUID();
  }
  return `checkout-${Date.now().toString(36)}`;
}

function validate(email: string, address: ShippingAddress): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (!emailRE.test(email.trim())) errors.email = "Enter a valid email.";
  if (address.name.trim() === "") errors.name = "Full name is required.";
  if (address.line1.trim() === "") errors.line1 = "Address line 1 is required.";
  if (address.city.trim() === "") errors.city = "City is required.";
  if (address.region.trim() === "") errors.region = "State or region is required.";
  if (address.postalCode.trim() === "") errors.postalCode = "Postal code is required.";
  if (address.country.trim() === "") errors.country = "Country is required.";
  return errors;
}

export function CheckoutForm({ apiBaseUrl, createOrderImpl = createOrder }: CheckoutFormProps) {
  const router = useRouter();
  const { state, dispatch } = useCart();
  const [email, setEmail] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>("standard");
  const [address, setAddress] = useState<ShippingAddress>(defaultAddress);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  if (state.items.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-600">Your cart is empty. Add a product before checking out.</p>
        <Link className="mt-6 inline-flex text-sm text-blue-600 hover:underline" href="/products">
          Browse products
        </Link>
      </section>
    );
  }

  function updateAddress(field: keyof ShippingAddress) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setAddress((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current) return;

    const nextErrors = validate(email, address);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const order = await createOrderImpl({
        baseUrl: apiBaseUrl,
        order: buildCheckoutOrder({
          cart: state,
          customerEmail: email.trim(),
          deliveryOption,
          idempotencyKey: newCheckoutIdempotencyKey(),
          shippingAddress: {
            ...address,
            name: address.name.trim(),
            line1: address.line1.trim(),
            line2: address.line2?.trim() || undefined,
            city: address.city.trim(),
            region: address.region.trim(),
            postalCode: address.postalCode.trim(),
            country: address.country.trim(),
          },
        }),
      });
      dispatch({ type: "clear" });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to place order.");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 grid gap-6" onSubmit={submit}>
      {submitError && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {submitError}
        </p>
      )}
      <label className="grid gap-2 text-sm font-medium">
        Email
        <input
          className="rounded-md border border-gray-300 px-3 py-2 font-normal"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {errors.email && <span className="text-red-700">{errors.email}</span>}
      </label>
      <fieldset className="grid gap-4 rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold">Shipping address</legend>
        <label className="grid gap-2 text-sm font-medium">
          Full name
          <input className="rounded-md border border-gray-300 px-3 py-2 font-normal" value={address.name} onChange={updateAddress("name")} />
          {errors.name && <span className="text-red-700">{errors.name}</span>}
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Address line 1
          <input className="rounded-md border border-gray-300 px-3 py-2 font-normal" value={address.line1} onChange={updateAddress("line1")} />
          {errors.line1 && <span className="text-red-700">{errors.line1}</span>}
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Address line 2
          <input className="rounded-md border border-gray-300 px-3 py-2 font-normal" value={address.line2 ?? ""} onChange={updateAddress("line2")} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium">
            City
            <input className="rounded-md border border-gray-300 px-3 py-2 font-normal" value={address.city} onChange={updateAddress("city")} />
            {errors.city && <span className="text-red-700">{errors.city}</span>}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            State or region
            <input className="rounded-md border border-gray-300 px-3 py-2 font-normal" value={address.region} onChange={updateAddress("region")} />
            {errors.region && <span className="text-red-700">{errors.region}</span>}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Postal code
            <input className="rounded-md border border-gray-300 px-3 py-2 font-normal" value={address.postalCode} onChange={updateAddress("postalCode")} />
            {errors.postalCode && <span className="text-red-700">{errors.postalCode}</span>}
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          Country
          <input className="rounded-md border border-gray-300 px-3 py-2 font-normal" value={address.country} onChange={updateAddress("country")} />
          {errors.country && <span className="text-red-700">{errors.country}</span>}
        </label>
      </fieldset>
      <fieldset className="grid gap-3 rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold">Delivery option</legend>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            checked={deliveryOption === "standard"}
            name="delivery-option"
            onChange={() => setDeliveryOption("standard")}
            type="radio"
            value="standard"
          />
          Standard delivery
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            checked={deliveryOption === "express"}
            name="delivery-option"
            onChange={() => setDeliveryOption("express")}
            type="radio"
            value="express"
          />
          Express delivery
        </label>
      </fieldset>
      <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
        Payment stub: no card will be charged in v0.2.0.
      </p>
      <button
        className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:bg-gray-300"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Placing order..." : "Place order"}
      </button>
    </form>
  );
}
