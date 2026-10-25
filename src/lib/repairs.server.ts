/**
 * Server-only business logic for the Clients & Repairs module.
 * Prices and totals are always recomputed here from the shop catalogue —
 * the browser is never trusted with money.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { totalsOf, type RepairLine, type RepairStatus } from "./repairs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = SupabaseClient<any, any, any>;

async function currentProfile(supabase: AnyClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("shop_id, full_name")
    .eq("id", userId)
    .single();
  if (error || !data) throw new Error("Profil boutique introuvable.");
  return data as { shop_id: string; full_name: string };
}

export interface CustomerInput {
  id?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

/** Creates the customer, or returns the existing one when the phone is known. */
export async function upsertCustomerFor(supabase: AnyClient, userId: string, input: CustomerInput) {
  const profile = await currentProfile(supabase, userId);
  const phone = input.phone.trim();

  if (input.id) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { customer: data, created: false, duplicate: false };
  }

  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .eq("shop_id", profile.shop_id)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return { customer: existing, created: false, duplicate: true };

  const { data, error } = await supabase
    .from("customers")
    .insert({
      shop_id: profile.shop_id,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { customer: data, created: true, duplicate: false };
}

export interface RepairInput {
  customer: CustomerInput;
  device: {
    id?: string | null;
    brand: string;
    model: string;
    color?: string | null;
    storage?: string | null;
    imei?: string | null;
    unlockCode?: string | null;
  };
  condition?: string | null;
  issue: string;
  services: {
    serviceId?: string | null;
    name?: string | null;
    unitPrice?: number | null;
    quantity: number;
  }[];
}

/** Atomic per-shop yearly reference (REP-2026-0001 / FA-2026-0001), allocated by the database. */
async function nextSequence(supabase: AnyClient, prefix: "REP" | "FA") {
  const { data, error } = await supabase.rpc("next_shop_reference", { _kind: prefix });
  if (error || typeof data !== "string")
    throw new Error(error?.message ?? "Numérotation impossible.");
  return data;
}

/** Creates the repair folder: customer, device, priced lines and initial status. */
export async function createRepairFor(
  supabase: AnyClient,
  admin: AnyClient,
  userId: string,
  input: RepairInput,
) {
  const profile = await currentProfile(supabase, userId);
  const { customer } = await upsertCustomerFor(supabase, userId, input.customer);

  let deviceId = input.device.id ?? null;
  const devicePayload = {
    shop_id: profile.shop_id,
    customer_id: customer.id,
    brand: input.device.brand.trim() || "Apple",
    model: input.device.model.trim(),
    color: input.device.color?.trim() || null,
    storage: input.device.storage?.trim() || null,
    imei: input.device.imei?.trim() || null,
    unlock_code: input.device.unlockCode?.trim() || null,
  };

  if (deviceId) {
    // The device must belong to this customer (and therefore this shop).
    const { data: owned, error: deviceError } = await supabase
      .from("customer_devices")
      .update(devicePayload)
      .eq("id", deviceId)
      .eq("customer_id", customer.id)
      .select("id")
      .maybeSingle();
    if (deviceError || !owned) throw new Error("Appareil introuvable pour ce client.");
  } else {
    const { data: device, error } = await supabase
      .from("customer_devices")
      .insert(devicePayload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    deviceId = device.id as string;
  }

  const catalogIds = input.services.map((s) => s.serviceId).filter(Boolean) as string[];
  let catalog: { id: string; name: string; price: number; duration_minutes: number }[] = [];
  if (catalogIds.length > 0) {
    const { data } = await supabase
      .from("repair_services")
      .select("id, name, price, duration_minutes")
      .eq("shop_id", profile.shop_id)
      .in("id", catalogIds);
    catalog = (data ?? []) as typeof catalog;
  }

  const lines: RepairLine[] = input.services.map((entry) => {
    const quantity = Math.min(50, Math.max(1, Math.round(entry.quantity || 1)));
    const service = catalog.find((item) => item.id === entry.serviceId);
    if (service) {
      return {
        serviceId: service.id,
        name: service.name,
        unitPrice: Number(service.price),
        quantity,
        durationMinutes: Number(service.duration_minutes),
      };
    }
    return {
      serviceId: null,
      name: (entry.name || "Réparation personnalisée").trim().slice(0, 120),
      unitPrice: Math.min(100000, Math.max(0, Number(entry.unitPrice || 0))),
      quantity,
      durationMinutes: 0,
    };
  });

  if (lines.length === 0) throw new Error("Sélectionnez au moins une prestation.");

  const totals = totalsOf(lines);
  const reference = await nextSequence(supabase, "REP");

  // Totals are computed above from the shop catalogue; direct writes are closed
  // to members, so the privileged client persists them.
  const { data: repair, error: repairError } = await admin
    .from("repairs")
    .insert({
      shop_id: profile.shop_id,
      reference,
      customer_id: customer.id,
      device_id: deviceId,
      user_id: userId,
      employee_name: profile.full_name,
      brand: devicePayload.brand,
      model: devicePayload.model,
      color: devicePayload.color,
      storage: devicePayload.storage,
      imei: devicePayload.imei,
      unlock_code: devicePayload.unlock_code,
      condition: input.condition?.trim() || null,
      issue: input.issue.trim(),
      status: "recu",
      total_price: totals.price,
      total_minutes: totals.minutes,
    })
    .select("id, reference")
    .single();
  if (repairError) throw new Error(repairError.message);

  const { error: itemsError } = await admin.from("repair_items").insert(
    lines.map((line) => ({
      repair_id: repair.id,
      service_id: line.serviceId,
      name: line.name,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      duration_minutes: line.durationMinutes,
    })),
  );
  if (itemsError) {
    await admin.from("repairs").delete().eq("id", repair.id);
    throw new Error(itemsError.message);
  }

  const { error: historyError } = await admin.from("repair_status_history").insert({
    repair_id: repair.id,
    status: "recu",
    user_id: userId,
    employee_name: profile.full_name,
    comment: "Dossier créé",
  });
  if (historyError)
    throw new Error(`Dossier créé, mais historique non enregistré : ${historyError.message}`);

  return {
    id: repair.id as string,
    reference: repair.reference as string,
    customerId: customer.id as string,
  };
}

/** Records a status change together with its author and timestamp. */
export async function changeStatusFor(
  supabase: AnyClient,
  admin: AnyClient,
  userId: string,
  repairId: string,
  status: RepairStatus,
  comment?: string | null,
) {
  const profile = await currentProfile(supabase, userId);
  // Read through RLS: only a repair of the caller's shop is found.
  const { data: owned } = await supabase
    .from("repairs")
    .select("id, status")
    .eq("id", repairId)
    .eq("shop_id", profile.shop_id)
    .maybeSingle();
  if (!owned) throw new Error("Dossier introuvable.");

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("repair_id", repairId)
    .maybeSingle();
  const rule = canChangeStatus(owned.status as RepairStatus, status, { invoiced: !!invoice });
  if (!rule.ok) throw new Error(rule.reason);

  // Compare-and-set on the previous status: a concurrent change cannot be overwritten.
  const { data: updated, error } = await admin
    .from("repairs")
    .update({ status })
    .eq("id", repairId)
    .eq("shop_id", profile.shop_id)
    .eq("status", owned.status)
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated || (Array.isArray(updated) && updated.length === 0))
    throw new Error("Le statut a été modifié entre-temps. Rechargez le dossier.");

  const { error: historyError } = await admin.from("repair_status_history").insert({
    repair_id: repairId,
    status,
    user_id: userId,
    employee_name: profile.full_name,
    comment: comment?.trim() || null,
  });
  if (historyError)
    throw new Error(`Statut modifié, mais historique non enregistré : ${historyError.message}`);

  return { status };
}

/** Builds the invoice from the persisted repair lines (never from the browser). */
export async function generateInvoiceFor(
  supabase: AnyClient,
  admin: AnyClient,
  userId: string,
  repairId: string,
) {
  const profile = await currentProfile(supabase, userId);

  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("repair_id", repairId)
    .maybeSingle();
  if (existing) return { id: existing.id as string, existed: true };

  const { data: repair, error } = await supabase
    .from("repairs")
    .select(
      "id, status, reference, customer_id, brand, model, color, storage, imei, issue, total_price, repair_items(name, unit_price, quantity)",
    )
    .eq("id", repairId)
    .eq("shop_id", profile.shop_id)
    .single();
  if (error || !repair) throw new Error("Dossier introuvable.");
  if (repair.status === "annule") throw new Error("Impossible de facturer une réparation annulée.");
  if (!INVOICEABLE_STATUSES.includes(repair.status as RepairStatus))
    throw new Error("Seule une réparation « Terminé » ou « Restitué » peut être facturée.");

  const { data: customer } = await supabase
    .from("customers")
    .select("first_name, last_name, phone, email, address")
    .eq("id", repair.customer_id)
    .single();

  const { data: shop } = await supabase
    .from("shops")
    .select("name, address, phone, email")
    .eq("id", profile.shop_id)
    .single();

  const items = (repair.repair_items ?? []) as {
    name: string;
    unit_price: number;
    quantity: number;
  }[];
  const total = items.reduce(
    (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
    0,
  );
  const number = await nextSequence(supabase, "FA");

  // Repair was read through RLS above, so it belongs to the caller's shop.
  const { data: invoice, error: invoiceError } = await admin
    .from("invoices")
    .insert({
      shop_id: profile.shop_id,
      repair_id: repair.id,
      customer_id: repair.customer_id,
      number,
      total,
      shop_snapshot: shop ?? {},
      customer_snapshot: customer ?? {},
      device_snapshot: {
        brand: repair.brand,
        model: repair.model,
        color: repair.color,
        storage: repair.storage,
        imei: repair.imei,
        issue: repair.issue,
        reference: repair.reference,
      },
      lines: items,
    })
    .select("id")
    .single();
  if (invoiceError) {
    // Unique repair_id: a concurrent request already created the invoice.
    if (invoiceError.code === "23505") {
      const { data: again } = await supabase.from("invoices").select("id").eq("repair_id", repairId).maybeSingle();
      if (again) return { id: again.id as string, existed: true };
    }
    throw new Error(invoiceError.message);
  }

  return { id: invoice.id as string, existed: false };
}
