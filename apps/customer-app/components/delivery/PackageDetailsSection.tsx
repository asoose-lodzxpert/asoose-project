import React from "react";

import { Section } from "@/components/ui/Section";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { Field } from "@/components/ui/Field";
import { useSendPackage } from "@/context/SendPackageContext";
import { ThemedInput } from "../ThemedInput";

export function PackageDetailsSection() {
  const { packageOptions, setPackageOptions } = useSendPackage();

  const update = <K extends keyof typeof packageOptions>(
    key: K,
    value: (typeof packageOptions)[K]
  ) => {
    setPackageOptions({
      ...packageOptions,
      [key]: value,
    });
  };

  return (
    <Section title="Package Details">
      <ToggleRow
        label="Fragile item"
        value={packageOptions.fragile}
        onToggle={() => update("fragile", !packageOptions.fragile)}
      />

      <ToggleRow
        label="Perishable"
        value={packageOptions.perishable}
        onToggle={() => update("perishable", !packageOptions.perishable)}
      />

      <ToggleRow
        label="Contains liquid"
        value={packageOptions.containsLiquid}
        onToggle={() =>
          update("containsLiquid", !packageOptions.containsLiquid)
        }
      />

      <Field label="Declared Value (₦)">
        <ThemedInput
          placeholder="₦10,000"
          keyboardType="numeric"
          value={packageOptions.declaredValue}
          onChangeText={(v) => update("declaredValue", v)}
        />
      </Field>

      <Field label="Weight (kg)">
        <ThemedInput
          placeholder="e.g. 2"
          keyboardType="numeric"
          value={String(packageOptions.weightKg ?? 0)}
          onChangeText={(v) => update("weightKg", Number(v) || 0)}
        />
      </Field>
    </Section>
  );
}
