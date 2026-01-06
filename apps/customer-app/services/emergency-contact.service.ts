import { EmergencyContact } from "@/types/emergency-contact";

export function saveEmergencyContacts(
  contacts: EmergencyContact[]
): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 800)); // Simulate save
}

export function fetchEmergencyContacts(): Promise<EmergencyContact[]> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve([
        {
          id: "1",
          name: "",
          phone: "",
          relationship: "",
        },
      ]);
    }, 1200)
  );
}
