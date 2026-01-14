import React from "react";
import { CustomDropdown } from "../CustomDropdown";

interface DropdownProps<T extends string> {
  options: readonly T[];
  value?: T;
  placeholder?: string;
  onSelect: (value: T) => void;
  style?: object;
  disabled?: boolean;
  label?: string;
}

/**
 * Wrapper around CustomDropdown to provide a simpler API for string options
 * Converts array of strings to Option[] format required by CustomDropdown
 */
export function Dropdown<T extends string>({
  options,
  value,
  placeholder = "Select an option",
  onSelect,
  style,
  disabled = false,
  label,
}: DropdownProps<T>) {
  // Convert string array to Option[] format
  const data = options.map((option) => ({
    label: option,
    value: option,
  }));

  const handleChange = (selectedValue: string | number) => {
    onSelect(selectedValue as T);
  };

  return (
    <CustomDropdown
      data={data}
      value={value || null}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      label={label}
      containerStyle={style}
    />
  );
}
