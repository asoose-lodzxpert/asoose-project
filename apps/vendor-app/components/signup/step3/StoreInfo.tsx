import React from "react";
import { ThemedInput } from "@/components/ThemedInput";
import { Field } from "./Field";
import { Step3Props } from "./types";

export const StoreInfo: React.FC<Step3Props> = ({ data, onChange }) => (
  <>
    <Field label="Store Display Name" required={true}>
      <ThemedInput
        value={data.storeName}
        placeholder="Enter store display name"
        onChangeText={(v) => onChange("storeName", v)}
      />
    </Field>

    <Field label="Store Description" required={true}>
      <ThemedInput
        multiline
        maxLength={150}
        value={data.storeDescription}
        placeholder="Enter store description"
        onChangeText={(v) => onChange("storeDescription", v)}
      />
    </Field>
  </>
);
