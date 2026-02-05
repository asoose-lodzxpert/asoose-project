import { EmergencyContact } from "@/types/emergency-contact";
import { request } from "@/lib/authFetch";

export async function fetchEmergencyContacts(): Promise<EmergencyContact[]> {
  const { parsed } = await request("users/emergency-contacts", {
    method: "GET",
  });
  return parsed;
}

export async function saveEmergencyContacts(
  contacts: EmergencyContact[],
): Promise<void> {
  await Promise.all(
    contacts.map(async (contact) => {
      // If contact has a UUID-like ID, update it. Otherwise, create new
      const isExisting = contact.id && contact.id.length > 20; // UUID check

      if (isExisting) {
        await request(`users/emergency-contacts/${contact.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
          }),
        });
      } else {
        // Create new contact
        await request(`users/emergency-contacts`, {
          method: "POST",
          body: JSON.stringify({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
          }),
        });
      }
    }),
  );
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  await request(`users/emergency-contacts/${id}`, { method: "DELETE" });
}
