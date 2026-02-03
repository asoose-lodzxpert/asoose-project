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
      if (contact.id) {
        await request(`users/emergency-contacts/${contact.id}`, {
          method: "PATCH",
          body: JSON.stringify(contact),
        });
      } else {
        await request("users/emergency-contacts", {
          method: "POST",
          body: JSON.stringify(contact),
        });
      }
    }),
  );
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  await request(`users/emergency-contacts/${id}`, { method: "DELETE" });
}
